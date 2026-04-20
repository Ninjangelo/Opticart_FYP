# Imports
# re import for regex to handle messy extracted data from ghost browser 
import re
from playwright.sync_api import sync_playwright

# Product Search
def get_asda_price(product_name):

    print(f"Live-tracking '{product_name}' at Asda...")
    
    with sync_playwright() as p:
        # Running ghost browser
        # Displays ingredient page(s) being scraped currently
        browser = p.chromium.launch(
            headless=False, 
            args=["--disable-blink-features=AutomationControlled"]
        )
        page = browser.new_page(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        
        try:
            # Search Asda
            # Product name injected directly into the URL
            url = f"https://groceries.asda.com/search/{product_name}"
            # 15 second timeout
            page.goto(url, timeout=30000, wait_until="domcontentloaded")

            # Handle Cookie Banner
            try:
                # Wait up to 3 seconds for the "I Accept" button and click it
                page.get_by_role("button", name="I Accept").click(timeout=3000)
                page.wait_for_timeout(2000)
            except Exception:
                # If the banner doesn't show up, just ignore and keep going
                pass

            # Locators
            title_locator = page.locator(".css-1pp27v6").first
            price_locator = page.locator(".css-1gvvc97").first
            image_locator = page.locator("[data-locator='img-product-image']").first
            
            # Waits for title to display on the page
            title_locator.wait_for(state="visible", timeout=10000)
            
            title = title_locator.inner_text().strip()
            raw_price = price_locator.inner_text().strip()
            image_url = image_locator.get_attribute("src")

            price_match = re.search(r'£\d+\.\d{2}', raw_price)
            clean_price = price_match.group(0) if price_match else raw_price
            
            browser.close()
            return {"name": title, "price": clean_price, "status": "In Stock", "image": image_url}
            
        except Exception as e:
            print(f" -> Asda Playwright issue: {e}")
            pass
            
        browser.close()
        return None


# --- UNIT TEST ---
if __name__ == "__main__":
    print(get_asda_price("chicken breast"))