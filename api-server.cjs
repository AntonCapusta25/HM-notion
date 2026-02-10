const express = require('express');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = 3001;

app.post('/api/trigger-trend-radar', (req, res) => {
    console.log('🚀 Triggering Trend Radar pipeline...');

    const projectRoot = path.resolve(__dirname);
    const command = `cd ${projectRoot}/trend_engine && python3 main.py --run > /tmp/trend-radar.log 2>&1 &`;

    exec(command, (error) => {
        if (error) {
            console.error('Pipeline start error:', error);
        } else {
            console.log('✅ Pipeline started successfully');
        }
    });

    res.json({
        success: true,
        message: 'Pipeline started! Check your email in 5-10 minutes.'
    });
});

app.listen(PORT, () => {
    console.log(`✅ API server running on http://localhost:${PORT}`);
});
