from google import genai
from google.genai import types
import json
from ..config import GEMINI_API_KEY

def analyze_trends_for_content_ideas(viral_posts, cultural_trends=None):
    """
    Analyzes all viral posts AND cultural trends to generate content ideas for TWO audiences:
    1. B2C: Customers who order meals (food content)
    2. B2B: Chefs who want to join the platform (entrepreneurial content)
    
    Also includes a "Cultural Trends" section with sports, holidays, movies, memes to tie content to.
    """
    if not GEMINI_API_KEY:
        print("Gemini API Key missing. Skipping AI analysis.")
        return {}

    # Initialize the new client
    client = genai.Client(api_key=GEMINI_API_KEY)

    # Prepare posts summary for AI
    posts_summary = []
    for i, post in enumerate(viral_posts[:50], 1):  # Analyze top 50 posts
        posts_summary.append(f"""
Post {i} ({post.get('source', 'Unknown')}):
Title: {post.get('title', 'No title')}
Engagement: {post.get('likes', 0)} likes, {post.get('comments', 0)} comments, {post.get('views', 0)} views
Viral Score: {post.get('viral_score', 0)}/10
""")
    
    posts_text = "\n".join(posts_summary)
    
    # Prepare cultural trends summary
    cultural_text = ""
    if cultural_trends:
        cultural_text = "\n\nUPCOMING CULTURAL EVENTS:\n"
        
        # Check if cultural_trends is a list (new structure) or dict (old structure support)
        if isinstance(cultural_trends, list):
            for event in cultural_trends[:10]:  # Limit to 10 events
                name = event.get('event_name', 'Unknown Event')
                date = event.get('event_date', 'Unknown Date')
                opportunity = event.get('opportunity', '')
                cultural_text += f"- {name} ({date}): {opportunity}\n"
        
        elif isinstance(cultural_trends, dict):
            # Fallback for old structure if ever used
            if cultural_trends.get('trending_topics'):
                cultural_text += "\nGoogle Trending Searches:\n"
                for topic in cultural_trends['trending_topics'][:5]:
                    cultural_text += f"- {topic.get('title', 'Unknown')} ({topic.get('traffic', 'Unknown')} searches)\n"
            
            if cultural_trends.get('viral_memes'):
                cultural_text += "\nViral on Reddit:\n"
                for meme in cultural_trends['viral_memes'][:5]:
                    cultural_text += f"- {meme.get('title', 'Unknown')} ({meme.get('upvotes', 0)} upvotes)\n"
            
            if cultural_trends.get('sports_events'):
                cultural_text += "\nSports Events:\n"
                for event in cultural_trends['sports_events'][:3]:
                    cultural_text += f"- {event.get('title', 'Unknown')}\n"
            
            if cultural_trends.get('entertainment'):
                cultural_text += "\nEntertainment/Movies:\n"
                for ent in cultural_trends['entertainment'][:3]:
                    cultural_text += f"- {ent.get('title', 'Unknown')}\n"

    prompt = f"""
You are a content strategist for HomeMade Meals, a platform connecting home chefs with customers.

Analyze these trending cooking posts from today:

{posts_text}

{cultural_text}

Generate content ideas for TWO DISTINCT AUDIENCES:

**AUDIENCE 1: B2C (Customers/Clients)**
People who want to order homemade meals. Content should make them hungry, show food quality, and drive orders.

**AUDIENCE 2: B2B (Chefs/Entrepreneurs)**
Home chefs who might join the platform. Content should inspire them, show earning potential, flexibility, and success stories.

For EACH audience, generate 10 ACTIONABLE CONTENT IDEAS.

IMPORTANT: Use the cultural trends (sports, holidays, movies, memes) to make content timely and relevant. For example:
- Tie recipes to upcoming holidays
- Create content around major sports events (game day food)
- Reference viral memes or trending topics
- Connect to popular movies/shows

OUTPUT ONLY VALID JSON in this exact format:
{{
  "b2c_content_ideas": [
    {{
      "title": "Catchy hook/title",
      "format": "Content format (e.g., Reel, TikTok, Carousel)",
      "concept": "What makes it viral",
      "execution_steps": ["Step 1", "Step 2", "Step 3"],
      "platform": "Instagram/TikTok/YouTube",
      "why_it_works": "Explanation based on trends",
      "cultural_tie_in": "How it connects to current events/trends (if applicable)",
      "target_audience": "Customers"
    }}
  ],
  "b2b_content_ideas": [
    {{
      "title": "Catchy hook/title",
      "format": "Content format",
      "concept": "What makes it viral",
      "execution_steps": ["Step 1", "Step 2", "Step 3"],
      "platform": "Instagram/TikTok/YouTube/LinkedIn",
      "why_it_works": "Explanation based on trends",
      "cultural_tie_in": "How it connects to current events/trends (if applicable)",
      "target_audience": "Chefs"
    }}
  ],
  "cultural_highlights": [
    {{
      "trend": "Name of trend/event",
      "opportunity": "How HomeMade Meals can leverage this",
      "urgency": "When to act (e.g., 'This week', 'Next weekend')"
    }}
  ],
  "trending_themes": ["Theme 1", "Theme 2", "Theme 3"],
  "key_insights": "2-3 sentence summary of what's trending today"
}}
"""
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        
        # Clean up code blocks if Gemini returns them
        clean_text = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_text)
        return data
    except Exception as e:
        print(f"Error in AI analysis: {e}")
        return {
            "b2c_content_ideas": [],
            "b2b_content_ideas": [],
            "cultural_highlights": [],
            "trending_themes": [],
            "key_insights": "AI analysis unavailable"
        }
