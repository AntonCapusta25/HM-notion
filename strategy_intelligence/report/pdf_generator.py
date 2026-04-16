import asyncio
from playwright.async_api import async_playwright
import os

class PDFGenerator:
    """
    High-fidelity PDF generator using Playwright to render HTML into PDF.
    Supports complex CSS, tables, and page breaks.
    """
    
    async def html_to_pdf(self, html_content, output_path):
        print(f"--- 🌐 Launching Playwright PDF Renderer ---")
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            # Set content
            await page.set_content(html_content)
            
            # Wait for any webfonts or resources
            await page.wait_for_timeout(1000)
            
            # Generate PDF
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            await page.pdf(
                path=output_path,
                format="A4",
                print_background=True,
                margin={
                    "top": "0",
                    "right": "0",
                    "bottom": "0",
                    "left": "0"
                }
            )
            
            await browser.close()
            print(f"✅ High-Fidelity PDF generated at: {output_path}")
            return output_path

def sync_html_to_pdf(html_content, output_path):
    """Sync wrapper for the async PDF generator."""
    return asyncio.run(PDFGenerator().html_to_pdf(html_content, output_path))

if __name__ == "__main__":
    # Test
    test_html = "<h1>Test Report</h1><p>If you see this, the renderer works.</p>"
    sync_html_to_pdf(test_html, "test_output.pdf")
