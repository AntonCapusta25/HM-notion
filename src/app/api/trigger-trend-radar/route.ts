import { exec } from 'child_process';

export async function POST() {
    try {
        console.log('🚀 Triggering Trend Radar pipeline...');

        // Run the Python pipeline in the background
        const projectRoot = process.cwd();
        const command = `cd ${projectRoot}/trend_engine && python3 main.py --run`;

        // Execute the command without waiting for it to complete
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error('Pipeline error:', error);
                return;
            }
            console.log('Pipeline output:', stdout);
            if (stderr) console.error('Pipeline stderr:', stderr);
        });

        return new Response(JSON.stringify({
            success: true,
            message: 'Pipeline triggered successfully. Check your email in 5-10 minutes.'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error triggering pipeline:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to trigger pipeline'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
