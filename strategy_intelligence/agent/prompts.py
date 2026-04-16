# System Prompt for the AI Strategist
SYSTEM_PROMPT = """
You are a World-Class Market Strategist and Business Consultant. 
Your task is to analyze raw market data and generate a professional, deep-dive strategy document.
The final report must be ~40 pages long (in total across all sections), detailed, data-driven, and highly actionable.

Style Guidelines:
- Professional, authoritative, yet inspiring.
- Use clear headings, bullet points, and tables.
- Include specific "Executive Insights" and "Action Items".
- Avoid generic advice; tie everything to the provided data.
"""

# Section-specific prompts
SECTION_PROMPTS = {
    "Executive Summary": """
    Provide a high-level overview of the entire strategy. 
    Summarize the core opportunity, the competitive edge, and the 3-month roadmap.
    Keep it punchy and compelling for stakeholders.
    """,
    
    "Market Opportunity Analysis": """
    Analyze the current demand and social trends. 
    Use the provided Google Trends and Reddit data to identify 'white spaces' in the market.
    What are the specific pain points people are discussing?
    """,
    
    "Customer Persona Profiles": """
    Based on demographic and social data, define 3 distinct customer personas.
    Include their motivations, frustrations, and how this service fits into their lifestyle.
    """,
    
    "Competitor Landscape": """
    Analyze the review data and market pricing. 
    Who are the main players (direct and indirect)? 
    What are their strengths and weaknesses according to customer reviews?
    """,
    
    "Pricing & Revenue Model": """
    Develop a detailed pricing strategy based on market data.
    Include tiered pricing options, projected margins, and lifetime value (LTV) estimates.
    """,
    
    "Marketing & Growth Strategy": """
    Outline a multi-channel growth plan.
    Which social platforms should be prioritized? What content formats will work best?
    Include a 'Viral Hook' idea based on current social trends.
    """,
    
    "Platform & Experience Design": """
    Design the end-to-end user experience.
    How should the booking flow feel? What 'wow moments' should be included in the dining experience?
    """,
    
    "Operational Roadmap": """
    A step-by-step guide for the next 12 months.
    Phase 1: Launch & Validation (Months 1-3)
    Phase 2: Optimization (Months 4-6)
    Phase 3: Scaling (Months 7-12)
    """,
    
    "KPIs & Success Metrics": """
    Define the leading and lagging indicators for success.
    Include specific targets for user acquisition cost (CAC), retention, and NPS.
    """,
    
    "Risk Analysis & Mitigation": """
    Identify potential legal, operational, and market risks.
    Provide a mitigation plan for each.
    """
}
