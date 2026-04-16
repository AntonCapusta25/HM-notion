import markdown
from jinja2 import Environment, FileSystemLoader
import os
from datetime import datetime

class HTMLBuilder:
    def __init__(self, template_name="strategy.html"):
        template_dir = os.path.join(os.path.dirname(__file__), 'templates')
        self.env = Environment(loader=FileSystemLoader(template_dir))
        self.template = self.env.get_template(template_name)

    def render_report(self, sections, topic="Home Dining Amsterdam", campaigns=None, partnerships=None):
        """
        Converts Markdown strategy sections into stylized HTML and injects marketing assets.
        """
        print(f"--- 🎨 Rendering HTML Report for: {topic} ---")
        
        # Convert markdown content to HTML for main strategic sections
        processed_sections = []
        for section in sections:
            html_content = markdown.markdown(section['content'], extensions=['tables', 'fenced_code'])
            processed_sections.append({
                "title": section['title'],
                "content": html_content
            })
            
        # Render template
        report_html = self.template.render(
            topic=topic,
            date=datetime.now().strftime("%B %d, %Y"),
            sections=processed_sections,
            campaigns=campaigns,
            partnerships=partnerships # Injected for the table in strategy.html
        )
        
        return report_html

if __name__ == "__main__":
    print("HTML Builder module loaded.")
