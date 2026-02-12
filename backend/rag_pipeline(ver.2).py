
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
SUPABASE_URI = "postgresql://postgres.yucenclxbyzfrmgsdotd:[INSERT_PASSWORD]@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require"

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
    ingest_spaghetti_data()
    
    # RAG Retrieval
    query_vector = embeddings.embed_query(user_query)
    
    conn = psycopg2.connect(SUPABASE_URI)
    cur = conn.cursor()
    cur.execute("SELECT content FROM items ORDER BY embedding <-> %s::vector LIMIT 1", (query_vector,))
    result = cur.fetchone()
    conn.close()
    
    # If recipe not found
    if not result:
        print("No recipe found.")
        return

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
    
    # Step D: Display & Live Track
    print(f"\nDISH: {recipe_obj.dish_name}")
    print(f"INSTRUCTIONS: {recipe_obj.instructions[:100]}...")
    print("-" * 40)
    print("CHECKING LIVE STOCK AT ASDA...")
    
    for ingredient in recipe_obj.ingredients:
        # ASDA scraper
        asda_data = get_asda_price(ingredient)
        
        if asda_data:
            print(f"{ingredient}: Found '{asda_data['name']}' - {asda_data['price']} ({asda_data['status']})")
        else:
            print(f"{ingredient}: Not found or check failed.")

# ------------------------------ PIPELINE EXECUTION ------------------------------


if __name__ == "__main__":
    run_chat_agent("How do I make spaghetti?")