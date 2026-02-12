from playwright.sync_api import sync_playwright

# Product Search
def get_asda_price(product_name):

    print(f"Live-tracking '{product_name}' at Asda...")
    
    with sync_playwright() as p:
        # Running ghost browser
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        try:
            # Search Asda
            # Product name injected directly into the URL
            url = f"https://groceries.asda.com/search/{product_name}"
            # 15 second timeout
            page.goto(url, timeout=15000)
            
            # Product Listings Loading
            page.wait_for_selector(".co-product-list__main-cntr", timeout=10000)
            
            # Scraping the first item loaded
            first_item = page.query_selector(".co-item")
            
            if first_item:
                title = first_item.query_selector(".co-product__title").inner_text()
                price = first_item.query_selector(".co-product__price").inner_text()
                
                # Checking stock status
                out_of_stock = first_item.query_selector(".co-product__out-of-stock")
                status = "Out of Stock" if out_of_stock else "In Stock"
                
                browser.close()
                return {"name": title, "price": price, "status": status}
            
        except Exception as e:
            # Return None if search fails or times out
            pass
            
        browser.close()
        return None