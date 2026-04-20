import os
import sys
import json
import requests
import psycopg2
import re
from pathlib import Path
from dotenv import load_dotenv

# Path Fix
parent_dir = str(Path(__file__).resolve().parent.parent)
sys.path.append(parent_dir)

from rag_pipeline import embeddings

load_dotenv()
SPOONACULAR_API_KEY = os.getenv("SPOONACULAR_API_KEY")
SUPABASE_URI = os.getenv("DATABASE_URL")

def ingest_drinks():
    TOTAL_DRINKS = 50 # Fetching 50 specific drinks
    BATCH_SIZE = 50
    
    print(f"Fetching {TOTAL_DRINKS} BEVERAGES from Spoonacular...")
    
    conn = psycopg2.connect(SUPABASE_URI)
    cur = conn.cursor()
    
    # Notice: NO TRUNCATE COMMAND HERE! We are appending to the database.
    
    count = 0
    for offset in range(0, TOTAL_DRINKS, BATCH_SIZE):
        
        url = f"https://api.spoonacular.com/recipes/complexSearch"
        params = {
            "apiKey": SPOONACULAR_API_KEY,
            "addRecipeInformation": "true",
            "addRecipeNutrition": "true",
            "instructionsRequired": "true", 
            "fillIngredients": "true",      
            "number": BATCH_SIZE, 
            "offset": offset,
            "type": "beverage" # <--- THIS FORCES THE API TO ONLY RETURN DRINKS!
        }
        
        response = requests.get(url, params=params)
        if response.status_code != 200:
            print(f"API Error: {response.status_code} - {response.text}")
            break
            
        data = response.json()
        
        for recipe in data.get("results", []):
            dish_name = recipe.get("title", "Unknown Recipe")
            
            instruction_steps = []
            for doc in recipe.get("analyzedInstructions", []):
                for step in doc.get("steps", []):
                    instruction_steps.append(f"{step['number']}. {step['step']}")
            instructions = "\n".join(instruction_steps)
            
            raw_ingredients = recipe.get("extendedIngredients", [])
            if not raw_ingredients:
                raw_ingredients = recipe.get("usedIngredients", []) + recipe.get("missedIngredients", [])
                
            ingredients_list = [ing.get("original", "") for ing in raw_ingredients if "original" in ing]
            ingredients_json = json.dumps(ingredients_list)
            
            nutrients = recipe.get("nutrition", {}).get("nutrients", [])
            def get_macro(name):
                return next((n["amount"] for n in nutrients if n["name"] == name), 0)
                
            calories = get_macro("Calories")
            protein_g = get_macro("Protein")
            carbs_g = get_macro("Carbohydrates")
            fat_g = get_macro("Fat")
            saturated_fat_g = get_macro("Saturated Fat")
            sugar_g = get_macro("Sugar")
            sodium_mg = get_macro("Sodium")
            
            is_vegetarian = recipe.get("vegetarian", False)
            is_vegan = recipe.get("vegan", False)
            is_gluten_free = recipe.get("glutenFree", False)
            is_dairy_free = recipe.get("dairyFree", False)
            
            image_url = recipe.get("image", "")
            ready_in_minutes = recipe.get("readyInMinutes", 0)
            servings = recipe.get("servings", 1)
            
            cuisines = recipe.get("cuisines", [])
            dish_types = recipe.get("dishTypes", [])
            diets = recipe.get("diets", [])

            raw_summary = recipe.get("summary", "No description available.")
            clean_summary = re.sub(r'<[^>]+>', '', raw_summary)
            
            content_block = f"""
            Recipe: {dish_name}
            Description: {clean_summary[:200]}...
            Time: {ready_in_minutes} minutes
            Dietary: {'Vegan, ' if is_vegan else ''}{'Vegetarian, ' if is_vegetarian else ''}{'Gluten Free' if is_gluten_free else 'Standard'}
            Macros: {calories} kcal, {protein_g}g Protein, {carbs_g}g Carbs, {fat_g}g Fat
            Ingredients: {', '.join(ingredients_list)}
            Instructions: {instructions[:300]}...
            """
            
            print(f"Embedding [{count+1}/{TOTAL_DRINKS}]: {dish_name}...")
            vector = embeddings.embed_query(content_block)
            
            insert_query = """
                INSERT INTO recipes (
                    dish_name, instructions, ingredients, 
                    calories, protein_g, carbs_g, fat_g, saturated_fat_g, sugar_g, sodium_mg,
                    is_vegetarian, is_vegan, is_gluten_free, is_dairy_free,
                    servings, cuisines, dish_types, diets,
                    image_url, summary, ready_in_minutes,
                    content, embedding
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            cur.execute(insert_query, (
                dish_name, instructions, ingredients_json,
                calories, protein_g, carbs_g, fat_g, saturated_fat_g, sugar_g, sodium_mg,
                is_vegetarian, is_vegan, is_gluten_free, is_dairy_free,
                servings, cuisines, dish_types, diets,
                image_url, raw_summary, ready_in_minutes, 
                content_block, vector
            ))
            count += 1

    conn.commit()
    cur.close()
    conn.close()
    print(f"\nSuccessfully APPENDED {count} new beverages into Supabase! You now have a total of 350 recipes.")

if __name__ == "__main__":
    ingest_drinks()