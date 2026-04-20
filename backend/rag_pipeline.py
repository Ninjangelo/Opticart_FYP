import os
from dotenv import load_dotenv
from supabase.client import Client, create_client
from langchain_community.vectorstores import SupabaseVectorStore
from langchain_ollama import OllamaEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field
from typing import List, Optional
import time

from concurrent.futures import ThreadPoolExecutor

# Scraper
from asda_scraper import get_asda_price


# ------------------------------ SUPABASE POSTGRESQL DB CONFIGURATION ------------------------------
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file.")

supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ------------------------------ SUPABASE POSTGRESQL DB CONFIGURATION ------------------------------


# ------------------------------ MODEL INITIALIZATION ------------------------------
"""
---------- Model(s) Information ----------
EMBEDDINGS MODEL: nomic-embed-text
CHAT MODEL: gemini-2.5-flash
TEMPORARY MODEL (20/04/2025 - 00:55): gemini-2.5-flash 
"""

embeddings = OllamaEmbeddings(model="nomic-embed-text")

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash-lite",
    temperature=0
)

# ------------------------------ MODEL INITIALIZATION ------------------------------

# ------------------------------ VECTOR STORE INITIALIZATION ------------------------------

vector_store = SupabaseVectorStore(
    client=supabase_client,
    embedding=embeddings,
    table_name="recipes",
    query_name="match_recipes",
)

# ------------------------------ VECTOR STORE INITIALIZATION ------------------------------


# ------------------------------ QUERY ANALYZER ------------------------------
class QueryAnalysis(BaseModel):
    optimized_search_query: str = Field(
        description="The core food description to search for, ignoring rules. (e.g., if user says 'chicken meal without cheese under 500 calories', just output 'chicken meal')"
    )
    max_calories: Optional[int] = Field(
        default=None, 
        description="Maximum calories allowed, if explicitly specified by user."
    )
    is_vegetarian: Optional[bool] = Field(
        default=None, 
        description="True if user explicitly wants vegetarian. False if they explicitly want meat. Null otherwise."
    )
    is_vegan: Optional[bool] = Field(
        default=None, 
        description="True if user explicitly wants vegan. Null otherwise."
    )
    is_gluten_free: Optional[bool] = Field(
        default=None, 
        description="True if user explicitly wants gluten-free. Null otherwise."
    )
    is_dairy_free: Optional[bool] = Field(
        default=None, 
        description="True if user explicitly wants dairy-free. Null otherwise."
    )
    exclude_ingredients: List[str] = Field(
        default_factory=list, 
        description="List of specific ingredients to completely ban (e.g., ['cheese', 'dairy', 'milk']). Leave empty if none."
    )

query_parser = PydanticOutputParser(pydantic_object=QueryAnalysis)

# ------------------------------ QUERY ANALYZER ------------------------------


# ------------------------------ INGREDIENT SANITISER ------------------------------
class IngredientSanitizer(BaseModel):
    clean_ingredients: List[str] = Field(
        description="A strictly cleaned list of canonical grocery items. MUST BE THE EXACT SAME LENGTH AS THE INPUT LIST. Do not split items like 'salt and pepper' into two items. Keep ONLY the core food item."
    )

sanitizer_parser = PydanticOutputParser(pydantic_object=IngredientSanitizer)

def sanitize_ingredients(raw_ingredients: List[str]) -> List[str]:
    """
    Passes the raw recipe ingredients through Gemini to extract acceptable search terms.
    """
    print(f"\n--- SANITIZING {len(raw_ingredients)} INGREDIENTS WITH GEMINI ---")
    
    sanitizer_prompt = PromptTemplate(
        template="""Clean the following recipe ingredients so they can be accurately searched in a UK supermarket e-commerce database.
        
CRITICAL RULES:
1. You MUST return a list with exactly {input_length} items. Do not drop or add items.
2. If an ingredient contains "or" (e.g., "cream or whole milk"), pick ONLY ONE primary item (e.g., "whole milk").
3. For compound items like "salt and pepper", simplify it to just one primary item like "black pepper" to avoid confusing the search engine.
4. Simplify specific colored vegetables to their base name if they are commonly grouped (e.g., "orange pepper" -> "peppers").
5. Keep ONLY the core grocery item name.

{format_instructions}
Raw Ingredients: {ingredients}""",
        input_variables=["ingredients", "input_length"],
        partial_variables={"format_instructions": sanitizer_parser.get_format_instructions()}
    )
    
    sanitizer_chain = sanitizer_prompt | llm | sanitizer_parser
    
    try:
        # Pass the required length to the prompt
        analysis = sanitizer_chain.invoke({
            "ingredients": raw_ingredients,
            "input_length": len(raw_ingredients)
        })
        
        # If the AI disobeys and returns the wrong amount of items then it uses the raw ingredient format
        if len(analysis.clean_ingredients) != len(raw_ingredients):
            print(f"Warning: AI returned {len(analysis.clean_ingredients)} items. Expected {len(raw_ingredients)}. Reverting to raw ingredients.")
            return raw_ingredients
            
        print(f"Cleaned List: {analysis.clean_ingredients}")
        return analysis.clean_ingredients
        
    except Exception as e:
        print(f"Sanitization failed: {e}")
        return raw_ingredients
# ------------------------------ INGREDIENT SANITIZER (NLP) ------------------------------


# ------------------------------ PIPELINE EXECUTION (TWO-STEP ARCHITECTURE) ------------------------------
def get_recommendations(user_query, limit=8):
    """
    ----- RECOMMENDATION -----
    Uses Query Analyzer to extract strcit filtering before searching database
    """
    print(f"\n[1/3] Analyzing User Intent: '{user_query}'")
    
    # Instruct Gemini to extract filters from the user's sentence
    analyzer_prompt = PromptTemplate(
        template="Analyze the user's meal request and extract the search filters.\n{format_instructions}\nUser Request: {query}",
        input_variables=["query"],
        partial_variables={"format_instructions": query_parser.get_format_instructions()},
    )
    analyzer_chain = analyzer_prompt | llm | query_parser
    
    try:
        analysis = analyzer_chain.invoke({"query": user_query})
        print(f"[2/3] Extracted Filters: {analysis.model_dump()}")
    except Exception as e:
        print(f"Query Analyzer failed: {e}")
        return {"error": "Failed to understand search criteria."}

    # Vectorizes the optimized core food phrase
    query_vector = embeddings.embed_query(analysis.optimized_search_query)
    
    # Query PostgreSQL with the strict filters applied
    print("[3/3] Querying Supabase Database with strict filters...")
    try:
        response = supabase_client.rpc(
            "match_recipes", 
            {
                "query_embedding": query_vector,
                "match_threshold": 0.25, 
                "match_count": limit,
                "req_vegetarian": analysis.is_vegetarian,
                "req_vegan": analysis.is_vegan,
                "req_gluten_free": analysis.is_gluten_free,
                "req_dairy_free": analysis.is_dairy_free,
                "max_calories": analysis.max_calories,
                "excluded_words": analysis.exclude_ingredients if analysis.exclude_ingredients else None
            }
        ).execute()
        
        recipes = response.data
        
        if not recipes:
            return {"error": "No recipes found matching your strict dietary criteria."}
            
        print(f"Match found! Returning {len(recipes)} safe recipes for the UI Grid.")
        
        formatted_recipes = []
        for r in recipes:
            formatted_recipes.append({
                "id": r.get("id"),
                "dish_name": r.get("dish_name"),
                "image_url": r.get("image_url"),
                "summary": r.get("summary"),
                "ready_in_minutes": r.get("ready_in_minutes"),
                "calories": r.get("calories"),
                "protein_g": r.get("protein_g"),
                "fat_g": r.get("fat_g"),
                "carbs_g": r.get("carbs_g"),
                "servings": r.get("servings"),
                "is_vegetarian": r.get("is_vegetarian"),
                "is_vegan": r.get("is_vegan"),
                "is_gluten_free": r.get("is_gluten_free"),
                "is_dairy_free": r.get("is_dairy_free"),
                "cuisines": r.get("cuisines"),
                "dish_types": r.get("dish_types"),
                "diets": r.get("diets"),
                "ingredients": r.get("ingredients"),
                "instructions": r.get("instructions")
            })

        print("[4/4] Generating conversational explanation...")
        
        # Create a tiny summary of the found meals to save LLM tokens
        recipe_context = "\n".join([
            f"- {r['dish_name']} ({r['calories']} kcal, Protein: {r['protein_g']}g, Vegan: {r['is_vegan']})" 
            for r in formatted_recipes
        ])
        
        chat_prompt = PromptTemplate(
            template="""You are Opticart, a highly empathetic and knowledgeable culinary AI assistant.
            The user asked: "{user_query}"
            
            Based on their request, my database retrieved these specific meals:
            {recipe_context}
            
            Write a warm, human-like response (1-2 short paragraphs). 
            Acknowledge the user's specific context (e.g., their fitness goals, ailment, or craving). 
            Explain broadly WHY these selected meals are a great fit for their specific needs based on their nutritional or dietary profiles. 
            
            CRITICAL: Do NOT list the recipes out individually with bullet points (the UI will display them as cards below your text). Just speak to the user naturally like a friendly nutritionist handing them a curated menu.
            """,
            input_variables=["user_query", "recipe_context"]
        )
        
        chat_chain = chat_prompt | llm
        
        try:
            # Generate the conversational text
            ai_response = chat_chain.invoke({
                "user_query": user_query,
                "recipe_context": recipe_context
            })
            conversational_text = ai_response.content
        except Exception as e:
            print(f"Chat generation failed: {e}")
            conversational_text = "Here are some great options I found for you based on your request:"

        # Return BOTH the conversational text AND the raw grid data!
        return {
            "type": "recipe_grid", 
            "text": conversational_text, 
            "recipes": formatted_recipes
        }
            
        return {
            "type": "recipe_grid",
            "text": conversational_text,
            "recipes": formatted_recipes
        }

    except Exception as e:
        print(f"Database Error: {e}")
        return {"error": "Failed to connect to the recommendation engine."}


def get_price_comparison(ingredients_list):
    """
    ----- PRICE WEB SCRAPING -----
    Playwright web scraping scripts are triggered when a specific meal is selected
    """
    print(f"CHECKING LIVE STOCK AT ASDA FOR {len(ingredients_list)} ITEMS IN PARALLEL...")
    scraped_ingredients = []
    
    # 5 parallel threads opened (all performing at the same time)
    with ThreadPoolExecutor(max_workers=5) as executor:
        parallel_results = list(executor.map(get_asda_price, ingredients_list))
        
    for i, ingredient in enumerate(ingredients_list):
        if isinstance(parallel_results[i], Exception):
            print(f"Scraper thread crashed for {ingredient}: {parallel_results[i]}")
            scraped_ingredients.append({"name": ingredient, "supermarket_data": None})
        else:
            scraped_ingredients.append({
                "name": ingredient,
                "supermarket_data": parallel_results[i] 
            })

    return {"type": "price_comparison", "scraped_data": scraped_ingredients}

# ------------------------------ PIPELINE EXECUTION ------------------------------

if __name__ == "__main__":
    print("\n--- TEST: QUERY ANALYZER ---")
    start_time = time.time()
    
    # Notice the complex rule!
    grid_data = get_recommendations("I want a hearty meal under 400 calories with no tomatoes.")
    
    if "recipes" in grid_data:
        print("\nSuccessfully retrieved Safe Grid Data:")
        for r in grid_data["recipes"]:
            print(f" - {r['dish_name']} | {r['calories']} kcal")
            
    print(f"\nGrid Fetch Execution Time: {time.time() - start_time:.2f} seconds")