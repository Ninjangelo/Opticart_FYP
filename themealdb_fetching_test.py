import requests
import json

# TheMealDB uses '1' as the public test API key
# Endpoint: Get a random meal
url = "https://www.themealdb.com/api/json/v1/1/random.php"

print(f"Fetching from: {url} ...\n")

try:
    # 1. Send the Request
    response = requests.get(url)
    
    # 2. Check if the request was successful (Status Code 200)
    if response.status_code == 200:
        # 3. Get the Raw JSON Data
        data = response.json()
        
        # 4. Print it exactly as it arrived (Raw)
        #print("--- RAW DATA START ---")
        #print(data)
        #print("--- RAW DATA END ---")

        print(json.dumps(data, indent=4))
        
    else:
        print(f"Error: API returned status code {response.status_code}")

except Exception as e:
    print(f"Connection failed: {e}")