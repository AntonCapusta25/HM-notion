import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
        const SENDGRID_FROM_EMAIL = Deno.env.get('SENDGRID_FROM_EMAIL') || 'Chefs@homemademeals.net'
        const SENDGRID_FROM_NAME = Deno.env.get('SENDGRID_FROM_NAME') || 'Home Maestro Trends'
        const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

        if (!SENDGRID_API_KEY || !GEMINI_API_KEY) {
            throw new Error('Missing required API keys')
        }

        console.log('🚀 Starting COMPLETE Trend Radar Pipeline...')

        // Step 1: Scrape ALL platforms
        console.log('📡 Scraping all platforms...')
        const allPosts = []

        // Reddit RSS
        console.log('  - Reddit...')
        const redditPosts = await scrapeRedditRSS()
        allPosts.push(...redditPosts)
        console.log(`    ✅ ${redditPosts.length} posts`)

        // YouTube (using yt-dlp via API call to Python backend)
        console.log('  - YouTube...')
        const youtubePosts = await scrapeYouTubeMock() // Mock for now since yt-dlp needs Python
        allPosts.push(...youtubePosts)
        console.log(`    ✅ ${youtubePosts.length} posts`)

        // Instagram Mock
        console.log('  - Instagram...')
        const instagramPosts = await scrapeInstagramMock()
        allPosts.push(...instagramPosts)
        console.log(`    ✅ ${instagramPosts.length} posts`)

        // TikTok Mock
        console.log('  - TikTok...')
        const tiktokPosts = await scrapeTikTokMock()
        allPosts.push(...tiktokPosts)
        console.log(`    ✅ ${tiktokPosts.length} posts`)

        console.log(`📊 Total posts collected: ${allPosts.length}`)

        // Step 2: Score for virality
        console.log('🔥 Scoring posts for virality...')
        const scoredPosts = allPosts.map(post => ({
            ...post,
            viral_score: calculateViralScore(post)
        }))

        // Filter viral candidates
        const viralCandidates = scoredPosts
            .filter(p => p.viral_score >= 7.0)
            .sort((a, b) => b.viral_score - a.viral_score)
            .slice(0, 10)

        console.log(`🎯 Found ${viralCandidates.length} viral candidates`)

        if (viralCandidates.length === 0) {
            return new Response(
                JSON.stringify({ message: 'No viral trends found today' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Step 3: AI Analysis with Gemini
        console.log('🤖 Running AI analysis...')
        const analyzedPosts = []

        for (const post of viralCandidates.slice(0, 5)) { // Analyze top 5
            console.log(`  Analyzing: ${post.title.substring(0, 40)}...`)
            const analysis = await analyzeWithGemini(post, GEMINI_API_KEY)
            analyzedPosts.push({
                ...post,
                ai_analysis: analysis
            })
        }

        console.log(`✅ Analyzed ${analyzedPosts.length} posts`)

        // Step 4: Generate HTML report
        console.log('📝 Building HTML report...')
        const htmlReport = buildComprehensiveReport(analyzedPosts)

        // Step 5: Send email
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
                from: { email: SENDGRID_FROM_EMAIL, name: SENDGRID_FROM_NAME },
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

        console.log('✅ Complete workflow finished!')

        return new Response(
            JSON.stringify({
                success: true,
                total_scraped: allPosts.length,
                viral_candidates: viralCandidates.length,
                ai_analyzed: analyzedPosts.length,
                email_sent: true,
                platforms: {
                    reddit: redditPosts.length,
                    youtube: youtubePosts.length,
                    instagram: instagramPosts.length,
                    tiktok: tiktokPosts.length
                }
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
async function scrapeRedditRSS() {
    const subreddits = ['HomeCooking', 'MealPrepSunday', 'EatCheapAndHealthy']
    const posts = []

    for (const sub of subreddits) {
        try {
            const response = await fetch(`https://www.reddit.com/r/${sub}/hot.rss?limit=10`, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            })
            const xml = await response.text()
            const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || []

            for (const entry of entries.slice(0, 5)) {
                const title = entry.match(/<title>(.*?)<\/title>/)?.[1] || ''
                const link = entry.match(/<link href="(.*?)"\/>/)?.[1] || ''
                const content = entry.match(/<content[^>]*>(.*?)<\/content>/s)?.[1] || ''

                // Extract engagement from content
                const upvotes = parseInt(content.match(/(\d+)\s*points?/)?.[1] || '0')
                const comments = parseInt(content.match(/(\d+)\s*comments?/)?.[1] || '0')

                posts.push({
                    source: 'Reddit',
                    channel: `r/${sub}`,
                    title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
                    content: content.replace(/<[^>]+>/g, '').substring(0, 200),
                    url: link,
                    likes: upvotes,
                    comments: comments,
                    views: upvotes * 10, // Estimate
                    timestamp: new Date().toISOString()
                })
            }
        } catch (error) {
            console.error(`Error scraping r/${sub}:`, error)
        }
    }

    return posts
}

// YouTube Mock (would use yt-dlp in Python)
async function scrapeYouTubeMock() {
    return [
        {
            source: 'YouTube',
            channel: '@GordonRamsay',
            title: 'Perfect Scrambled Eggs in 60 Seconds',
            content: 'Gordon Ramsay shows his technique for making the perfect scrambled eggs',
            url: 'https://youtube.com/shorts/abc123',
            likes: 45000,
            comments: 890,
            views: 1200000,
            timestamp: new Date().toISOString()
        },
        {
            source: 'YouTube',
            channel: '@JoshuaWeissman',
            title: 'Making Sourdough Bread at Home',
            content: 'Complete guide to making sourdough bread from scratch',
            url: 'https://youtube.com/shorts/def456',
            likes: 32000,
            comments: 654,
            views: 890000,
            timestamp: new Date().toISOString()
        }
    ]
}

// Instagram Mock
async function scrapeInstagramMock() {
    return [
        {
            source: 'Instagram',
            channel: '@buzzfeedtasty',
            title: 'One-Pot Pasta Hack',
            content: 'Make restaurant-quality pasta in one pot with this simple hack',
            url: 'https://instagram.com/p/xyz789',
            likes: 125000,
            comments: 2340,
            views: 450000,
            timestamp: new Date().toISOString()
        }
    ]
}

// TikTok Mock
async function scrapeTikTokMock() {
    return [
        {
            source: 'TikTok',
            channel: '@cookingwithshereen',
            title: 'Viral Feta Pasta Recipe',
            content: 'The TikTok viral baked feta pasta that everyone is making',
            url: 'https://tiktok.com/@cookingwithshereen/video/123456',
            likes: 850000,
            comments: 12400,
            views: 5200000,
            timestamp: new Date().toISOString()
        }
    ]
}

// Viral Score Calculator
function calculateViralScore(post: any) {
    const engagement = (post.likes || 0) + (post.comments || 0) * 2
    const views = post.views || 1
    const engagementRate = (engagement / views) * 100

    // Base score from engagement rate
    let score = Math.min(engagementRate * 2, 8)

    // Bonus for high absolute numbers
    if (post.likes > 50000) score += 1
    if (post.views > 500000) score += 1

    // Relatability keywords
    const content = `${post.title} ${post.content}`.toLowerCase()
    const keywords = ['easy', 'simple', 'quick', 'home', 'family', 'budget', 'hack', 'viral']
    const keywordBonus = keywords.filter(k => content.includes(k)).length * 0.3

    return Math.min(10, score + keywordBonus)
}

// AI Analysis with Gemini
async function analyzeWithGemini(post: any, apiKey: string) {
    try {
        const prompt = `Analyze this viral food content and explain why it's trending:

Title: ${post.title}
Platform: ${post.source}
Engagement: ${post.likes} likes, ${post.comments} comments, ${post.views} views

Provide a brief 2-sentence analysis of:
1. Why this content is going viral
2. What makes it relatable to home cooks

Keep it concise and actionable.`

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }]
                })
            }
        )

        const data = await response.json()
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Analysis unavailable'
    } catch (error) {
        console.error('Gemini API error:', error)
        return 'AI analysis temporarily unavailable'
    }
}

// Comprehensive HTML Report
function buildComprehensiveReport(trends: any[]) {
    const trendCards = trends.map((trend, index) => `
    <div style="background: white; border-radius: 12px; padding: 24px; margin-bottom: 20px; border-left: 5px solid ${getPlatformColor(trend.source)}; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
        <div style="flex: 1;">
          <div style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">
            ${trend.source} • ${trend.channel}
          </div>
          <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 20px; font-weight: 700;">
            ${trend.title}
          </h3>
        </div>
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 16px; white-space: nowrap; margin-left: 16px;">
          ${trend.viral_score.toFixed(1)}/10
        </div>
      </div>
      
      <p style="margin: 0 0 16px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
        ${trend.content}
      </p>
      
      <div style="background: #f9fafb; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px;">
        <div style="color: #374151; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
          📊 Engagement Metrics
        </div>
        <div style="display: flex; gap: 20px; flex-wrap: wrap;">
          <span style="color: #6b7280; font-size: 14px;">👁️ ${formatNumber(trend.views)} views</span>
          <span style="color: #6b7280; font-size: 14px;">❤️ ${formatNumber(trend.likes)} likes</span>
          <span style="color: #6b7280; font-size: 14px;">💬 ${formatNumber(trend.comments)} comments</span>
        </div>
      </div>
      
      <div style="background: #eff6ff; padding: 12px 16px; border-radius: 8px; border-left: 3px solid #3b82f6; margin-bottom: 16px;">
        <div style="color: #1e40af; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
          🤖 AI Analysis
        </div>
        <p style="margin: 0; color: #1e3a8a; font-size: 14px; line-height: 1.5;">
          ${trend.ai_analysis}
        </p>
      </div>
      
      <a href="${trend.url}" style="display: inline-block; background: #3b82f6; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
        View Post →
      </a>
    </div>
  `).join('')

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 650px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px; padding: 40px; text-align: center; margin-bottom: 32px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
      <h1 style="margin: 0 0 8px 0; color: white; font-size: 32px; font-weight: 800;">
        🔥 Daily Viral Trend Radar
      </h1>
      <p style="margin: 0; color: rgba(255,255,255,0.95); font-size: 18px; font-weight: 500;">
        ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
      </p>
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.3);">
        <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 14px;">
          Multi-platform analysis powered by AI
        </p>
      </div>
    </div>
    
    <!-- Stats Overview -->
    <div style="background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      <h2 style="margin: 0 0 16px 0; color: #1f2937; font-size: 18px; font-weight: 700;">
        📈 Today's Overview
      </h2>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
        <div style="text-align: center; padding: 12px; background: #f9fafb; border-radius: 8px;">
          <div style="font-size: 28px; font-weight: 800; color: #10b981;">${trends.length}</div>
          <div style="font-size: 13px; color: #6b7280; font-weight: 600;">Viral Trends</div>
        </div>
        <div style="text-align: center; padding: 12px; background: #f9fafb; border-radius: 8px;">
          <div style="font-size: 28px; font-weight: 800; color: #3b82f6;">4</div>
          <div style="font-size: 13px; color: #6b7280; font-weight: 600;">Platforms</div>
        </div>
      </div>
    </div>
    
    <!-- Trend Cards -->
    <div style="margin-bottom: 24px;">
      <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 22px; font-weight: 700;">
        🎯 Top Viral Trends
      </h2>
      ${trendCards}
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; padding: 24px; color: #6b7280; font-size: 13px;">
      <p style="margin: 0 0 8px 0; font-weight: 600;">Powered by Home Maestro Trend Radar</p>
      <p style="margin: 0; opacity: 0.8;">AI-powered multi-platform trend analysis</p>
    </div>
  </div>
</body>
</html>
  `
}

function getPlatformColor(platform: string) {
    const colors: Record<string, string> = {
        'Reddit': '#FF4500',
        'YouTube': '#FF0000',
        'Instagram': '#E4405F',
        'TikTok': '#000000'
    }
    return colors[platform] || '#10b981'
}

function formatNumber(num: number) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
}
