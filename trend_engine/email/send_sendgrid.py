import requests
import json
from ..config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EMAIL_TO_LIST
import datetime

def send_email_report(html_content, subject=None):
    """
    Sends the HTML report via Supabase Edge Function.
    Python does the heavy lifting, edge function just sends the email.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("Supabase credentials missing. Skipping email.")
        return False

    edge_function_url = f"{SUPABASE_URL}/functions/v1/send-email-only"
    
    # Use custom subject or default to daily trend radar
    if not subject:
        today = datetime.date.today().strftime("%Y-%m-%d")
        subject = f"🔥 Daily Viral Trend Radar - {today}"
    
    # Use first email from list
    to_email = EMAIL_TO_LIST[0] if EMAIL_TO_LIST else "bangalexf@gmail.com"
    
    payload = {
        "html_content": html_content,
        "to_email": to_email,
        "subject": subject
    }
    
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(edge_function_url, json=payload, headers=headers)
        response.raise_for_status()
        
        result = response.json()
        print(f"✅ Email sent successfully via edge function!")
        print(f"   Recipient: {to_email}")
        print(f"   Subject: {subject}")
        return True
        
    except Exception as e:
        print(f"❌ Error sending email via edge function: {e}")
        if hasattr(e, 'response') and e.response:
            print(f"   Response: {e.response.text}")
        return False
