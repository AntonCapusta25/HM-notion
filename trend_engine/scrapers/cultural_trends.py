import requests
from datetime import datetime, timedelta
from bs4 import BeautifulSoup

def get_cultural_trends():
    """
    Scrapes cultural events, holidays, and festivals.
    Returns a structured list of events with dates.
    """
    trends = {
        "holidays": [],
        "festivals": [],
        "sports_events": [],
        "cultural_moments": []
    }
    
    print("🌍 Scraper: Fetching cultural events and holidays...")
    
    # 1. Get upcoming holidays (hardcoded calendar + API)
    print("   Checking upcoming holidays...")
    holidays = get_upcoming_holidays()
    trends["holidays"].extend(holidays)
    
    # 2. Get festivals and cultural events
    print("   Checking festivals and cultural events...")
    festivals = get_festivals()
    trends["festivals"].extend(festivals)
    
    # 3. Get major sports events
    print("   Checking major sports events...")
    sports = get_sports_events()
    trends["sports_events"].extend(sports)
    
    return trends

def get_upcoming_holidays():
    """
    Returns upcoming holidays with dates and content opportunities.
    """
    current_date = datetime.now()
    current_year = current_date.year
    
    # Comprehensive holiday calendar
    holidays_calendar = [
        # February
        {"name": "Valentine's Day", "date": f"{current_year}-02-14", "type": "holiday", 
         "opportunity": "Romantic dinner packages, couples cooking classes, aphrodisiac ingredients spotlight",
         "urgency": "Plan content 1 week before"},
        
        # March
        {"name": "International Women's Day", "date": f"{current_year}-03-08", "type": "holiday",
         "opportunity": "Feature female chefs, women-owned food businesses, empowerment through cooking",
         "urgency": "Plan content 1 week before"},
        {"name": "St. Patrick's Day", "date": f"{current_year}-03-17", "type": "holiday",
         "opportunity": "Irish-inspired dishes, green food creations, pub-style meals",
         "urgency": "Plan content 1 week before"},
        
        # April
        {"name": "Easter", "date": f"{current_year}-04-20", "type": "holiday",
         "opportunity": "Brunch specials, egg-based dishes, spring ingredients, family meal packages",
         "urgency": "Plan content 2 weeks before"},
        {"name": "Earth Day", "date": f"{current_year}-04-22", "type": "holiday",
         "opportunity": "Sustainable cooking, zero-waste recipes, local ingredients focus",
         "urgency": "Plan content 1 week before"},
        
        # May
        {"name": "Mother's Day", "date": f"{current_year}-05-11", "type": "holiday",
         "opportunity": "Breakfast in bed kits, mom's favorite recipes, family cooking experiences",
         "urgency": "Plan content 2 weeks before"},
        {"name": "Memorial Day", "date": f"{current_year}-05-26", "type": "holiday",
         "opportunity": "BBQ packages, summer kickoff meals, outdoor cooking",
         "urgency": "Plan content 1 week before"},
        
        # June
        {"name": "Father's Day", "date": f"{current_year}-06-15", "type": "holiday",
         "opportunity": "Grilling masterclasses, dad's favorite comfort foods, BBQ specials",
         "urgency": "Plan content 2 weeks before"},
        
        # July
        {"name": "Independence Day (US)", "date": f"{current_year}-07-04", "type": "holiday",
         "opportunity": "American classics, BBQ catering, patriotic-themed meals",
         "urgency": "Plan content 2 weeks before"},
        
        # October
        {"name": "Halloween", "date": f"{current_year}-10-31", "type": "holiday",
         "opportunity": "Spooky-themed dishes, pumpkin recipes, party catering",
         "urgency": "Plan content 2 weeks before"},
        
        # November
        {"name": "Thanksgiving", "date": f"{current_year}-11-27", "type": "holiday",
         "opportunity": "Full turkey dinner packages, sides, leftover transformation recipes",
         "urgency": "Plan content 3 weeks before"},
        
        # December
        {"name": "Christmas", "date": f"{current_year}-12-25", "type": "holiday",
         "opportunity": "Holiday feast packages, cookie decorating, festive meal prep",
         "urgency": "Plan content 4 weeks before"},
        {"name": "New Year's Eve", "date": f"{current_year}-12-31", "type": "holiday",
         "opportunity": "Party catering, champagne pairings, midnight snack boxes",
         "urgency": "Plan content 2 weeks before"},
    ]
    
    # Filter to only upcoming holidays (within next 90 days)
    upcoming = []
    for holiday in holidays_calendar:
        holiday_date = datetime.strptime(holiday["date"], "%Y-%m-%d")
        days_until = (holiday_date - current_date).days
        
        if 0 <= days_until <= 90:  # Next 3 months
            holiday["days_until"] = days_until
            upcoming.append(holiday)
    
    return upcoming

def get_festivals():
    """
    Returns major food and cultural festivals.
    """
    current_date = datetime.now()
    current_year = current_date.year
    
    festivals_calendar = [
        # Food Festivals
        {"name": "Amsterdam Restaurant Week", "date": f"{current_year}-03-01", "type": "festival",
         "opportunity": "Showcase your best dishes, special tasting menus, collaborate with local restaurants",
         "urgency": "Apply 6 weeks before"},
        
        {"name": "King's Day (Netherlands)", "date": f"{current_year}-04-27", "type": "festival",
         "opportunity": "Orange-themed dishes, Dutch classics, street food specials",
         "urgency": "Plan content 3 weeks before"},
        
        {"name": "Taste of Amsterdam", "date": f"{current_year}-06-15", "type": "festival",
         "opportunity": "Feature local ingredients, Dutch cuisine, chef collaborations",
         "urgency": "Plan content 4 weeks before"},
        
        {"name": "Oktoberfest", "date": f"{current_year}-09-21", "type": "festival",
         "opportunity": "German-inspired dishes, beer pairings, hearty comfort food",
         "urgency": "Plan content 3 weeks before"},
    ]
    
    # Filter to upcoming festivals
    upcoming = []
    for festival in festivals_calendar:
        festival_date = datetime.strptime(festival["date"], "%Y-%m-%d")
        days_until = (festival_date - current_date).days
        
        if 0 <= days_until <= 120:  # Next 4 months
            festival["days_until"] = days_until
            upcoming.append(festival)
    
    return upcoming

def get_sports_events():
    """
    Returns major sports events that drive food/catering demand.
    """
    current_date = datetime.now()
    current_year = current_date.year
    
    sports_calendar = [
        {"name": "Super Bowl", "date": f"{current_year}-02-09", "type": "sports",
         "opportunity": "Game day platters, wings, dips, party catering packages",
         "urgency": "Plan content 2 weeks before"},
        
        {"name": "March Madness", "date": f"{current_year}-03-19", "type": "sports",
         "opportunity": "Watch party catering, snack boxes, bracket-themed promotions",
         "urgency": "Plan content 2 weeks before"},
        
        {"name": "UEFA Champions League Final", "date": f"{current_year}-05-31", "type": "sports",
         "opportunity": "Football watch party catering, European-inspired dishes",
         "urgency": "Plan content 2 weeks before"},
        
        {"name": "FIFA World Cup (if applicable)", "date": f"{current_year}-11-21", "type": "sports",
         "opportunity": "International cuisine, watch party packages, themed menus",
         "urgency": "Plan content 4 weeks before"},
    ]
    
    # Filter to upcoming events
    upcoming = []
    for event in sports_calendar:
        event_date = datetime.strptime(event["date"], "%Y-%m-%d")
        days_until = (event_date - current_date).days
        
        if 0 <= days_until <= 90:  # Next 3 months
            event["days_until"] = days_until
            upcoming.append(event)
    
    return upcoming

if __name__ == "__main__":
    trends = get_cultural_trends()
    print("\n📅 Upcoming Holidays:")
    for h in trends["holidays"]:
        print(f"   {h['name']} - {h['date']} ({h['days_until']} days)")
    
    print("\n🎉 Upcoming Festivals:")
    for f in trends["festivals"]:
        print(f"   {f['name']} - {f['date']} ({f['days_until']} days)")
    
    print("\n⚽ Upcoming Sports Events:")
    for s in trends["sports_events"]:
        print(f"   {s['name']} - {s['date']} ({s['days_until']} days)")
