import requests
import psycopg2
import sys
from pathlib import Path

# Obtaining Parent Directory and adding to path
parent_dir = str(Path(__file__).resolve().parent.parent)
sys.path.append(parent_dir)

# Importing Supabase Database URL and EMBEDDINGS MODEL
from rag_pipeline import SUPABASE_URI, embeddings

def ingest_spaghetti_data():
    print("Fetching spaghetti data from TheMealDB...")
    url = "https://www.themealdb.com/api/json/v1/1/search.php?s=spaghetti+bolognese"
    data = requests.get(url).json()
    
    # Supabase DB Connection
    conn = psycopg2.connect(SUPABASE_URI)
    cur = conn.cursor()
    
    # REMOVE existing "recipes" Table
    cur.execute("TRUNCATE TABLE recipes;")

    
    count = 0
    if data["meals"]:
        for meal in data["meals"]:
            # Formatting Recipe into a Single Text Block
            ingredients = []
            for i in range(1, 10):
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
            cur.execute("INSERT INTO recipes (content, embedding) VALUES (%s, %s)", (content_block, vector))
            count += 1
            
    conn.commit()
    cur.close()
    conn.close()
    print(f"Ingested {count} spaghetti recipes into Supabase.")


# SCRIPT RUNNING START POINT
if __name__ == "__main__":
    print("WARNING: This will erase existing recipes and re-seed the database.")
    confirmation = input("Are you sure you want to continue? (y/n): ")
    
    if confirmation.lower() == 'y':
        print("Starting database population...")
        ingest_spaghetti_data()
        print("Database seeding complete!")
    else:
        print("Seeding cancelled.")