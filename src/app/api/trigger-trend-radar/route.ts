export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);

        console.log('🚀 Triggering Trend Radar pipeline...');

        // Get the project root
        const projectRoot = process.cwd();

        // Run the pipeline in the background (don't wait for completion)
        exec(`cd ${projectRoot}/trend_engine && python3 main.py --run > /tmp/trend-radar.log 2>&1 &`, (error) => {
            if (error) {
                console.error('Pipeline start error:', error);
            } else {
                console.log('Pipeline started successfully');
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
