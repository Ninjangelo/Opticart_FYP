import re
from playwright.sync_api import sync_playwright

# Product Search
def get_asda_price(product_name):

    print(f"Live-tracking '{product_name}' at Asda...")
    
    with sync_playwright() as p:
        # Running ghost browser
        browser = p.chromium.launch(headless=True)

        # Disguise as Windows 10 Google Chrome Client
        page = browser.new_page(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        
        try:
            # Search Asda
            # Product name injected directly into the URL
            url = f"https://groceries.asda.com/search/{product_name}"
            # 15 second timeout
            page.goto(url, timeout=15000)

            # Handle Cookie Banner
            try:
                # Wait up to 3 seconds for the "I Accept" button and click it
                page.get_by_role("button", name="I Accept").click(timeout=3000)
            except Exception:
                # If the banner doesn't show up, just ignore and keep going
                pass


            # Bypass wrapper
            # Wait directly for the first product title to appear on the page
            page.wait_for_selector(".css-1pp27v6", timeout=10000)
            
            # Grab the very first title and price text on the screen
            title_element = page.query_selector(".css-1pp27v6")
            price_element = page.query_selector(".css-1gvvc97")
            
            if title_element and price_element:
                title = title_element.inner_text().strip()
                raw_price = price_element.inner_text().strip()

                # This looks for '£' followed by any digits and a decimal
                price_match = re.search(r'£\d+\.\d{2}', raw_price)
                
                # If it finds a match, use it. Otherwise, fallback to the raw text.
                clean_price = price_match.group(0) if price_match else raw_price
                
                browser.close()
                return {"name": title, "price": clean_price, "status": "In Stock"}
            
        except Exception as e:
            print(f" -> Playwright encountered an issue: {e}")
            pass
            
        browser.close()
        return None