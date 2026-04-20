import re
from playwright.sync_api import sync_playwright

def get_sainsburys_price(product_name):
    print(f"Live-tracking '{product_name}' at Sainsbury's...")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=False, 
            args=["--disable-blink-features=AutomationControlled"]
        )
        page = browser.new_page(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        
        try:
            url = f"https://www.sainsburys.co.uk/gol-ui/SearchResults/{product_name}"
            page.goto(url, timeout=30000, wait_until="domcontentloaded")

            # Handle Cookie Banner
            try:
                page.get_by_role("button", name=re.compile(r"Continue and accept|Accept All Cookies", re.IGNORECASE)).click(timeout=3000)
                page.wait_for_timeout(2000)
            except Exception:
                pass

            # Locators
            title_locator = page.locator("[data-testid='product-tile-description'] a").first
            price_locator = page.locator("[data-testid='pt-retail-price']").first
            image_locator = page.locator("[data-testid='pt-image']").first
            
            title_locator.wait_for(state="visible", timeout=10000)
            
            title = title_locator.inner_text().strip()
            raw_price = price_locator.inner_text().strip()
            image_url = image_locator.get_attribute("src")

            price_match = re.search(r'£\d+\.\d{2}', raw_price)
            clean_price = price_match.group(0) if price_match else raw_price
            
            browser.close()
            return {"name": title, "price": clean_price, "status": "In Stock", "image": image_url}
            
        except Exception as e:
            print(f" -> Sainsbury's Playwright issue: {e}")
            pass
            
        browser.close()
        return None

# --- UNIT TEST ---
if __name__ == "__main__":
    print(get_sainsburys_price("chicken breast"))