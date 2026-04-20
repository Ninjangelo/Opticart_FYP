import re
from playwright.sync_api import sync_playwright

def get_tesco_price(product_name):
    print(f"Live-tracking '{product_name}' at Tesco...")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=False,
            args=["--disable-blink-features=AutomationControlled"]
        )
        page = browser.new_page(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        
        try:
            # Search Tesco - product name injected into URL
            url = f"https://www.tesco.com/groceries/en-GB/search?query={product_name}"
            # 15 second timeout
            page.goto(url, timeout=30000, wait_until="domcontentloaded")

            # Handle Cookie Banner
            try:
                # Waits 3 seconds before clicking "Accept all" button
                page.get_by_role("button", name=re.compile("Accept all", re.IGNORECASE)).click(timeout=3000)
                page.wait_for_timeout(2000)
            except Exception:
                # Proceeds to carry out scraping process incase banner doesn't appear
                pass

            # Locators
            title_locator = page.locator("h2.ddsweb-heading a").first
            price_locator = page.locator(".ddsweb-price__container p").first
            image_locator = page.locator("[data-testid^='imageElement_']").first
            
            # Waits for the title to display on the screen
            title_locator.wait_for(state="visible", timeout=10000)
            
            # Extract text
            title = title_locator.inner_text().strip()
            raw_price = price_locator.inner_text().strip()
            image_url = image_locator.get_attribute("src")

            price_match = re.search(r'£\d+\.\d{2}', raw_price)
            clean_price = price_match.group(0) if price_match else raw_price
            
            browser.close()
            return {"name": title, "price": clean_price, "status": "In Stock", "image": image_url}
            
        except Exception as e:
            print(f" -> Tesco Playwright issue: {e}")
            pass
            
        browser.close()
        return None

# --- UNIT TEST ---
if __name__ == "__main__":
    print(get_tesco_price("chicken breast"))