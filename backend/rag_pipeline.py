import os
from dotenv import load_dotenv
from supabase.client import Client, create_client
from langchain_community.vectorstores import SupabaseVectorStore
from langchain_ollama import OllamaEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field
from typing import List
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
"""

embeddings = OllamaEmbeddings(model="nomic-embed-text")

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
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


# ------------------------------ RESPONSE OUTPUT STRUCTURE ------------------------------
class RecipePlan(BaseModel):
    dish_name: str = Field(description="Name of the recipe")
    ingredients: List[str] = Field(
        description="List of ONLY the core ingredient names, highly simplified for a supermarket search bar. (e.g., output 'chicken breast' instead of '2 cups cooked chicken, shredded'). NEVER include numbers, measurements, or preparation instructions. Max 5 core ingredients."
    )
    instructions: str = Field(description="Brief cooking instructions")

parser = PydanticOutputParser(pydantic_object=RecipePlan)

# ------------------------------ RESPONSE OUTPUT STRUCTURE ------------------------------


# ------------------------------ PIPELINE EXECUTION (TWO-STEP ARCHITECTURE) ------------------------------
def get_recommendations(user_query, limit=6):
    """
    ----- RECOMMENDATION -----
    Searches for the top matching recipes and returns the visual data to displayed on the React UI grid.
    """
    print(f"\nSearching database for: {user_query}")
    
    # Converts query into vector
    query_vector = embeddings.embed_query(user_query)
    
    # Call PostgreSQL match_recipes function directly
    # Bypasses Langchain's similaritySearch function
    try:
        response = supabase_client.rpc(
            "match_recipes", 
            {
                "query_embedding": query_vector,
                # How strict the math matching is
                "match_threshold": 0.3,
                # Get 6 recipes for the 2x3 grid
                "match_count": limit
            }
        ).execute()
        
        recipes = response.data
        
        if not recipes:
            return {"error": "No recipes found matching your criteria."}
            
        print(f"Match found! Returning {len(recipes)} recipes for the UI Grid.")
        
        # Formatted data for React UI
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
                "is_vegetarian": r.get("is_vegetarian"),
                # Ingredients significantly used for Price Comparison process
                "ingredients": r.get("ingredients"),
                "instructions": r.get("instructions")
            })
            
        return {"type": "recipe_grid", "recipes": formatted_recipes}

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
    print("\n--- TEST 1: THE GRID RECOMMENDATION ---")
    start_time = time.time()
    
    # testing if 6 meals have been obtained
    grid_data = get_recommendations("I want a hearty meal high in protein")
    
    end_time = time.time()
    
    # displays meal names
    if "recipes" in grid_data:
        print("\nSuccessfully retrieved Grid Data:")
        for r in grid_data["recipes"]:
            print(f" - {r['dish_name']} ({r['ready_in_minutes']} mins) | {r['calories']} kcal")
    else:
        print(grid_data)
        
    print(f"\nGrid Fetch Execution Time: {end_time - start_time:.2f} seconds")