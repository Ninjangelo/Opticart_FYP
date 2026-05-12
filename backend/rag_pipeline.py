print("-> Importing os & dotenv")
import os
from dotenv import load_dotenv

print("-> Importing supabase")
from supabase.client import Client, create_client

print("-> Importing langchain vectorstores")
from langchain_community.vectorstores import SupabaseVectorStore

print("-> Importing langchain nomic")
from langchain_nomic.embeddings import NomicEmbeddings

print("-> Importing langchain google")
from langchain_google_genai import ChatGoogleGenerativeAI

print("-> Importing langchain core")
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser

print("-> Importing pydantic")
from pydantic import BaseModel, Field
from typing import List, Optional
import time
from concurrent.futures import ThreadPoolExecutor


# ------------------------------ SUPABASE POSTGRESQL DB CONFIGURATION ------------------------------
print("--- RAG 1: Loading Environment Variables ---")
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file.")

print("--- RAG 2: Connecting to Supabase ---")
supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ------------------------------ SUPABASE POSTGRESQL DB CONFIGURATION ------------------------------


# ------------------------------ MODEL INITIALIZATION ------------------------------
"""
---------- Model(s) Information ----------
EMBEDDINGS MODEL: nomic-embed-text
CHAT MODEL: gemini-2.5-flash
TEMPORARY MODEL (20/04/2025 - 00:55): gemini-2.5-flash 
"""
print("--- RAG 3: Initializing Cloud Embeddings ---")
NOMIC_API_KEY = os.getenv("NOMIC_API_KEY")

if not NOMIC_API_KEY:
    raise ValueError("Missing NOMIC_API_KEY in .env file.")

embeddings = NomicEmbeddings(
    model="nomic-embed-text-v1.5", 
    nomic_api_key=NOMIC_API_KEY
)

print("--- RAG 4: Loading Google Gemini ---")
llm = ChatGoogleGenerativeAI(
    #model="gemini-2.5-flash-lite", 
    model="gemini-2.5-flash",
    temperature=0
)

#llm = ChatOllama(
    #model="llama3.2", 
    #temperature=0
#)

# ------------------------------ MODEL INITIALIZATION ------------------------------

# ------------------------------ VECTOR STORE INITIALIZATION ------------------------------

print("--- RAG 5: Loading Vector Store ---")
vector_store = SupabaseVectorStore(
    client=supabase_client,
    embedding=embeddings,
    table_name="recipes",
    query_name="match_recipes",
)
print("--- RAG 6: Pipeline Ready! ---")

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

# ------------------------------ INTENT ROUTER ------------------------------
class IntentClassification(BaseModel):
    intent: str = Field(
        description="Classify the user's intent. Must be exactly one of: 'NEW_SEARCH', 'FOLLOW_UP', 'SMALL_TALK', or 'OUT_OF_DOMAIN'"
    )

intent_parser = PydanticOutputParser(pydantic_object=IntentClassification)
# ------------------------------ INTENT ROUTER ------------------------------

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


# ------------------------------ PIPELINE EXECUTION ------------------------------
def get_recommendations(user_query, history=None, limit=8):
    """
    ----- THE INTENT ROUTER & RECOMMENDATION ENGINE -----
    Reads memory, decides the route, and either searches the DB or chats naturally.
    """
    if history is None:
        history = []
        
    print(f"\n[1/4] Formatting Memory. {len(history)} past messages found.")
    
    # 1. Format the history array into a readable chat log for the AI
    formatted_history = ""
    for msg in history:
        # msg is a Pydantic object from main.py, so we use dot notation (.role, .content)
        role_name = "User" if msg.role == "user" else "Opticart"
        formatted_history += f"{role_name}: {msg.content}\n\n"

    # 2. Run the Intent Router
    print(f"[2/4] Routing Intent for: '{user_query}'")
    router_prompt = PromptTemplate(
        template="""Analyze the user's latest message given the conversation history.
        
        HISTORY:
        {history}
        
        LATEST USER MESSAGE: {query}
        
        CLASSIFICATION RULES:
        - "NEW_SEARCH": The user wants to find new meals, lists ingredients they have in their fridge, or changes dietary criteria.
        - "FOLLOW_UP": The user is asking a question about the specific meals ALREADY shown in the history.
        - "SMALL_TALK": The user is just saying hello, thank you, or making a casual remark.
        - "OUT_OF_DOMAIN": The user is asking about topics completely unrelated to food, groceries, meal planning, or nutrition (e.g., coding, cars, politics, history).
        
        {format_instructions}""",
        input_variables=["query", "history"],
        partial_variables={"format_instructions": intent_parser.get_format_instructions()}
    )
    
    try:
        router_chain = router_prompt | llm | intent_parser
        intent_result = router_chain.invoke({"query": user_query, "history": formatted_history})
        current_intent = intent_result.intent
        print(f"--> DECISION: {current_intent}")
    except Exception as e:
        error_msg = str(e)
        # Catch Google Rate Limits specifically!
        if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
            print("--> Rate limit hit at Router. Stopping execution.")
            return {"error": "I am receiving too many requests right now! Please give me about 60 seconds to catch my breath before asking again."}
            
        print(f"Router failed, defaulting to NEW_SEARCH. Error: {e}")
        current_intent = "NEW_SEARCH"


    # ==========================================
    # ROUTE A: GUARDRAIL / OUT OF DOMAIN
    # ==========================================
    if current_intent == "OUT_OF_DOMAIN":
        print("[3/4] Out of Domain detected. Redirecting user...")
        return {
            "type": "text", 
            "text": "I am Opticart, an AI exclusively dedicated to culinary assistance, meal planning, and supermarket pricing! Please ask me a question related to recipes, groceries, or diets, and I'd be happy to help."
        }
    # ==========================================
    # ROUTE A: FOLLOW UP OR SMALL TALK (Bypass Database)
    # ==========================================
    if current_intent in ["FOLLOW_UP", "SMALL_TALK"]:
        print("[3/4] Bypassing Database. Generating conversational response...")
        
        # Add a tiny 1-second pause so Google's Free Tier doesn't block the "double-tap" request!
        time.sleep(1) 
        
        chat_prompt = PromptTemplate(
            template="""You are Opticart, a friendly and highly knowledgeable culinary AI assistant.
            Here is your conversation history with the user (which includes hidden SYSTEM CONTEXT about what recipe cards they are currently looking at):
            
            {history}
            
            The user just said: "{query}"
            
            Respond naturally and directly to their latest message. 
            - If they ask about the meals on their screen, use the SYSTEM CONTEXT to give them accurate nutritional info, cooking advice, or benefits.
            - If they just say hi/thanks, be polite and friendly.
            - CRITICAL: DO NOT use markdown bolding like asterisks (**). Output clean plain text or standard dashes (-) for bullet points.
            """,
            input_variables=["query", "history"]
        )
        try:
            chat_chain = chat_prompt | llm
            ai_response = chat_chain.invoke({"query": user_query, "history": formatted_history})
            # Return a simple text dictionary!
            return {"type": "text", "text": ai_response.content}
        except Exception as e:
            # Print the REAL error to the terminal so we can debug it!
            print(f"--> LLM Chat Generation Failed: {e}")
            return {"error": "I had a little trouble generating a response. Could you ask that one more time?"}

    # ==========================================
    # ROUTE B: NEW SEARCH (Execute existing RAG Database Logic)
    # ==========================================
    print("[3/4] Extracting Filters for Database Search...")
    
    analyzer_prompt = PromptTemplate(
        template="""Analyze the user's meal request and extract the search filters.
        CRITICAL RULES: 
        1. RANDOM REQUESTS: If user says "surprise me", set 'optimized_search_query' to a broad term like "delicious hearty dinner".
        2. PANTRY MATCHING: If user lists ingredients (e.g., "I have chicken and rice"), set 'optimized_search_query' to those exact ingredients!
        {format_instructions}
        User Request: {query}""",
        input_variables=["query"],
        partial_variables={"format_instructions": query_parser.get_format_instructions()},
    )
    
    try:
        analyzer_chain = analyzer_prompt | llm | query_parser
        analysis = analyzer_chain.invoke({"query": user_query})
        print(f"--> Extracted Filters: {analysis.model_dump()}")
    except Exception as e:
        print(f"Query Analyzer failed: {e}")
        return {"error": "Failed to understand search criteria."}

    query_vector = embeddings.embed_query(analysis.optimized_search_query)
    
    print("[4/4] Querying Supabase Database...")
    try:
        response = supabase_client.rpc(
            "match_recipes", 
            {
                "query_embedding": query_vector,
                "match_threshold": 0.45, 
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
            
        print(f"Match found! Returning {len(recipes)} recipes.")
        
        # Format recipes
        formatted_recipes = []
        for r in recipes:
            formatted_recipes.append({
                "id": r.get("id"), "dish_name": r.get("dish_name"), "image_url": r.get("image_url"),
                "summary": r.get("summary"), "ready_in_minutes": r.get("ready_in_minutes"),
                "calories": r.get("calories"), "protein_g": r.get("protein_g"), "fat_g": r.get("fat_g"),
                "carbs_g": r.get("carbs_g"), "servings": r.get("servings"),
                "is_vegetarian": r.get("is_vegetarian"), "is_vegan": r.get("is_vegan"),
                "is_gluten_free": r.get("is_gluten_free"), "is_dairy_free": r.get("is_dairy_free"),
                "cuisines": r.get("cuisines"), "dish_types": r.get("dish_types"),
                "diets": r.get("diets"), "ingredients": r.get("ingredients"), "instructions": r.get("instructions")
            })

        # Final Greeting Context
        recipe_context = "\n".join([f"- {r['dish_name']} ({r['calories']} kcal, Protein: {r['protein_g']}g)" for r in formatted_recipes])
        
        chat_prompt = PromptTemplate(
            template="""You are Opticart. The user asked: "{user_query}"
            I retrieved these meals: {recipe_context}
            Write a brief 1-sentence intro acknowledging their request, then a short bulleted list mentioning how these specific meals fit their criteria. Do NOT use markdown asterisks (**).
            """,
            input_variables=["user_query", "recipe_context"]
        )
        
        try:
            chat_chain = chat_prompt | llm
            ai_response = chat_chain.invoke({"user_query": user_query, "recipe_context": recipe_context})
            conversational_text = ai_response.content
        except Exception:
            conversational_text = "Here are some great options I found for you based on your request:"

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


def get_similar_recommendations(saved_dish_names: list, saved_recipe_ids: list, limit: int = 8):
    """
    Takes a list of saved dish names to form a taste profile query,
    and returns recommended recipes excluding the already saved ones.
    """
    if not saved_dish_names:
        return []

    # Combine all their saved meals into one giant "Taste Profile" string
    taste_profile_query = " ".join(saved_dish_names)
    print(f"--- Generating recommendations for profile: {taste_profile_query[:50]}... ---")
    
    fetch_count = limit + len(saved_recipe_ids)
    
    try:
        # 1. Turn the taste profile text into a math vector directly using Ollama
        query_vector = embeddings.embed_query(taste_profile_query)
        
        # 2. Query Supabase directly (Bypassing the LangChain bug!)
        response = supabase_client.rpc(
            "match_recipes", 
            {
                "query_embedding": query_vector,
                "match_threshold": 0.50, # A generous threshold for broad recommendations
                "match_count": fetch_count,
                # Pass None to ignore strict dietary filters for general recommendations
                "req_vegetarian": None,
                "req_vegan": None,
                "req_gluten_free": None,
                "req_dairy_free": None,
                "max_calories": None,
                "excluded_words": None
            }
        ).execute()
        
        results = response.data
        
        recommendations = []
        for r in results:
            recipe_id = r.get('id')
            
            # Check if the user has ALREADY saved this meal. If not, add it!
            if recipe_id not in saved_recipe_ids:
                recipe = {
                    "id": recipe_id,
                    "dish_name": r.get('dish_name', 'Unknown'),
                    "summary": r.get('summary', ''),
                    "image_url": r.get('image_url', ''),
                    "ready_in_minutes": r.get('ready_in_minutes', 0),
                    "calories": r.get('calories', 0),
                    "servings": r.get('servings', 1),
                    "ingredients": r.get('ingredients', '[]'),
                    "instructions": r.get('instructions', ''),
                    "protein_g": r.get('protein_g', 0),
                    "fat_g": r.get('fat_g', 0),
                    "carbs_g": r.get('carbs_g', 0),
                    "is_vegetarian": r.get('is_vegetarian', False),
                    "is_vegan": r.get('is_vegan', False),
                    "is_gluten_free": r.get('is_gluten_free', False),
                    "is_dairy_free": r.get('is_dairy_free', False),
                    "cuisines": r.get('cuisines', []),
                    "dish_types": r.get('dish_types', []),
                    "diets": r.get('diets', [])
                }
                recommendations.append(recipe)
            
            # Stop looping once we have exactly the amount we need (8)
            if len(recommendations) == limit:
                break
                
        return recommendations
        
    except Exception as e:
        print(f"Similarity search failed: {e}")
        return []

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