from playwright.sync_api import sync_playwright

# PRODUCT SEARCH FUNCTION
def get_asda_price(product_name):

    print(f"🛒 Live-tracking '{product_name}' at Asda...")
    
    with sync_playwright() as p:
        # Running ghost browser
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        try:
            # 1. Search Asda
            # We inject the product name directly into the URL
            url = f"https://groceries.asda.com/search/{product_name}"
            page.goto(url, timeout=15000) # 15s timeout
            
            # 2. Wait for product list to load
            page.wait_for_selector(".co-product-list__main-cntr", timeout=10000)
            
            # 3. Scrape the first item found
            first_item = page.query_selector(".co-item")
            
            if first_item:
                title = first_item.query_selector(".co-product__title").inner_text()
                price = first_item.query_selector(".co-product__price").inner_text()
                
                # Check stock status
                out_of_stock = first_item.query_selector(".co-product__out-of-stock")
                status = "Out of Stock" if out_of_stock else "In Stock"
                
                browser.close()
                return {"name": title, "price": price, "status": status}
            
        except Exception as e:
            # If search fails or times out, return None
            # print(f"Scraping error: {e}") 
            pass
            
        browser.close()
        return None