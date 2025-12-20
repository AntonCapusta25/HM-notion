# SendGrid Email Function

Supabase Edge Function for sending emails via SendGrid API.

## Environment Variables Required

Set these in your Supabase project settings (Edge Functions secrets):

- `SENDGRID_API_KEY` - Your SendGrid API key
- `SENDGRID_FROM_EMAIL` - Default sender email address
- `SENDGRID_FROM_NAME` - Default sender name
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

## Endpoints

### Send Single Email

```bash
POST /send-email
```

**Request Body:**
```json
{
  "action": "send_single",
  "to": "recipient@example.com",
  "subject": "Email Subject",
  "content": "Email content in plain text",
  "html": "<p>Email content in HTML</p>",
  "from_email": "sender@yourdomain.com",
  "from_name": "Your Name",
  "workspace_id": "uuid",
  "user_id": "uuid"
}
```

### Send Campaign Emails

```bash
POST /send-email
```

**Request Body:**
```json
{
  "action": "send_campaign",
  "campaign_id": "uuid",
  "workspace_id": "uuid",
  "user_id": "uuid"
}
```

## Features

- ✅ Single email sending
- ✅ Bulk campaign email sending
- ✅ Email personalization ({{name}}, {{company}}, etc.)
- ✅ Email tracking (opens, clicks)
- ✅ Rate limiting with configurable delays
- ✅ Error handling and retry logic
- ✅ Database integration for email status tracking

## Deployment

```bash
# Deploy to Supabase
supabase functions deploy send-email

# Set environment variables
supabase secrets set SENDGRID_API_KEY=your_key_here
supabase secrets set SENDGRID_FROM_EMAIL=noreply@yourdomain.com
supabase secrets set SENDGRID_FROM_NAME="Your Company"
```
