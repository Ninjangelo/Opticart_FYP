print("--- 1. Booting up main.py ---")
import time
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Optional, Dict, Any, List

print("--- 2. Loading RAG Pipeline ---")
# ----- RAG PIPELINE -----
from rag_pipeline import get_recommendations, sanitize_ingredients, get_similar_recommendations

print("--- 3. Loading Price Service ---")
# ----- LIVE-TIME PRICE SCRAPING -----
from price_service import compare_all_supermarkets

print("--- 4. Finished loading! Starting API ---")
# API Instance
app = FastAPI()

# THREAD MANAGEMENT
executor = ThreadPoolExecutor()

# CORS CONFIGURATION
origins = [
    # Vite
    "http://localhost:5173",
    # Backup Port
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# DATA MODELS - Defines JSON payloads that React is allowed to send to
class ChatMessage(BaseModel):
    role: str
    content: str

class UserQuery(BaseModel):
    query: str
    # We use a default empty list [] so if an older prompt is sent without history, it won't crash!
    history: List[ChatMessage] = [] 

class ScrapeRequest(BaseModel):
    # React sends a list of ingredients as part of scraping the prices for each one
    ingredients: List[str]

class RecommendationRequest(BaseModel):
    saved_dish_names: list
    saved_recipe_ids: list
    limit: int = 8

# ----- MULTIPLE INGREDIENT HELPER FUNCTION -----
"""
Helper function to loop through the list of ingredients for a meal
and scrape a live-time supermarket price in regards to the ingredient
"""
def process_all_ingredients(ingredients: List[str]):
    final_results = {}

    cleaned_list = sanitize_ingredients(ingredients)
    
    for i in range(len(ingredients)):
        original_item = ingredients[i]
        
        # Incase the of AI sanitisation leaves out an item
        clean_item = cleaned_list[i] if i < len(cleaned_list) else original_item
        
        print(f"Mapped UI '{original_item}' -> Scraping keyword '{clean_item}'")
        
        """
        Web scrapers use the santised text and save under the original key
        for React to use within the JSON response
        """
        final_results[original_item] = compare_all_supermarkets(clean_item)
        
    return {"comparison_data": final_results}

# ----- API ROUTES -----
# Health Check
@app.get("/")
def read_root():
    return {"status": "Opticart Backend Online"}

# RECOMMENDATION GRID ENDPOINT
@app.post("/chat")
async def chat_endpoint(request: UserQuery):
    print(f"--- RECOMMENDATION REQUEST RECEIVED ---")
    print(f"Query: {request.query}")
    print(f"Memory length received: {len(request.history)} past messages")

    # Running RAG Pipeline 
    try:
        loop = asyncio.get_event_loop()

        # Notice we are passing BOTH the query and the history to the pipeline now!
        response_data = await loop.run_in_executor(
            executor, 
            get_recommendations, 
            request.query,
            request.history 
        )
        
        # Check for errors in the middle of pipeline execution
        # (e.g., The database was empty, or the user asked a random question)
        if "error" in response_data:
            return response_data
        
        # --- TEMPORARY TESTING TELEMETRY ---
        print("\n" + "="*60)
        print(f"🧪 TEST PROMPT: {request.query}")
        print("-" * 60)
        
        # Safely grab the text, whether you named it 'message', 'text', or 'response'
        text_response = response_data.get('message', response_data.get('text', response_data.get('response', 'No text key found')))
        print(f"💬 NATURAL LANGUAGE RESPONSE:\n{text_response}")
        print("-" * 60)
        
        # Check for the PLURAL 'recipes' list
        recipes_list = response_data.get('recipes', [])
        has_recipes = "YES" if len(recipes_list) > 0 else "NO"
        
        print(f"📦 RECIPES RETURNED? : {has_recipes} (Found: {len(recipes_list)})")
        
        if recipes_list:
             # Print the name of the very first recipe to prove it worked
             first_recipe = recipes_list[0]
             print(f"🍽️ FIRST MEAL NAME: {first_recipe.get('dish_name', 'Unknown')}")
             
        print("="*60 + "\n")
        # -----------------------------------

        return response_data
    
    # Catch unexpected backend crashes (e.g. LLM failure, weird prompts)
    except Exception as e:
        print(f"Error processing request: {e}")
        # Instead of a 500 Internal Server Error, return a polite fallback
        return {
            "error": "Oops! I'm Opticart, an AI assistant dedicated to food and meal planning. Please ask me a question related to recipes, groceries, or diets!"
        }
    
# ----- WEB SCRAPING ENDPOINT -----
@app.post("/scrape")
async def scrape_endpoint(request: ScrapeRequest):
    print(f"\n--- SCRAPE REQUEST RECEIVED ---")
    print(f"Ingredients to scrape: {request.ingredients}")

    try:
        loop = asyncio.get_event_loop()
        
        # Start the latency timer
        start_time = time.time()
        
        response_data = await loop.run_in_executor(
            executor, 
            process_all_ingredients, 
            request.ingredients
        )
        
        # Stop the latency timer
        end_time = time.time()
        latency = round(end_time - start_time, 2)
        
        if "error" in response_data:
             raise HTTPException(status_code=500, detail=response_data["error"])

        # --- TEMPORARY SCRAPER TELEMETRY ---
        print("\n" + "="*70)
        print(f"🕸️  TEST: WEB SCRAPER & CONCURRENT LATENCY PROFILING")
        print("-" * 70)
        print(f"🛒 INGREDIENTS REQUESTED: {request.ingredients}")
        print(f"⏱️  EXECUTION LATENCY: {latency} seconds")
        print("-" * 70)
        print(f"📊 SCRAPED DATA PREVIEW (First 500 chars):")
        # Pretty-print the JSON so it is easy to read, but truncate it so it doesn't flood the terminal
        formatted_json = json.dumps(response_data, indent=2)
        print(formatted_json[:500] + "\n... [Data Truncated]")
        print("="*70 + "\n")
        # -----------------------------------

        return response_data
    
    except Exception as e:
        print(f"Error during scraping: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/recommendations")
async def generate_recommendations(request: RecommendationRequest):
    try:
        recs = get_similar_recommendations(
            request.saved_dish_names, 
            request.saved_recipe_ids, 
            request.limit
        )
        return {"recommendations": recs}
    except Exception as e:
        print(f"Error generating recommendations: {e}")
        return {"error": str(e)}