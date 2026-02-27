import os
import sys
import json
import requests
import psycopg2
from pathlib import Path
from dotenv import load_dotenv

# Path Fix
parent_dir = str(Path(__file__).resolve().parent.parent)
sys.path.append(parent_dir)

# Imports for DB connection and Embedding Model
from rag_pipeline import SUPABASE_URI, embeddings

# Load Spoonacular API key environment variable 
load_dotenv()
SPOONACULAR_API_KEY = os.getenv("SPOONACULAR_API_KEY")

def ingest_spoonacular_data():
    print("Fetching rich recipe data from Spoonacular...")
    
    # The Complex Search Endpoint with all the flags we need
    url = f"https://api.spoonacular.com/recipes/complexSearch"
    params = {
        "apiKey": SPOONACULAR_API_KEY,
        "addRecipeInformation": "true",
        "addRecipeNutrition": "true",
        "instructionsRequired": "true", # Forces recipes to have instructions
        "fillIngredients": "true",      # Forces to return ingredients of recipe
        "number": 5 # FIVE at the moment for development testing purposes
    }
    
    response = requests.get(url, params=params)
    if response.status_code != 200:
        print(f"API Error: {response.status_code} - {response.text}")
        return
        
    data = response.json()
    
    # DB Connection
    conn = psycopg2.connect(SUPABASE_URI)
    cur = conn.cursor()
    
    # Clearing Table Content
    cur.execute("TRUNCATE TABLE recipes;")
    
    count = 0
    for recipe in data.get("results", []):
        # EXTRACTING CORE DATA
        dish_name = recipe.get("title", "Unknown Recipe")
        
        # Format instructions into a single string
        instruction_steps = []
        for doc in recipe.get("analyzedInstructions", []):
            for step in doc.get("steps", []):
                instruction_steps.append(f"{step['number']}. {step['step']}")
        instructions = "\n".join(instruction_steps)
        
        # Format ingredients into a list, then convert to JSON
        # Check extendedIngredients first before falling back to used/missed lists
        raw_ingredients = recipe.get("extendedIngredients", [])
        if not raw_ingredients:
            raw_ingredients = recipe.get("usedIngredients", []) + recipe.get("missedIngredients", [])
            
        ingredients_list = [ing.get("original", "") for ing in raw_ingredients if "original" in ing]
        ingredients_json = json.dumps(ingredients_list)
        
        # EXTRACTING MACROS DATA
        nutrients = recipe.get("nutrition", {}).get("nutrients", [])
        # Helper function to find specific nutrients by name
        def get_macro(name):
            return next((n["amount"] for n in nutrients if n["name"] == name), 0)
            
        calories = get_macro("Calories")
        protein_g = get_macro("Protein")
        carbs_g = get_macro("Carbohydrates")
        fat_g = get_macro("Fat")
        
        # Extract Dietary Flags ---
        is_vegetarian = recipe.get("vegetarian", False)
        is_vegan = recipe.get("vegan", False)
        is_gluten_free = recipe.get("glutenFree", False)
        
        # Build the Content Block & Embed
        # This is the paragraph the AI will read during semantic search
        content_block = f"""
        Recipe: {dish_name}
        Dietary: {'Vegan, ' if is_vegan else ''}{'Vegetarian, ' if is_vegetarian else ''}{'Gluten Free' if is_gluten_free else 'Standard'}
        Macros: {calories} kcal, {protein_g}g Protein, {carbs_g}g Carbs, {fat_g}g Fat
        Ingredients: {', '.join(ingredients_list)}
        Instructions: {instructions[:300]}...
        """
        
        print(f"Embedding: {dish_name}...")
        vector = embeddings.embed_query(content_block)
        
        # Save to Supabase DB
        insert_query = """
            INSERT INTO recipes (
                dish_name, instructions, ingredients, 
                calories, protein_g, carbs_g, fat_g, 
                is_vegetarian, is_vegan, is_gluten_free, 
                content, embedding
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cur.execute(insert_query, (
            dish_name, instructions, ingredients_json,
            calories, protein_g, carbs_g, fat_g,
            is_vegetarian, is_vegan, is_gluten_free,
            content_block, vector
        ))
        count += 1

    conn.commit()
    cur.close()
    conn.close()
    print(f"Successfully ingested {count} fully detailed recipes into Supabase!")

if __name__ == "__main__":
    print("WARNING: This will erase existing recipes and re-seed the database.")
    confirmation = input("Are you sure you want to continue? (y/n): ")
    
    if confirmation.lower() == 'y':
        ingest_spoonacular_data()
    else:
        print("Seeding cancelled.")