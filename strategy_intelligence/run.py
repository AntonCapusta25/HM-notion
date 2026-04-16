import argparse
import sys
import os
import json
from config import OUTPUT_DIR, DEFAULT_MODEL
from pipeline.collector import DataCollector
from agent.strategy_builder import StrategyBuilder
from report.html_builder import HTMLBuilder
from report.pdf_export import PDFExporter

def main():
    parser = argparse.ArgumentParser(description="Strategy Intelligence System")
    parser.add_argument("--topic", type=str, default="Home Dining Amsterdam", help="Research topic/niche")
    parser.add_argument("--ai", type=str, choices=["gemini", "openai"], default="openai", help="AI provider")
    parser.add_argument("--skip-scrape", action="store_true", help="Use cached data instead of scraping")
    parser.add_argument("--mock", action="store_true", help="Run in mock mode without calling AI APIs")
    parser.add_argument("--mode", choices=["chef", "customer"], default="chef", help="Target audience for the strategy")
    parser.add_argument("--output", type=str, default=OUTPUT_DIR, help="Output directory for the PDF")
    parser.add_argument("--section", type=str, default=None, help="Specific section to scrape and analyze incrementally")

    args = parser.parse_args()

    print(f"🚀 Starting Strategy Intelligence Pipeline for: {args.topic}")
    if args.section:
        print(f"🎯 Incremental Mode: Target Section -> '{args.section}'")
    print(f"🤖 AI Provider: {args.ai} (Model: {DEFAULT_MODEL})")

    # 1. Data Collection Layer
    collector = DataCollector(topic=args.topic)
    raw_data_path = os.path.join(args.output, "raw_market_data.json")
    if not os.path.exists(raw_data_path):
        raw_data_path = "data/raw_market_data.json"

    if args.skip_scrape and os.path.exists(raw_data_path):
        print(f"--- ♻️ Loading cached data for: {args.topic} ---")
        with open(raw_data_path, 'r') as f:
            raw_data = json.load(f)
    else:
        if args.section:
            raw_data = collector.collect_for_section(section=args.section, location="Amsterdam")
        else:
            raw_data = collector.collect_all_layers(location="Amsterdam")
        collector.save_raw_data(output_dir=args.output)

    # 2. AI Analysis Layer
    strategy_json_path = os.path.join(args.output, "strategy_draft.json")
    builder = StrategyBuilder(ai_provider=args.ai, mock=args.mock, mode=args.mode)
    
    if args.section:
        strategy_doc = builder.build_section(args.section, raw_data, draft_path=strategy_json_path)
        print(f"\n✨ Incrementally generated section '{args.section}'.")
        print("⏭️ Run without --section to compile full PDF later.")
        return # Skip HTML and PDF compilation
    else:
        strategy_doc = builder.build_full_strategy(raw_data, draft_path=strategy_json_path)

    # 3. HTML Rendering Layer
    html_builder = HTMLBuilder(template_name="strategy.html")
    report_html = html_builder.render_report(strategy_doc, topic=args.topic)

    # 4. PDF Export Layer
    exporter = PDFExporter(output_filename=f"{args.topic.replace(' ', '_')}_Strategy.pdf")
    pdf_path = exporter.export_from_markdown(strategy_doc, args.output, topic=args.topic)

    if pdf_path:
        print(f"\n✨ Strategy Report Generated Successfully!")
        print(f"📍 Location: {pdf_path}")
    else:
        print(f"\n❌ Pipeline failed at the PDF export stage.")

if __name__ == "__main__":
    main()
