def calculate_viral_score(post):
    """
    Calculates a viral score based on:
    - Velocity (views/interactions per hour)
    - Engagement (interaction rate)
    - Relatability (keyword match)
    """
    
    # 1. Normalize data
    views = post.get("views", 0)
    likes = post.get("likes", 0)
    comments = post.get("comments", 0)
    hours_since = post.get("hours_since", 1.0)
    
    # If hours_since is too small, clamp it to avoid division by zero explosion
    if hours_since < 0.5:
        hours_since = 0.5
        
    interactions = likes + comments
    
    # For platforms without view counts (like Reddit via API sometimes), estimate views
    # Heuristic: 1 upvote ~ 100 views (very rough, but standardizes the math)
    if views == 0 and interactions > 0:
        views = interactions * 100
    
    hourly_interactions = interactions / hours_since
    
    # 4. Handle RSS-based scoring (Rank based)
    rank = post.get("rank")
    if views == 0 and rank:
        # If we have a rank but no views (RSS feed), calculate score based on rank
        # Rank 1 is top = 10 points. Rank 20 = 2 points.
        # Formula: Max(0, 10 - (rank * 0.4)) 
        # So Rank 1 = 9.6, Rank 10 = 6, Rank 25 = 0
        rank_score = max(0, 10 - (rank * 0.4))
        
        # Add a bit of relatability bonus
        content_lower = str(post.get("content", "")).lower()
        relatability_keywords = ["home", "family", "simple", "dinner", "kids", "husband", "wife", "tired", "cheap", "grocery"]
        relatability_bonus = sum(1 for word in relatability_keywords if word in content_lower)
        
        return round(rank_score + min(relatability_bonus, 2), 1)

    # 5. Velocity Score (0-10 scale essentially)
    if views == 0:
        return 0
    # How fast is it gaining traction?
    velocity = views / hours_since
    # Logarithmic scaling or just linear capping?
    # Let's simple normalize: 1000 views/hr = 10 points
    velocity_score = min(velocity / 100, 10) 

    # 3. Engagement Score
    engagement_rate = interactions / views
    # 10% engagement is huge. 1% is normal.
    # Score = engagement_rate * 100 (so 5% = 5 points)
    engagement_score = min(engagement_rate * 100, 10)

    # 4. Relatability Score
    relatability_keywords = ["home", "family", "simple", "dinner", "kids", "husband", "wife", "tired", "cheap", "grocery"]
    content = post.get("content", "").lower()
    
    matches = sum(1 for word in relatability_keywords if word in content)
    relatability_score = min(matches * 2, 10) # 5 matches = 10 points

    # 5. Final Weighted Score
    # 0.5 velocity, 0.3 engagement, 0.2 relatability
    final_score = (velocity_score * 0.5) + (engagement_score * 0.3) + (relatability_score * 0.2)
    
    return round(final_score, 1)
