import sqlite3
import os

# Create data directory if it doesn't exist
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)

DB_PATH = os.path.join(DATA_DIR, "local_intelligence.db")

def init_db():
    print(f"Initializing local SQLite database at {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH, timeout=20)
    cursor = conn.cursor()

    # 1. Competitor Pain Points
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS competitor_pain_points (
        id TEXT PRIMARY KEY,
        competitor TEXT,
        review_source TEXT,
        review_date DATETIME,
        rating INTEGER,
        review_text TEXT,
        pain_point_category TEXT,
        specific_issue TEXT,
        severity TEXT,
        sentiment_score REAL,
        emotional_tone TEXT,
        customer_segment_inferred TEXT,
        actionable_insight TEXT,
        is_systemic_issue BOOLEAN,
        opportunity_score INTEGER,
        homemade_solution TEXT,
        session_id TEXT,
        scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(session_id) REFERENCES strategic_sessions(id)
    );
    """)

    # 2. Competitor UX Analysis
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS competitor_ux_analysis (
        id TEXT PRIMARY KEY,
        competitor TEXT,
        page_type TEXT,
        screenshot_url TEXT,
        click_depth_to_order INTEGER,
        form_fields_count INTEGER,
        loading_time_ms INTEGER,
        mobile_responsive BOOLEAN,
        ux_strengths TEXT, -- JSON mapping
        ux_weaknesses TEXT, -- JSON mapping
        missing_features TEXT, -- JSON mapping
        improvement_suggestions TEXT, -- JSON mapping
        session_id TEXT,
        analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(session_id) REFERENCES strategic_sessions(id)
    );
    """)

    # 3. Unmet Customer Needs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS unmet_customer_needs (
        id TEXT PRIMARY KEY,
        source TEXT,
        post_url TEXT,
        post_date DATETIME,
        post_text TEXT,
        upvotes_likes INTEGER,
        unmet_need TEXT,
        need_category TEXT,
        customer_segment TEXT,
        urgency_level TEXT,
        validation_score INTEGER,
        homemade_solution TEXT,
        market_size_estimate TEXT,
        competitive_gap BOOLEAN,
        implementation_priority INTEGER,
        session_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(session_id) REFERENCES strategic_sessions(id)
    );
    """)

    # 4. Competitive Pricing Intelligence
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS competitor_pricing (
        id TEXT PRIMARY KEY,
        competitor TEXT,
        average_meal_price REAL,
        delivery_fee_avg REAL,
        platform_fee REAL,
        loyalty_program_active INTEGER,
        promotional_mechanics TEXT,
        session_id TEXT,
        scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(session_id) REFERENCES strategic_sessions(id)
    );
    """)

    # 5. Macro Market Research
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS macro_market_research (
        id TEXT PRIMARY KEY,
        data_point TEXT,
        data_category TEXT,
        source TEXT,
        session_id TEXT,
        scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(session_id) REFERENCES strategic_sessions(id)
    );
    """)

    # 8. Intelligence Insights (AI Synthesized Strategies)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS intelligence_insights (
        id TEXT PRIMARY KEY,
        insight_type TEXT,
        title TEXT,
        description TEXT,
        priority TEXT,
        confidence_score REAL,
        recommended_action TEXT,
        estimated_impact TEXT,
        implementation_effort TEXT,
        status TEXT,
        session_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(session_id) REFERENCES strategic_sessions(id)
    );
    """)

    # 9. Marketing Campaigns
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS marketing_campaigns (
        id TEXT PRIMARY KEY,
        insight_id TEXT,
        campaign_name TEXT,
        target_audience TEXT,
        platform TEXT,
        ad_copy TEXT,
        visual_concept TEXT,
        status TEXT,
        session_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(insight_id) REFERENCES intelligence_insights(id),
        FOREIGN KEY(session_id) REFERENCES strategic_sessions(id)
    );
    """)

    # 10. Comprehensive Actowiz-Parity Registry (Complete Catalog)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS thuisbezorgd_comprehensive (
        id TEXT PRIMARY KEY,
        restaurant_name TEXT,
        restaurant_address TEXT,
        cuisine_type TEXT,
        restaurant_rating REAL,
        number_of_reviews INTEGER,
        menu_items TEXT,
        menu_prices TEXT,
        dietary_options TEXT,
        operating_hours TEXT,
        contact_number TEXT,
        restaurant_website TEXT,
        delivery_options TEXT,
        delivery_time_estimates TEXT,
        delivery_fees REAL,
        minimum_order_amount REAL,
        special_offers_or_discounts TEXT,
        accepted_payment_methods TEXT,
        customer_reviews TEXT,
        customer_ratings_distribution TEXT,
        food_photos_urls TEXT,
        restaurant_photos_urls TEXT,
        average_cost_for_two REAL,
        restaurant_description TEXT,
        popular_dishes TEXT,
        nearby_landmarks TEXT,
        restaurant_category TEXT,
        takeaway_options INTEGER,
        booking_options INTEGER,
        order_tracking_status TEXT,
        service_areas TEXT,
        session_id TEXT,
        scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(session_id) REFERENCES strategic_sessions(id)
    );
    """)

    # 11. Market Holidays (Nager.Date API)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS market_holidays (
        id TEXT PRIMARY KEY,
        date TEXT,
        local_name TEXT,
        english_name TEXT,
        demand_spike_prediction TEXT,
        strategic_opportunity TEXT,
        session_id TEXT,
        scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(session_id) REFERENCES strategic_sessions(id)
    );
    """)

    # Create Indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_pain_points_category ON competitor_pain_points(pain_point_category);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_pain_points_systemic ON competitor_pain_points(is_systemic_issue);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_pain_points_severity ON competitor_pain_points(severity);")

    # 12. Strategic Sessions (Chat-like history)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS strategic_sessions (
        id TEXT PRIMARY KEY,
        name TEXT,
        intent TEXT,
        ai_plan TEXT, -- JSON string
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 13. Market Keywords Table (restored)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS market_keywords (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            keyword TEXT UNIQUE,
            search_volume_estimate INTEGER,
            competition_index TEXT, -- 'High', 'Medium', 'Low'
            intent_category TEXT,   -- 'Informational', 'Transactional', 'Commercial'
            related_topics TEXT,
            source TEXT,
            session_id TEXT,
            last_updated DATETIME,
            FOREIGN KEY(session_id) REFERENCES strategic_sessions(id)
        )
    ''')

    conn.commit()
    conn.close()
    print("✅ Database initialized successfully with all 8 Intelligence Layers.")

if __name__ == "__main__":
    init_db()
