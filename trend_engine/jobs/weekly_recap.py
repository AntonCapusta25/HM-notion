from datetime import datetime, timedelta
from trend_engine.db import db
from trend_engine.reports.build_report import build_html_report
from trend_engine.email.send_sendgrid import send_email_report

def generate_weekly_recap():
    """
    Generates a weekly recap email with the top 10 content ideas from the past week.
    """
    print("🚀 Starting Weekly Recap Generation...")
    print("=" * 60)
    
    # Get top 10 ideas from this week
    print("\n📊 Fetching top 10 ideas from this week...")
    top_ideas = db.get_top_ideas_this_week(limit=10)
    
    if not top_ideas:
        print("   ⚠️ No ideas found for this week. Skipping recap.")
        return
    
    print(f"   ✅ Found {len(top_ideas)} ideas")
    
    # Separate B2C and B2B ideas
    b2c_ideas = [idea for idea in top_ideas if idea.get('target_audience') == 'B2C']
    b2b_ideas = [idea for idea in top_ideas if idea.get('target_audience') == 'B2B']
    
    print(f"   B2C: {len(b2c_ideas)} | B2B: {len(b2b_ideas)}")
    
    # Get upcoming events
    print("\n📅 Fetching upcoming events...")
    upcoming_events = db.get_upcoming_events(days_ahead=14)
    print(f"   ✅ Found {len(upcoming_events)} upcoming events")
    
    # Build recap data structure
    recap_data = {
        "b2c_content_ideas": b2c_ideas[:5],  # Top 5 B2C
        "b2b_content_ideas": b2b_ideas[:5],  # Top 5 B2B
        "cultural_highlights": [
            {
                "trend": event.get('event_name', ''),
                "opportunity": event.get('opportunity', ''),
                "urgency": event.get('urgency', '')
            }
            for event in upcoming_events[:5]
        ],
        "trending_themes": ["Weekly Recap", "Top Performers"],
        "key_insights": f"This week's top {len(top_ideas)} content ideas, curated from daily trend analysis."
    }
    
    # Generate HTML report
    print("\n📝 Generating Weekly Recap Email...")
    html_report = build_html_report(recap_data)
    print("   ✅ Report generated")
    
    # Send email
    print("\n📧 Sending Weekly Recap Email...")
    send_email_report(html_report, subject="📊 Weekly Content Recap - Top 10 Ideas")
    print("   ✅ Email sent to the configured team list")
    
    print("\n" + "=" * 60)
    print("✅ Weekly Recap Complete!")
    print("=" * 60)

if __name__ == "__main__":
    generate_weekly_recap()
