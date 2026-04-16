const express = require('express');
const { exec, spawn } = require('child_process');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const app = express();
const DB_PATH = path.resolve(__dirname, 'strategy_intelligence/data/local_intelligence.db');
const PORT = 3001;

app.use(express.json());

// Enable CORS for frontend
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) console.error("Database connection error:", err.message);
});
db.configure("busyTimeout", 10000); // 10s busy timeout

// 7. Get Market Keywords
app.get('/api/intelligence/keywords', (req, res) => {
    const sessionId = req.query.sessionId;
    let query = "SELECT * FROM market_keywords";
    const params = [];
    if (sessionId) {
        query += " WHERE session_id = ?";
        params.push(sessionId);
    }
    query += " ORDER BY search_volume_estimate DESC";
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

const DB_FILE = path.resolve(__dirname, 'strategy_reports_db.json');
// Init DB
if (!require('fs').existsSync(DB_FILE)) require('fs').writeFileSync(DB_FILE, JSON.stringify([]));

app.post('/api/trigger-trend-radar', (req, res) => {
    console.log('🚀 Triggering Trend Radar pipeline...');
    const projectRoot = path.resolve(__dirname);
    const command = `cd ${projectRoot}/trend_engine && python3 main.py --run > /tmp/trend-radar.log 2>&1 &`;
    exec(command, (error) => {
        if (error) console.error('Pipeline start error:', error);
        else console.log('✅ Pipeline started successfully');
    });
    res.json({ success: true, message: 'Pipeline started!' });
});

// --- STRATEGY INTELLIGENCE ROUTES (LOCAL MOCK FOR SUPABASE) ---
app.get('/api/strategy', (req, res) => {
    res.json(JSON.parse(require('fs').readFileSync(DB_FILE)));
});

app.post('/api/strategy/create', (req, res) => {
    const { topic } = req.body;
    const db = JSON.parse(require('fs').readFileSync(DB_FILE));
    const newReport = { id: Date.now().toString(), created_at: new Date().toISOString(), topic, status: 'draft', strategy_data: {}, pdf_url: null };
    db.unshift(newReport);
    require('fs').writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    res.json(newReport);
});

// --- NEW INTELLIGENCE ENGINE ROUTES (SQLITE PROXY) ---
app.get('/api/intelligence/pain-points', (req, res) => {
    const sessionId = req.query.sessionId;
    let query = "SELECT * FROM competitor_pain_points";
    const params = [];
    if (sessionId) {
        query += " WHERE session_id = ?";
        params.push(sessionId);
    }
    query += " ORDER BY opportunity_score DESC, scraped_at DESC";
    
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.get('/api/intelligence/unmet-needs', (req, res) => {
    const sessionId = req.query.sessionId;
    let query = "SELECT * FROM unmet_customer_needs";
    const params = [];
    if (sessionId) {
        query += " WHERE session_id = ?";
        params.push(sessionId);
    }
    query += " ORDER BY validation_score DESC, created_at DESC";
    
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.get('/api/intelligence/ux-analysis', (req, res) => {
    const sessionId = req.query.sessionId;
    let query = "SELECT * FROM competitor_ux_analysis";
    const params = [];
    if (sessionId) {
        query += " WHERE session_id = ?";
        params.push(sessionId);
    }
    query += " ORDER BY analyzed_at DESC";
    
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.get('/api/intelligence/market-catalog', (req, res) => {
    const sessionId = req.query.sessionId;
    let query = "SELECT * FROM thuisbezorgd_comprehensive";
    const params = [];
    if (sessionId) {
        query += " WHERE session_id = ?";
        params.push(sessionId);
    }
    query += " ORDER BY scraped_at DESC LIMIT 100";
    
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// --- STRATEGIC SESSIONS API ---
app.get('/api/intelligence/sessions', (req, res) => {
    db.all("SELECT id, name, intent, ai_plan, status, created_at, updated_at FROM strategic_sessions ORDER BY updated_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.get('/api/intelligence/sessions/:id', (req, res) => {
    db.get("SELECT * FROM strategic_sessions WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Session not found" });
        res.json(row);
    });
});

app.post('/api/intelligence/sessions', (req, res) => {
    const { id, name, intent, ai_plan } = req.body;
    const now = new Date().toISOString();
    
    db.run(`
        INSERT INTO strategic_sessions (id, name, intent, ai_plan, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name = COALESCE(excluded.name, name),
            intent = COALESCE(excluded.intent, intent),
            ai_plan = COALESCE(excluded.ai_plan, ai_plan),
            updated_at = excluded.updated_at
    `, [id, name, intent, JSON.stringify(ai_plan), now, now], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id });
    });
});

app.delete('/api/intelligence/sessions/:id', (req, res) => {
    db.run("DELETE FROM strategic_sessions WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.get('/api/intelligence/holidays', (req, res) => {
    const sessionId = req.query.sessionId;
    let query = "SELECT * FROM market_holidays";
    const params = [];
    if (sessionId) {
        query += " WHERE session_id = ?";
        params.push(sessionId);
    }
    query += " ORDER BY date ASC";
    
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.get('/api/intelligence/pricing', (req, res) => {
    const sessionId = req.query.sessionId;
    let query = "SELECT * FROM competitor_pricing";
    const params = [];
    if (sessionId) {
        query += " WHERE session_id = ?";
        params.push(sessionId);
    }
    query += " ORDER BY scraped_at DESC";
    
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.get('/api/intelligence/strategies', (req, res) => {
    const sessionId = req.query.sessionId;
    let query = "SELECT * FROM intelligence_insights";
    const params = [];
    if (sessionId) {
        query += " WHERE session_id = ?";
        params.push(sessionId);
    }
    query += " ORDER BY created_at DESC";
    
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.get('/api/intelligence/campaigns', (req, res) => {
    const sessionId = req.query.sessionId;
    let query = "SELECT m.*, i.title as strategy_title FROM marketing_campaigns m JOIN intelligence_insights i ON m.insight_id = i.id";
    const params = [];
    if (sessionId) {
        query += " WHERE m.session_id = ?";
        params.push(sessionId);
    }
    query += " ORDER BY m.id DESC"; // Modified Order as 'created_at' might be missing on campaigns
    
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// Intelligence Dashboard Endpoints
app.get('/api/intelligence/full-report', (req, res) => {
    const reportDir = path.join(__dirname, 'strategy_intelligence/exports');
    // Find the latest PDF in the directory
    if (!fs.existsSync(reportDir)) return res.json({ status: 'not_generated' });
    
    const files = fs.readdirSync(reportDir).filter(f => f.endsWith('.pdf'));
    if (files.length === 0) return res.json({ status: 'not_generated' });
    
    // Sort by name (which has date) or mtime
    const latest = files.sort().reverse()[0];
    res.json({ 
        status: 'ready', 
        filename: latest,
        url: `/api/intelligence/download-report?file=${latest}`
    });
});

app.get('/api/intelligence/download-report', (req, res) => {
    const fileName = req.query.file;
    const filePath = path.join(__dirname, 'strategy_intelligence/exports', fileName);
    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).send('Report not found');
    }
});

app.post('/api/intelligence/trigger-scraper/:suite', (req, res) => {
    const suite = isNaN(req.params.suite) ? req.params.suite : parseInt(req.params.suite);
    const isSync = req.body.sync === true;
    
    let cmd = '';
    const projectRoot = path.resolve(__dirname);
    
    // Parse target meals if provided from frontend
    const meals = req.body.meals ? `"${req.body.meals.join(',')}"` : '""';
    const intent = req.body.intent ? `--intent "${req.body.intent.replace(/"/g, '\\"')}"` : "";
    const sessionId = req.body.sessionId ? `--session_id "${req.body.sessionId}"` : "";
    
    // NEW: Contextual params from AI Orchestrator
    const extraParams = req.body.params || {};
    let contextualFlags = "";
    if (extraParams.themes && Array.isArray(extraParams.themes)) {
        contextualFlags += ` --themes "${extraParams.themes.join(',')}"`;
    }
    if (extraParams.focus) {
        contextualFlags += ` --focus "${extraParams.focus.replace(/"/g, '\\"')}"`;
    }
    if (extraParams.audience) {
        contextualFlags += ` --audience "${extraParams.audience.replace(/"/g, '\\"')}"`;
    }

    if (suite === 1) {
        cmd = `cd ${projectRoot} && PYTHONPATH=. python3 strategy_intelligence/scrapers/reviews.py ${sessionId} ${contextualFlags}`;
    } else if (suite === 4) {
        cmd = `cd ${projectRoot} && PYTHONPATH=. python3 strategy_intelligence/scrapers/social.py ${sessionId} ${contextualFlags}`;
    } else if (suite === 2) {
        cmd = `cd ${projectRoot} && PYTHONPATH=. python3 strategy_intelligence/scrapers/ux_analysis.py --session_id "${req.body.sessionId || ''}" ${contextualFlags}`;
    } else if (suite === 3) {
        cmd = `cd ${projectRoot} && PYTHONPATH=. python3 strategy_intelligence/scrapers/pricing_analysis.py ${meals} ${sessionId} ${contextualFlags}`;
    } else if (suite === 6) {
        cmd = `cd ${projectRoot} && PYTHONPATH=. python3 strategy_intelligence/scrapers/thuisbezorgd_actowiz_parity.py ${meals} ${sessionId} ${contextualFlags}`;
    } else if (suite === 7) {
        cmd = `cd ${projectRoot} && PYTHONPATH=. python3 -c "from strategy_intelligence.scrapers.holidays import collect_layer_7; collect_layer_7(session_id='${req.body.sessionId || ''}')" ${contextualFlags}`;
    } else if (suite === 8) {
        cmd = `cd ${projectRoot} && PYTHONPATH=. python3 strategy_intelligence/scrapers/keyword_research.py ${sessionId} ${contextualFlags}`;
    } else if (suite === "full-report") {
        cmd = `cd ${projectRoot} && PYTHONPATH=. python3 strategy_intelligence/agent/report_generator.py ${intent} ${sessionId} ${contextualFlags}`;
    } else if (suite === "strategy") {
        cmd = `cd ${projectRoot} && PYTHONPATH=. python3 strategy_intelligence/agent/strategy_generator.py --session_id "${req.body.sessionId || ''}" ${contextualFlags}`;
    } else if (suite === "campaign") {
        cmd = `cd ${projectRoot} && PYTHONPATH=. python3 strategy_intelligence/agent/campaign_generator.py --session_id "${req.body.sessionId || ''}" ${contextualFlags}`;
    }
    
    if (cmd) {
        if (!isSync) {
            res.json({ success: true, message: `Started Intelligence Engine Task: ${suite} (Background)` });
        }
        
        console.log(`🚀 Executing Intelligence Suite [${isSync ? 'SYNC' : 'ASYNC'}]: ${cmd}`);
        exec(cmd, {maxBuffer: 1024 * 1024 * 50}, (error, stdout, stderr) => {
            console.log(`\n--- PYTHON OUTPUT (Suite ${suite}) ---\n${stdout}\n-----------------------------------\n`);
            if (stderr) console.error(`--- PYTHON ERRORS (Suite ${suite}) ---\n${stderr}\n-----------------------------------\n`);
            
            if (error) {
                console.error(`❌ Suite ${suite} Failed:`, error);
                if (isSync) res.status(500).json({ success: false, error: error.message, suite });
            } else {
                console.log(`✅ Suite ${suite} Completed.`);
                if (isSync) res.json({ success: true, suite, stdout });
            }
        });
    } else {
        res.status(400).json({ error: "Invalid suite" });
    }
});

// --- INTENT-DRIVEN ORCHESTRATION ---
app.post('/api/intelligence/analyze-intent', (req, res) => {
    const { intent } = req.body;
    if (!intent) return res.status(400).json({ error: 'Intent is required' });

    console.log(`🧠 Analyzing Strategic Intent: "${intent}"`);
    const projectRoot = path.resolve(__dirname);
    const cmd = `cd ${projectRoot} && PYTHONPATH=. python3 strategy_intelligence/agent/intent_agent.py "${intent}"`;
    
    const pythonProcess = spawn('python3', [
        '-u', // Unbuffered output
        'strategy_intelligence/agent/intent_agent.py', 
        intent
    ], {
        cwd: projectRoot,
        env: { ...process.env, PYTHONPATH: '.' }
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
        // Forward real-time progress to console if needed
        const chunk = data.toString().trim();
        if (chunk && !chunk.startsWith('{')) {
            console.log(`  [Orchestrator]: ${chunk}`);
        }
    });

    pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error(`  [Orchestrator-Error]: ${data.toString().trim()}`);
    });

    pythonProcess.on('close', (code) => {
        if (code !== 0) {
            console.error(`Intent Analysis Error (code ${code}):`, stderr);
            return res.status(500).json({ error: 'Failed to analyze intent' });
        }
        try {
            // Find JSON in output (sometimes Gemini adds extra text)
            let jsonStr = stdout;
            if (stdout.includes('{')) {
                jsonStr = stdout.substring(stdout.indexOf('{'), stdout.lastIndexOf('}') + 1);
            }
            const plan = JSON.parse(jsonStr);
            res.json(plan);
        } catch (e) {
            console.error('JSON Parse Error:', e, stdout);
            res.status(500).json({ error: 'Invalid response from Intent Agent' });
        }
    });
});

app.listen(PORT, () => {
    console.log(`✅ API server running on http://localhost:${PORT}`);
});
