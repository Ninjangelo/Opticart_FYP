from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Optional, Dict, Any, List

# ----- RAG PIPELINE -----
from rag_pipeline import get_recommendations, sanitize_ingredients

# ----- LIVE-TIME PRICE SCRAPING -----
from price_service import compare_all_supermarkets

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
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# DATA MODELS - Defines JSON payloads that React is allowed to send to
class UserQuery(BaseModel):
    query: str

class ScrapeRequest(BaseModel):
    # React sends a list of ingredients as part of scraping the prices for each one
    ingredients: List[str]

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

    # Running RAG Pipeline 
    try:
        loop = asyncio.get_event_loop()

        # Calling get_recommendations() function
        response_data = await loop.run_in_executor(
            executor, 
            get_recommendations, 
            request.query
        )
        
        # Check for errors in the middle of pipeline execution
        if "error" in response_data:
             raise HTTPException(status_code=404, detail=response_data["error"])

        return response_data
    
    # Error raise to application if any processes crash
    except Exception as e:
        print(f"Error processing request: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
# ----- WEB SCRAPING ENDPOINT -----
@app.post("/scrape")
async def scrape_endpoint(request: ScrapeRequest):
    print(f"\n--- SCRAPE REQUEST RECEIVED ---")
    print(f"Ingredients to scrape: {request.ingredients}")

    try:
        loop = asyncio.get_event_loop()
        
        """
        Call process_all_ingredients() to return a JSON containing the scraped prices
        for each ingredient from 4 supermarket retailer websites
        """
        response_data = await loop.run_in_executor(
            executor, 
            process_all_ingredients, 
            request.ingredients
        )
        
        if "error" in response_data:
             raise HTTPException(status_code=500, detail=response_data["error"])

        return response_data
    
    except Exception as e:
        print(f"Error during scraping: {e}")
        raise HTTPException(status_code=500, detail=str(e))