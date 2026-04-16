import json
import os
from datetime import datetime

# Import all layer collectors
from scrapers.reviews import collect_layer_1
from scrapers.food_platforms import collect_layer_2
from scrapers.experiences import collect_layer_3
from scrapers.demand import collect_layer_4
from scrapers.demographics import collect_layer_5
from scrapers.social import collect_layer_6_7_10
from scrapers.market import collect_layer_8
from scrapers.events import collect_layer_9

import config as cfg

class DataCollector:
    def __init__(self, topic="Home Dining"):
        self.topic = topic
        self.raw_data = {}

    def _load_real_data(self):
        # Disabled: No longer injecting legacy 'real_market_data.json' because we are using live Playwright scrapers exclusively.
        pass

    def collect_all_layers(self, location=cfg.DEFAULT_LOCATION):
        """Runs all scrapers sequentially and aggregates data."""
        print(f"🚀 Starting Multi-Layer Data Collection for: {self.topic} in {location}")
        self._load_real_data()

        self.raw_data["layer_1_reviews"] = collect_layer_1()
        self.raw_data["layer_2_food"] = collect_layer_2()
        self.raw_data["layer_3_experiences"] = collect_layer_3()
        self.raw_data["layer_4_demand"] = collect_layer_4(location)
        self.raw_data["layer_5_demographics"] = collect_layer_5(location)
        self.raw_data["layer_6_7_10_social"] = collect_layer_6_7_10()
        self.raw_data["layer_8_marketplace"] = collect_layer_8(location)
        self.raw_data["layer_9_events"] = collect_layer_9(location)
        
        self.save_raw_data()
        return self.raw_data

    def collect_for_section(self, section: str, location=cfg.DEFAULT_LOCATION):
        """Runs only the scrapers required for a specific strategy section."""
        print(f"🚀 Starting Incremental Data Collection for section: '{section}' in {location}")
        self._load_real_data()
        
        # Mapping Sections to Layers
        section_mapping = {
            "Executive Summary": [],
            "Market Opportunity Analysis": ["layer_4_demand", "layer_6_7_10_social"],
            "Customer Persona Profiles": ["layer_5_demographics", "layer_6_7_10_social"],
            "Competitor Landscape": ["layer_1_reviews", "layer_2_food", "layer_8_marketplace"],
            "Pricing & Revenue Model": ["layer_8_marketplace"],
            "Marketing & Growth Strategy": ["layer_6_7_10_social", "layer_9_events"],
            "Platform & Experience Design": ["layer_3_experiences"],
            "Operational Roadmap": [],
            "KPIs & Success Metrics": [],
            "Risk Analysis & Mitigation": ["layer_1_reviews", "layer_6_7_10_social"]
        }
        
        layers_needed = section_mapping.get(section, [])
        if not layers_needed:
            print(f"ℹ️ No specific scraping layers mapped for '{section}'. Using base knowledge.")
        else:
            if "layer_1_reviews" in layers_needed: self.raw_data["layer_1_reviews"] = collect_layer_1()
            if "layer_2_food" in layers_needed: self.raw_data["layer_2_food"] = collect_layer_2(self.topic, location)
            if "layer_3_experiences" in layers_needed: self.raw_data["layer_3_experiences"] = collect_layer_3(self.topic, location)
            if "layer_4_demand" in layers_needed: self.raw_data["layer_4_demand"] = collect_layer_4(self.topic, location)
            if "layer_5_demographics" in layers_needed: self.raw_data["layer_5_demographics"] = collect_layer_5(location)
            if "layer_6_7_10_social" in layers_needed: self.raw_data["layer_6_7_10_social"] = collect_layer_6_7_10(self.topic)
            if "layer_8_marketplace" in layers_needed: self.raw_data["layer_8_marketplace"] = collect_layer_8(self.topic, location)
            if "layer_9_events" in layers_needed: self.raw_data["layer_9_events"] = collect_layer_9(location)
            
        self.save_raw_data()
        return self.raw_data

    def save_raw_data(self, output_dir="data"):
        os.makedirs(output_dir, exist_ok=True)
        path = os.path.join(output_dir, "raw_market_data.json")
        with open(path, 'w') as f:
            json.dump(self.raw_data, f, indent=4, default=str)
        print(f"💾 Raw data saved to {path}")
        return path
