from fpdf import FPDF
import os
from datetime import datetime

class PDFExporter:
    def __init__(self, output_filename="strategy_report.pdf"):
        self.output_filename = output_filename

    def sanitize_text(self, text):
        """Replaces common non-Latin1 characters with standard equivalents."""
        replacements = {
            '\u2013': '-', # en dash
            '\u2014': '-', # em dash
            '\u2018': "'", # left single quote
            '\u2019': "'", # right single quote
            '\u201c': '"', # left double quote
            '\u201d': '"', # right double quote
            '\u2022': '*', # bullet
            '\u2026': '...', # ellipsis
        }
        for char, replacement in replacements.items():
            text = text.replace(char, replacement)
        
        # Fallback for any remaining un-encodable characters
        return text.encode('latin-1', 'replace').decode('latin-1')

    def export_from_markdown(self, strategy_data, output_path, topic="Strategy Report"):
        """
        Converts strategy data (markdown sections) to a PDF file using FPDF2.
        """
        print(f"--- 📄 Exporting PDF to: {output_path} ---")
        
        class BrandedPDF(FPDF):
            def header(self):
                if self.page_no() > 1:
                    self.set_font("Helvetica", 'I', 8)
                    self.set_text_color(150, 150, 150)
                    self.cell(0, 10, "Homemade B.V. | Confidential Strategic Intelligence", ln=True, align='R')
                    self.ln(5)

            def footer(self):
                self.set_y(-15)
                self.set_font("Helvetica", 'I', 8)
                self.set_text_color(150, 150, 150)
                self.cell(0, 10, f"Page {self.page_no()} | Strategic Department - Homemade B.V.", align='C')

        pdf = BrandedPDF()
        pdf.set_auto_page_break(auto=True, margin=15)
        
        # Cover Page
        pdf.add_page()
        pdf.set_fill_color(15, 23, 42) # Near black/Deep navy (Slate 900)
        pdf.rect(0, 0, 210, 297, 'F')
        
        pdf.set_font("Helvetica", 'B', 32)
        pdf.set_text_color(255, 255, 255)
        pdf.cell(0, 80, "", ln=True) # Spacer
        pdf.multi_cell(0, 20, self.sanitize_text(topic.upper()), align='C')
        
        pdf.set_font("Helvetica", '', 16)
        pdf.cell(0, 20, "360-Degree Market Intelligence Report", ln=True, align='C')
        
        # High-end accent line
        pdf.set_draw_color(99, 102, 241) # Indigo 500
        pdf.set_line_width(2)
        pdf.line(60, pdf.get_y()+5, 150, pdf.get_y()+5)

        pdf.set_y(-60)
        pdf.set_font("Helvetica", 'B', 12)
        pdf.cell(0, 10, "HOMEMADE B.V. STRATEGIC DEPARTMENT", ln=True, align='C')
        pdf.set_font("Helvetica", '', 10)
        pdf.cell(0, 10, f"GENERATED ON {datetime.now().strftime('%B %d, %Y')}", ln=True, align='C')

        # Content Sections
        pdf.set_text_color(15, 23, 42)
        for section_title, content in strategy_data.items():
            pdf.add_page()
            
            # Section Header
            pdf.set_font("Helvetica", 'B', 22)
            pdf.set_text_color(79, 70, 229) # Indigo 600
            pdf.cell(190, 15, self.sanitize_text(section_title), ln=True)
            
            curr_y = pdf.get_y()
            pdf.set_draw_color(226, 232, 240) # Slate 200
            pdf.set_line_width(0.5)
            pdf.line(10, curr_y, 200, curr_y)
            pdf.ln(10)
            
            # Body Formatting
            lines = content.split('\n')
            pdf.set_font("Helvetica", '', 11)
            pdf.set_text_color(30, 41, 59) # Slate 800
            
            for line in lines:
                if pdf.get_y() > 270:
                    pdf.add_page()
                
                line = line.strip()
                if not line:
                    pdf.ln(3)
                    continue
                
                if line.startswith('### '):
                    pdf.set_font("Helvetica", 'B', 14)
                    pdf.set_text_color(51, 65, 85)
                    pdf.multi_cell(190, 10, self.sanitize_text(line[4:]))
                    pdf.set_font("Helvetica", '', 11)
                    pdf.set_text_color(30, 41, 59)
                elif line.startswith('- ') or line.startswith('* '):
                    pdf.set_x(15)
                    pdf.multi_cell(185, 7, f"-  {self.sanitize_text(line[2:])}")
                elif line.startswith('**') and line.endswith('**'):
                     pdf.set_font("Helvetica", 'B', 11)
                     pdf.multi_cell(190, 7, self.sanitize_text(line.replace('**', '')))
                     pdf.set_font("Helvetica", '', 11)
                else:
                    pdf.multi_cell(190, 7, self.sanitize_text(line))
            
        # Write PDF
        full_output_path = os.path.join(output_path, self.output_filename) if os.path.isdir(output_path) else output_path
        
        try:
            pdf.output(full_output_path)
            print(f"✅ PDF successfully generated at: {full_output_path}")
            return full_output_path
        except Exception as e:
            print(f"❌ Error generating PDF: {e}")
            return None

if __name__ == "__main__":
    print("PDF Exporter (FPDF2) module loaded.")
