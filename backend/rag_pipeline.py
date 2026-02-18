
import os
import requests
import psycopg2
from dotenv import load_dotenv
from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field
from typing import List

# Scraper
from asda_scraper import get_asda_price


# ------------------------------ SUPABASE POSTGRESQL DB CONFIGURATION ------------------------------
load_dotenv()
SUPABASE_URI = os.getenv("DATABASE_URL")

# Test if DATABASE_URI is not found in .env file
if not SUPABASE_URI:
    raise ValueError()

# ------------------------------ SUPABASE POSTGRESQL DB CONFIGURATION ------------------------------


# ------------------------------ MODEL INITIALIZATION ------------------------------
"""
---------- Model(s) Information ----------
EMBEDDINGS MODEL: nomic-embed-text
CHAT MODEL: Llama 3
"""
embeddings = OllamaEmbeddings(model="nomic-embed-text")
llm = ChatOllama(model="llama3", temperature=0)

# ------------------------------ MODEL INITIALIZATION ------------------------------


# ------------------------------ RESPONSE OUTPUT STRUCTURE ------------------------------
class RecipePlan(BaseModel):
    dish_name: str = Field(description="Name of the recipe")
    ingredients: List[str] = Field(description="List of main ingredients (max 5)")
    instructions: str = Field(description="Brief cooking instructions")

parser = PydanticOutputParser(pydantic_object=RecipePlan)

# ------------------------------ RESPONSE OUTPUT STRUCTURE ------------------------------


# ------------------------------ THEMEALDB DATA INGESTION ------------------------------
"""
Temporarily using spaghetti as a test for testing the behaviour of the RAG pipeline overall.

"""
def ingest_spaghetti_data():
    print("Fetching spaghetti data from TheMealDB...")
    # Search for 'spaghetti bolognese' specifically
    url = "https://www.themealdb.com/api/json/v1/1/search.php?s=spaghetti+bolognese"
    data = requests.get(url).json()
    
    # Supabase DB Connection
    conn = psycopg2.connect(SUPABASE_URI)
    cur = conn.cursor()
    # Clear out items Table
    cur.execute("TRUNCATE TABLE items;")

    count = 0
    if data["meals"]:
        for meal in data["meals"]:
            # Format recipe into a single text block
            ingredients = []
            for i in range(1, 10): # Grab first 10 ingredients
                ing = meal.get(f"strIngredient{i}")
                if ing and ing.strip():
                    ingredients.append(ing)
            
            content_block = f"""
            Recipe: {meal['strMeal']}
            Category: {meal['strCategory']}
            Ingredients: {', '.join(ingredients)}
            Instructions: {meal['strInstructions'][:500]}...
            """
            
            # Embed and Save
            vector = embeddings.embed_query(content_block)
            cur.execute("INSERT INTO items (content, embedding) VALUES (%s, %s)", (content_block, vector))
            count += 1
            
    conn.commit()
    cur.close()
    conn.close()
    print(f"Ingested {count} spaghetti recipes into Supabase.")

# ------------------------------ THEMEALDB DATA INGESTION ------------------------------


# ------------------------------ PIPELINE EXECUTION ------------------------------
def run_chat_agent(user_query):
    # TheMealDB Data Ingestion (Spaghetti Bolognese for testing)
    #ingest_spaghetti_data()
    
    # RAG Retrieval
    query_vector = embeddings.embed_query(user_query)
    
    conn = psycopg2.connect(SUPABASE_URI)
    cur = conn.cursor()
    cur.execute("SELECT content FROM items ORDER BY embedding <-> %s::vector LIMIT 1", (query_vector,))
    result = cur.fetchone()
    conn.close()
    
    # If recipe not found
    if not result:
        return {"error": "No recipe found matching your criteria."}

    context_text = result[0]
    
    # Step C: LLM Processing (Extract Ingredients)
    print("\nAnalyzing recipe...")
    prompt = PromptTemplate(
        template="Extract the recipe details from the context.\n{format_instructions}\nContext: {context}",
        input_variables=["context"],
        partial_variables={"format_instructions": parser.get_format_instructions()},
    )
    
    chain = prompt | llm | parser
    recipe_obj = chain.invoke({"context": context_text})
    
    # Data Scraping
    print("CHECKING LIVE STOCK AT ASDA...")
    scraped_ingredients = []
    
    for ingredient in recipe_obj.ingredients:
        # ASDA scraper
        asda_data = get_asda_price(ingredient)
        
        # Add to list
        scraped_ingredients.append({
            "name": ingredient,
            "supermarket_data": asda_data # Returns dict or None
        })

    # 4. RETURN DATA (Crucial for FastAPI)
    return {
        "dish_name": recipe_obj.dish_name,
        "instructions": recipe_obj.instructions,
        "ingredients": scraped_ingredients
    }

# ------------------------------ PIPELINE EXECUTION ------------------------------

if __name__ == "__main__":
    # Test locally
    print(run_chat_agent("How do I make spaghetti?"))