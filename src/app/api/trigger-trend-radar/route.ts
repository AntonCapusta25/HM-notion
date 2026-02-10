export async function POST() {
    try {
        // Only allow on localhost
        const isDev = process.env.NODE_ENV === 'development';

        if (!isDev) {
            return new Response(JSON.stringify({
                success: false,
                error: 'This endpoint only works on localhost. Use GitHub Actions manual trigger for production.'
            }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log('🚀 Triggering Trend Radar pipeline...');

        const { exec } = await import('child_process');
        const projectRoot = process.cwd();

        // Run the pipeline in the background
        exec(`cd ${projectRoot}/trend_engine && python3 main.py --run > /tmp/trend-radar.log 2>&1 &`, (error) => {
            if (error) {
                console.error('Pipeline start error:', error);
            } else {
                console.log('✅ Pipeline started successfully');
            }
        });

        return new Response(JSON.stringify({
            success: true,
            message: 'Pipeline started! Check your email in 5-10 minutes.'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
