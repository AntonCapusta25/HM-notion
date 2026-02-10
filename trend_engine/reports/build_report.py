def build_html_report(content_ideas_data):
    """
    Builds an HTML email report with content ideas for B2C and B2B audiences.
    """
    b2c_ideas = content_ideas_data.get('b2c_content_ideas', [])
    b2b_ideas = content_ideas_data.get('b2b_content_ideas', [])
    trending_themes = content_ideas_data.get('trending_themes', [])
    key_insights = content_ideas_data.get('key_insights', '')
    
    # Build B2C content ideas HTML
    b2c_html = ""
    for i, idea in enumerate(b2c_ideas, 1):
        steps_html = "".join([f"<li>{step}</li>" for step in idea.get('execution_steps', [])])
        
        b2c_html += f"""
        <div style="background: #fff5f5; border-left: 4px solid #ff6b35; padding: 20px; margin-bottom: 20px; border-radius: 8px;">
            <h3 style="color: #2c3e50; margin: 0 0 10px 0;">
                <span style="background: #ff6b35; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px; margin-right: 10px;">#{i}</span>
                {idea.get('title', 'Untitled')}
            </h3>
            <p style="margin: 10px 0; color: #7f8c8d;">
                <strong>Format:</strong> {idea.get('format', 'N/A')} | 
                <strong>Platform:</strong> {idea.get('platform', 'N/A')}
            </p>
            <p style="margin: 10px 0; color: #34495e;">
                <strong>Concept:</strong> {idea.get('concept', 'N/A')}
            </p>
            <div style="margin: 15px 0;">
                <strong style="color: #2c3e50;">How to Execute:</strong>
                <ol style="margin: 10px 0; padding-left: 20px; color: #34495e;">
                    {steps_html}
                </ol>
            </div>
            <p style="margin: 10px 0; padding: 10px; background: #fff; border-radius: 4px; color: #27ae60; font-size: 14px;">
                <strong>💡 Why it works:</strong> {idea.get('why_it_works', 'N/A')}
            </p>
        </div>
        """
    
    # Build B2B content ideas HTML
    b2b_html = ""
    for i, idea in enumerate(b2b_ideas, 1):
        steps_html = "".join([f"<li>{step}</li>" for step in idea.get('execution_steps', [])])
        
        b2b_html += f"""
        <div style="background: #f0f7ff; border-left: 4px solid #3498db; padding: 20px; margin-bottom: 20px; border-radius: 8px;">
            <h3 style="color: #2c3e50; margin: 0 0 10px 0;">
                <span style="background: #3498db; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px; margin-right: 10px;">#{i}</span>
                {idea.get('title', 'Untitled')}
            </h3>
            <p style="margin: 10px 0; color: #7f8c8d;">
                <strong>Format:</strong> {idea.get('format', 'N/A')} | 
                <strong>Platform:</strong> {idea.get('platform', 'N/A')}
            </p>
            <p style="margin: 10px 0; color: #34495e;">
                <strong>Concept:</strong> {idea.get('concept', 'N/A')}
            </p>
            <div style="margin: 15px 0;">
                <strong style="color: #2c3e50;">How to Execute:</strong>
                <ol style="margin: 10px 0; padding-left: 20px; color: #34495e;">
                    {steps_html}
                </ol>
            </div>
            <p style="margin: 10px 0; padding: 10px; background: #fff; border-radius: 4px; color: #2980b9; font-size: 14px;">
                <strong>💡 Why it works:</strong> {idea.get('why_it_works', 'N/A')}
            </p>
        </div>
        """
    
    # Build trending themes HTML
    themes_html = "".join([f"<span style='background: #9b59b6; color: white; padding: 6px 16px; border-radius: 20px; margin: 5px; display: inline-block;'>{theme}</span>" for theme in trending_themes])
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700;">🔥 Daily Content Ideas</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">B2C + B2B Content Strategy</p>
        </div>
        
        <!-- Key Insights -->
        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin-bottom: 30px; border-radius: 8px;">
            <h2 style="color: #856404; margin: 0 0 10px 0; font-size: 18px;">📊 Today's Insights</h2>
            <p style="color: #856404; margin: 0; font-size: 15px;">{key_insights}</p>
        </div>
        
        <!-- Trending Themes -->
        <div style="margin-bottom: 30px;">
            <h2 style="color: #2c3e50; margin: 0 0 15px 0; font-size: 20px;">🎯 Trending Themes</h2>
            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                {themes_html}
            </div>
        </div>
        
        <!-- Cultural Highlights -->
        {cultural_highlights_html}
        
        <!-- B2C Content Ideas -->
        <div style="margin-bottom: 40px;">
            <div style="background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: white; margin: 0; font-size: 24px;">🍽️ B2C Content (For Customers)</h2>
                <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Drive orders and attract hungry customers</p>
            </div>
            {b2c_html}
        </div>
        
        <!-- B2B Content Ideas -->
        <div style="margin-bottom: 30px;">
            <div style="background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: white; margin: 0; font-size: 24px;">👨‍🍳 B2B Content (For Chefs)</h2>
                <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Inspire chefs to join your platform</p>
            </div>
            {b2b_html}
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; padding: 30px 20px; border-top: 2px solid #ecf0f1; margin-top: 40px;">
            <p style="color: #95a5a6; font-size: 14px; margin: 0;">
                Generated by HomeMade Meals Trend Radar<br>
                Powered by AI Analysis of 350+ posts from YouTube, Instagram, TikTok & Reddit
            </p>
        </div>
        
    </body>
    </html>
    """
    
    return html
