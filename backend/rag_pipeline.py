import os
from dotenv import load_dotenv
from supabase.client import Client, create_client
from langchain_community.vectorstores import SupabaseVectorStore
from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field
from typing import List

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
CHAT MODEL: Llama 3
"""
embeddings = OllamaEmbeddings(model="nomic-embed-text")
llm = ChatOllama(model="llama3", temperature=0)

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
    ingredients: List[str] = Field(description="List of main ingredients (max 5)")
    instructions: str = Field(description="Brief cooking instructions")

parser = PydanticOutputParser(pydantic_object=RecipePlan)

# ------------------------------ RESPONSE OUTPUT STRUCTURE ------------------------------


# ------------------------------ PIPELINE EXECUTION ------------------------------
def run_chat_agent(user_query, metadata_filters=None):
    
    print(f"\nSearching database for: {user_query}")
    if metadata_filters:
        print(f"Applying Filters: {metadata_filters}")
    
    # RAG Retrieval using LangChain's VectorStore
    # Passing metadata filters (like {'is_vegan': True})
    docs = vector_store.similarity_search(
        query=user_query, 
        k=1,
        filter=metadata_filters 
    )
    
    # If recipe not found
    if not docs:
        return {"error": "No recipe found matching your criteria."}

    # Extracting the text payload from document object returned through Langchain
    context_text = docs[0].page_content
    
    # LLM Processing (ingredient extraction)
    print("Match found! Analyzing recipe...")
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
        try:
            asda_data = get_asda_price(ingredient)
            scraped_ingredients.append({
                "name": ingredient,
                "supermarket_data": asda_data 
            })
        except Exception as e:
            print(f"Scraper error for {ingredient}: {e}")
            scraped_ingredients.append({"name": ingredient, "supermarket_data": None})

    # Return Data
    return {
        "dish_name": recipe_obj.dish_name,
        "instructions": recipe_obj.instructions,
        "ingredients": scraped_ingredients
    }

# ------------------------------ PIPELINE EXECUTION ------------------------------

if __name__ == "__main__":
    # Standard semantic search
    print("\n--- TEST 1: STANDARD SEARCH ---")
    print(run_chat_agent("I want a hearty meal with meat."))
    
    # Hybrid Search (Semantic + Metadata Filtering)
    print("\n--- TEST 2: HYBRID SEARCH (HIGH PROTEIN ONLY) ---")
    print(run_chat_agent("I want a hearty meal.", metadata_filters={"protein_g": 30}))