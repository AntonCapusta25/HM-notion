export const runtime = 'edge';

export async function POST() {
    try {
        console.log('🚀 Triggering Trend Radar pipeline via GitHub Actions...');

        // Trigger GitHub Actions workflow
        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const GITHUB_REPO = process.env.GITHUB_REPO || 'AntonCapusta25/HM-notion';

        if (!GITHUB_TOKEN) {
            return new Response(JSON.stringify({
                success: false,
                error: 'GitHub token not configured. Set GITHUB_TOKEN in Netlify env vars.'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const response = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/daily-trend-radar.yml/dispatches`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ref: 'main'
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
        }

        return new Response(JSON.stringify({
            success: true,
            message: 'Pipeline triggered via GitHub Actions! Check your email in 5-10 minutes.'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error in trigger endpoint:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
