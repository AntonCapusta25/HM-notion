from supabase import create_client
import os
from datetime import datetime, date, timedelta
import json

class Database:
    def __init__(self):
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not url or not key:
            print("⚠️ Supabase credentials not found. Database features disabled.")
            self.client = None
            return
            
        self.client = create_client(url, key)
    
    def _serialize_value(self, value):
        """Convert datetime objects to ISO strings for JSON serialization"""
        if isinstance(value, (datetime, date)):
            return value.isoformat()
        return value
    
    def _serialize_dict(self, data: dict):
        """Serialize all values in a dictionary"""
        return {key: self._serialize_value(value) for key, value in data.items()}
    
    def save_trend(self, trend_data: dict):
        """Saves a processed trend to the 'viral_trends' table (legacy)."""
        if not self.client:
            return None
            
        try:
            serialized_data = self._serialize_dict(trend_data)
            data, count = self.client.table("viral_trends").insert(serialized_data).execute()
            print(f"✅ Trend saved to database: {serialized_data.get('title', 'Unknown')[:50]}")
            return data
        except Exception as e:
            print(f"Error saving trend to DB: {e}")
            return None
    
    def save_content_idea(self, idea: dict, target_audience: str):
        """
        Saves a content idea to the 'content_ideas' table.
        Skips if an idea with the same title already exists in the last 14 days.
        """
        if not self.client:
            return None

        try:
            title = idea.get("title", "").strip()
            if not title:
                return None

            # Deduplication: check if this title was already saved in the last 14 days
            cutoff = (datetime.now() - timedelta(days=14)).isoformat()
            existing = (
                self.client.table("content_ideas")
                .select("id")
                .ilike("title", title)   # case-insensitive match
                .gte("created_at", cutoff)
                .limit(1)
                .execute()
            )
            if existing.data:
                print(f"   ⏭️  Skipping duplicate: '{title}'")
                return None

            # Get current week number and year
            now = datetime.now()
            week_number = now.isocalendar()[1]
            year = now.year

            # Type safe extraction with fallbacks
            try:
                execution_steps = idea.get("execution_steps", [])
                if not isinstance(execution_steps, list):
                    execution_steps = [str(execution_steps)]
                execution_steps_json = json.dumps(execution_steps)
            except Exception:
                execution_steps_json = "[]"
                
            try:
                viral_score = float(idea.get("viral_score", 0.0))
            except (ValueError, TypeError):
                viral_score = 0.0

            data = {
                "title": title[:255], # truncate to fit
                "format": str(idea.get("format", ""))[:255],
                "concept": str(idea.get("concept", "")),
                "execution_steps": execution_steps_json,
                "platform": str(idea.get("platform", ""))[:255],
                "why_it_works": str(idea.get("why_it_works", "")),
                "cultural_tie_in": str(idea.get("cultural_tie_in", "")),
                "target_audience": target_audience,
                "viral_score": viral_score,
                "week_number": week_number,
                "year": year
            }

            result = self.client.table("content_ideas").insert(data).execute()
            print(f"   ✅ Saved idea to DB: {title[:30]}...")
            return result
        except Exception as e:
            import traceback
            print(f"❌ Error saving content idea '{idea.get('title', 'Unknown')}': {e}")
            traceback.print_exc()
            return None
    
    def save_event(self, event: dict):
        """
        Saves or updates an event in the 'events_calendar' table.
        Uses UPSERT to prevent duplicates based on event_name + event_date.
        
        Args:
            event: Event dictionary with name, type, date, opportunity, urgency
        """
        if not self.client:
            return None
        
        try:
            # Parse event_date if it's a string
            event_date = event.get("event_date")
            if isinstance(event_date, str):
                event_date = datetime.fromisoformat(event_date).date()
            elif isinstance(event_date, datetime):
                event_date = event_date.date()
            
            data = {
                "event_name": event.get("event_name", ""),
                "event_type": event.get("event_type", ""),
                "event_date": event_date.isoformat() if event_date else None,
                "opportunity": event.get("opportunity", ""),
                "urgency": event.get("urgency", ""),
                "source": event.get("source", "trend_radar")
            }
            
            # UPSERT: Insert or update if event_name + event_date already exists
            result = self.client.table("events_calendar").upsert(
                data,
                on_conflict="event_name,event_date"
            ).execute()
            
            return result
        except Exception as e:
            print(f"❌ Error saving event: {e}")
            return None
    
    def get_top_ideas_this_week(self, limit=10):
        """
        Retrieves top content ideas from the current week.
        Sorted by viral_score descending.
        """
        if not self.client:
            return []
        
        try:
            now = datetime.now()
            week_number = now.isocalendar()[1]
            year = now.year
            
            result = self.client.table("content_ideas")\
                .select("*")\
                .eq("week_number", week_number)\
                .eq("year", year)\
                .order("viral_score", desc=True)\
                .limit(limit)\
                .execute()
            
            return result.data
        except Exception as e:
            print(f"❌ Error fetching top ideas: {e}")
            return []
    
    def get_upcoming_events(self, days_ahead=14):
        """
        Retrieves upcoming events within the next N days.
        """
        if not self.client:
            return []
        
        try:
            today = date.today()
            future_date = today + timedelta(days=days_ahead)
            
            result = self.client.table("events_calendar")\
                .select("*")\
                .gte("event_date", today.isoformat())\
                .lte("event_date", future_date.isoformat())\
                .order("event_date", desc=False)\
                .execute()
            
            return result.data
        except Exception as e:
            print(f"❌ Error fetching upcoming events: {e}")
            return []

    def save_global_trend(self, trend_data: dict, analysis_json: dict):
        """
        Saves a global viral trend and its deep analysis to 'global_viral_trends'.
        
        Args:
            trend_data: Basic video metadata (url, title, views, etc)
            analysis_json: The deep AI analysis Output
        """
        if not self.client:
            return None
            
        try:
            # Merge data
            data = {
                "platform": trend_data.get("platform", "youtube"),
                "source_id": trend_data.get("source_id", ""),
                "url": trend_data.get("url", ""),
                "title": trend_data.get("title", ""),
                "description": trend_data.get("description", "")[:500], # Truncate if too long
                "duration_seconds": trend_data.get("duration", 0),
                "views": trend_data.get("views", 0),
                "analysis_json": json.dumps(analysis_json) # Store deep analysis as JSONB
            }
            
            # Insert (ignore if duplicate due to unique constraint on source_id)
            result = self.client.table("global_viral_trends").insert(data).execute()
            print(f"✅ Predicted Global Trend Saved: {data.get('title')}")
            return result
        except Exception as e:
            # Handle unique constraint violation gracefully
            if "duplicate key" in str(e) or "unique constraint" in str(e):
                print(f"⚠️ Video already exists in DB: {trend_data.get('title')}")
                return "duplicate"
            print(f"❌ Error saving global trend: {e}")
            return None

# Global database instance
db = Database()
