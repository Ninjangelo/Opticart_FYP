import concurrent.futures
from asda_scraper import get_asda_price
from tesco_scraper import get_tesco_price
from sainsburys_scraper import get_sainsburys_price
from aldi_scraper import get_aldi_price

def compare_all_supermarkets(ingredient_name: str):
    print(f"\n--- Starting parallel price comparison for: {ingredient_name} ---")
    
    results = {}
    
    # Create Dictionary to store scraped live-time prices to their respective supermarket
    scrapers = {
        "Asda": get_asda_price,
        "Tesco": get_tesco_price,
        "Sainsburys": get_sainsburys_price,
        "Aldi": get_aldi_price
    }

    # ThreadPoolExecutor running each function asynchronously
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        # Passes all tasks to ThreadPoolExecutor
        future_to_store = {
            executor.submit(func, ingredient_name): store 
            for store, func in scrapers.items()
        }
        
        # Data is then stored after scraper browsers finish and close
        for future in concurrent.futures.as_completed(future_to_store):
            store_name = future_to_store[future]
            try:
                data = future.result()
                if data:
                    results[store_name] = data
                else:
                    results[store_name] = {"name": "Item not found", "price": "N/A", "status": "Out of Stock"}
            except Exception as e:
                print(f"Thread error for {store_name}: {e}")
                results[store_name] = {"name": "Error fetching data", "price": "N/A", "status": "Error"}
                
    print("--- Parallel comparison complete! ---")
    return results

# --- UNIT TEST: If the following script is run directly ---
if __name__ == "__main__":
    print(compare_all_supermarkets("chicken breast"))