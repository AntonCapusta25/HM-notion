import json
import sqlite3
import uuid
import os
import requests
from datetime import datetime

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3.1"
DB_PATH = os.path.join(os.path.dirname(__file__), "../data/local_intelligence.db")

import sys

PLATFORMS = ["Thuisbezorgd", "UberEats", "Deliveroo"]
DEFAULT_MEALS = ["Pizza", "Biryani", "Chicken Masala", "Tacos"]

def simulate_catalog(platform: str, meal: str) -> dict:
    prompt = f"""
    You are an AI generating synthetic test data for a competitive market research engine.
    Platform: {platform}
    Meal: {meal}
    Location: Amsterdam
    
    Generate a 100% realistic full catalog mapping for a top-tier restaurant specializing in {meal} on the {platform} platform.
    
    Output EXACTLY as JSON:
    {{
        "restaurant_name": "string (A realistic name for a {meal} place)",
        "restaurant_address": "string",
        "restaurant_rating": float (0-5),
        "number_of_reviews": int,
        "menu_items": "string (comma separated list of 5 popular items related to {meal})",
        "menu_prices": "string (e.g. '10.50, 12.00, 15.00')",
        "dietary_options": "string (e.g. 'Vegan, Halal')",
        "operating_hours": "17:00 - 22:00",
        "contact_number": "+31201234567",
        "restaurant_website": "www.example.nl",
        "delivery_options": "Delivery, Pickup",
        "delivery_time_estimates": "30-45 min",
        "delivery_fees": 2.99,
        "minimum_order_amount": 15.00,
        "special_offers_or_discounts": "10% off over 30 EUR",
        "accepted_payment_methods": "iDEAL, Credit Card, PayPal",
        "customer_reviews": "Good food but late delivery",
        "customer_ratings_distribution": "5: 60%, 4: 20%, 3: 10%, 2: 5%, 1: 5%",
        "food_photos_urls": "img1.jpg, img2.jpg",
        "restaurant_photos_urls": "rest1.jpg",
        "average_cost_for_two": 35.00,
        "restaurant_description": "A great local spot in Amsterdam for {meal}.",
        "popular_dishes": "Signature dish 1, Signature dish 2",
        "nearby_landmarks": "Vondelpark",
        "restaurant_category": "{meal} Specialist",
        "takeaway_options": 1,
        "booking_options": 0,
        "order_tracking_status": "Live Tracking Built-in",
        "service_areas": "Amsterdam Centrum, Zuid, West"
    }}
    """
    try:
        response = requests.post(OLLAMA_URL, json={
            "model": MODEL_NAME, "prompt": prompt, "stream": False, "format": "json"
        }, timeout=150)
        response.raise_for_status()
        text = response.json().get("response", "")
        return json.loads(text.strip())
    except Exception as e:
        print(f"  ❌ LLM estimation failed for {meal} on {platform}: {e}")
        return {}

def collect_layer_6(meals=None, session_id=None):
    if not meals:
        meals = DEFAULT_MEALS
        
    print(f"--- 📥 Initializing Synthetic Comprehensive Catalog Matrix (Session: {session_id}, Meals: {', '.join(meals)}) ---")
    conn = sqlite3.connect(DB_PATH, timeout=20)
    cursor = conn.cursor()
    
    for platform in PLATFORMS:
        for meal in meals:
            print(f"  🧠 Asking LLM to synthetically generate 30-field Actowiz mapping for {meal} on {platform}...")
            data = simulate_catalog(platform, meal)
            if not data: continue
            
            restaurant_name = data.get('restaurant_name', f"{meal} Hub")
            
            cursor.execute('''
                INSERT INTO thuisbezorgd_comprehensive 
                (id, restaurant_name, restaurant_address, cuisine_type, restaurant_rating, number_of_reviews,
                 menu_items, menu_prices, dietary_options, operating_hours, contact_number, restaurant_website,
                 delivery_options, delivery_time_estimates, delivery_fees, minimum_order_amount,
                 special_offers_or_discounts, accepted_payment_methods, customer_reviews, customer_ratings_distribution,
                 food_photos_urls, restaurant_photos_urls, average_cost_for_two, restaurant_description,
                 popular_dishes, nearby_landmarks, restaurant_category, takeaway_options, booking_options,
                 order_tracking_status, service_areas, session_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                str(uuid.uuid4()), f"[{platform}] {restaurant_name}", str(data.get('restaurant_address', '')), meal,
                float(data.get('restaurant_rating', 0)), int(data.get('number_of_reviews', 0)),
                str(data.get('menu_items', '')), str(data.get('menu_prices', '')), str(data.get('dietary_options', '')),
                str(data.get('operating_hours', '')), str(data.get('contact_number', '')), str(data.get('restaurant_website', '')),
                str(data.get('delivery_options', '')), str(data.get('delivery_time_estimates', '')), float(data.get('delivery_fees', 0)),
                float(data.get('minimum_order_amount', 0)), str(data.get('special_offers_or_discounts', '')),
                str(data.get('accepted_payment_methods', '')), str(data.get('customer_reviews', '')),
                str(data.get('customer_ratings_distribution', '')), str(data.get('food_photos_urls', '')),
                str(data.get('restaurant_photos_urls', '')), float(data.get('average_cost_for_two', 0)),
                str(data.get('restaurant_description', '')), str(data.get('popular_dishes', '')),
                str(data.get('nearby_landmarks', '')), str(data.get('restaurant_category', '')),
                int(data.get('takeaway_options', 0)), int(data.get('booking_options', 0)),
                str(data.get('order_tracking_status', '')), str(data.get('service_areas', '')), session_id
            ))
        
    conn.commit()
    conn.close()
    print("✅ Synthetic Catalog Matrix Pipeline Completed.\n")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--session_id", type=str, help="Research Session ID")
    parser.add_argument("meals", type=str, nargs="?", help="Comma-separated meals")
    args, unknown = parser.parse_known_args()
    
    target_meals = None
    if args.meals:
        target_meals = [m.strip() for m in args.meals.split(",") if m.strip()]
    collect_layer_6(target_meals, session_id=args.session_id)
