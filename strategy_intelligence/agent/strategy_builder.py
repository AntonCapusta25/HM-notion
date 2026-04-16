import os
import json
import time
from agent.analyst import AIAnalyst
from agent.prompts import SECTION_PROMPTS, SYSTEM_PROMPT
from agent.customer_prompts import CUSTOMER_SECTION_PROMPTS, CUSTOMER_SYSTEM_PROMPT
import config as cfg
STRATEGY_SECTIONS = cfg.STRATEGY_SECTIONS

class StrategyBuilder:
    def __init__(self, ai_provider="openai", mock=False, mode="chef"):
        self.mode = mode
        self.analyst = AIAnalyst(provider=ai_provider, mock=mock)
        
        if mode == "customer":
            self.prompts = CUSTOMER_SECTION_PROMPTS
            self.system_prompt = CUSTOMER_SYSTEM_PROMPT
        else:
            self.prompts = SECTION_PROMPTS
            self.system_prompt = SYSTEM_PROMPT
            
        self.strategy_doc = {}

    def _load_draft(self, draft_path):
        if os.path.exists(draft_path):
            try:
                with open(draft_path, 'r') as f:
                    self.strategy_doc = json.load(f)
            except Exception:
                pass

    def build_full_strategy(self, raw_data, draft_path="output/strategy_draft.json"):
        """Iterates through all strategy sections and generates content for each."""
        self._load_draft(draft_path)
        print(f"--- 🧠 Building Full Strategy Report (MODE: {self.mode}) ---")
        
        for section in STRATEGY_SECTIONS:
            if section in self.strategy_doc and len(self.strategy_doc[section]) > 100:
                print(f"⏩ Skipping {section} (already in draft)")
                continue

            prompt = self.prompts.get(section, "Generate a detailed professional analysis.")
            content = self.analyst.analyze_section(section, prompt, raw_data, system_prompt=self.system_prompt)
            self.strategy_doc[section] = content
            self.save_strategy_json(output_path=draft_path)
            time.sleep(1) 
            
        print("--- ✅ Strategy generation complete ---")
        return self.strategy_doc

    def build_section(self, section_name, raw_data, draft_path="output/strategy_draft.json"):
        """Generates content for a single specific section incrementally."""
        self._load_draft(draft_path)
        print(f"--- 🧠 Building Single Section: '{section_name}' (MODE: {self.mode}) ---")
        
        prompt = self.prompts.get(section_name, "Generate a detailed professional analysis.")
        content = self.analyst.analyze_section(section_name, prompt, raw_data, system_prompt=self.system_prompt)
        
        self.strategy_doc[section_name] = content
        self.save_strategy_json(output_path=draft_path)
        
        print(f"--- ✅ Section '{section_name}' complete ---")
        return self.strategy_doc

    def save_strategy_json(self, output_path="output/strategy_draft.json"):
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, 'w') as f:
            json.dump(self.strategy_doc, f, indent=4)
        print(f"💾 Strategy JSON saved to {output_path}")

if __name__ == "__main__":
    print("Strategy Builder module loaded.")
