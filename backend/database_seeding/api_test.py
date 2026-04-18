import os
import json
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
SPOONACULAR_API_KEY = os.getenv("SPOONACULAR_API_KEY")

def inspect_spoonacular_payload():
    print("Fetching 1 recipe from Spoonacular for inspection...\n")
    
    url = "https://api.spoonacular.com/recipes/complexSearch"
    params = {
        "apiKey": SPOONACULAR_API_KEY,
        "addRecipeInformation": "true",
        "addRecipeNutrition": "true",
        "instructionsRequired": "true",
        "fillIngredients": "true",
        "number": 1  # Only fetch 1 meal!
    }
    
    response = requests.get(url, params=params)
    
    if response.status_code == 200:
        data = response.json()
        
        # 1. Print it to the terminal (pretty-printed with 4 spaces)
        print(json.dumps(data, indent=4))
        
        # 2. Save it to a JSON file for easy reading in VS Code
        with open("sample_recipe_payload.json", "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4)
            
        print("\nSuccess! Saved full payload to 'sample_recipe_payload.json'")
    else:
        print(f"API Error: {response.status_code} - {response.text}")

if __name__ == "__main__":
    inspect_spoonacular_payload()