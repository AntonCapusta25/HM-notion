import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
        const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

        if (!SENDGRID_API_KEY) {
            throw new Error('SENDGRID_API_KEY not configured')
        }

        console.log('🚀 Starting Trend Radar Pipeline...')

        // Step 1: Scrape Reddit (using RSS - most reliable)
        console.log('📡 Scraping Reddit...')
        const redditPosts = await scrapeReddit()
        console.log(`✅ Fetched ${redditPosts.length} Reddit posts`)

        // Step 2: Score posts for virality
        console.log('📊 Scoring posts...')
        const scoredPosts = redditPosts.map(post => ({
            ...post,
            viral_score: calculateViralScore(post)
        }))

        // Filter for viral candidates (score > 7)
        const viralCandidates = scoredPosts
            .filter(p => p.viral_score > 7)
            .sort((a, b) => b.viral_score - a.viral_score)
            .slice(0, 5)

        console.log(`🔥 Found ${viralCandidates.length} viral candidates`)

        if (viralCandidates.length === 0) {
            return new Response(
                JSON.stringify({ message: 'No viral trends found today' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Step 3: Generate HTML report
        console.log('📝 Building HTML report...')
        const htmlReport = buildHTMLReport(viralCandidates)

        // Step 4: Send email via SendGrid
        console.log('📧 Sending email...')
        const emailResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SENDGRID_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                personalizations: [{
                    to: [{ email: 'bangalexf@gmail.com' }],
                    subject: `🔥 Daily Viral Trend Radar - ${new Date().toLocaleDateString()}`
                }],
                from: { email: 'Chefs@homemademeals.net', name: 'Home Maestro Trends' },
                content: [{
                    type: 'text/html',
                    value: htmlReport
                }]
            })
        })

        if (!emailResponse.ok) {
            const errorText = await emailResponse.text()
            throw new Error(`SendGrid error: ${errorText}`)
        }

        console.log('✅ Email sent successfully!')

        return new Response(
            JSON.stringify({
                success: true,
                trends_found: viralCandidates.length,
                email_sent: true
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('❌ Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})

// Reddit RSS Scraper
async function scrapeReddit() {
    const subreddits = ['HomeCooking', 'MealPrepSunday', 'EatCheapAndHealthy']
    const posts = []

    for (const sub of subreddits) {
        try {
            const response = await fetch(`https://www.reddit.com/r/${sub}/hot.rss?limit=10`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                }
            })

            const xml = await response.text()

            // Parse RSS feed (simple regex approach for Deno)
            const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || []

            for (const entry of entries.slice(0, 5)) {
                const title = entry.match(/<title>(.*?)<\/title>/)?.[1] || ''
                const link = entry.match(/<link href="(.*?)"\/>/)?.[1] || ''
                const updated = entry.match(/<updated>(.*?)<\/updated>/)?.[1] || ''

                posts.push({
                    source: 'Reddit',
                    channel: `r/${sub}`,
                    title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
                    url: link,
                    timestamp: updated,
                    rank: posts.length + 1
                })
            }
        } catch (error) {
            console.error(`Error scraping r/${sub}:`, error)
        }
    }

    return posts
}

// Viral Score Calculator
function calculateViralScore(post) {
    const rank = post.rank || 999

    // Rank-based scoring (top posts = higher scores)
    let rankScore = Math.max(0, 10 - (rank * 0.4))

    // Relatability bonus
    const content = (post.title || '').toLowerCase()
    const keywords = ['home', 'family', 'simple', 'dinner', 'easy', 'quick', 'cheap', 'budget']
    const relatabilityBonus = keywords.filter(k => content.includes(k)).length * 0.5

    return Math.min(10, rankScore + relatabilityBonus)
}

// HTML Report Builder
function buildHTMLReport(trends) {
    const trendCards = trends.map(trend => `
    <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 16px; border-left: 4px solid #10b981;">
      <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 18px;">${trend.title}</h3>
      <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px;">
        <strong>${trend.channel}</strong> • Viral Score: <span style="color: #10b981; font-weight: bold;">${trend.viral_score.toFixed(1)}/10</span>
      </p>
      <a href="${trend.url}" style="color: #3b82f6; text-decoration: none; font-size: 14px;">View Post →</a>
    </div>
  `).join('')

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 24px;">
      <h1 style="margin: 0; color: white; font-size: 28px;">🔥 Daily Viral Trend Radar</h1>
      <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>
    
    <div style="background: white; border-radius: 12px; padding: 24px; margin-bottom: 16px;">
      <h2 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px;">Top Viral Trends</h2>
      ${trendCards}
    </div>
    
    <div style="text-align: center; padding: 16px; color: #6b7280; font-size: 12px;">
      <p style="margin: 0;">Powered by Home Maestro Trend Radar</p>
    </div>
  </div>
</body>
</html>
  `
}
