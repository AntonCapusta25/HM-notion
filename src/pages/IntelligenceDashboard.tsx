import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, RefreshCw, Zap, ServerCrash, BrainCircuit, Mail, MonitorSmartphone, Video, Megaphone, ChevronDown, ChevronUp, ChevronRight, Database, Calendar, FileText, CheckCircle, Download, Clock } from "lucide-react";
import { toast } from 'sonner';
import { Layout } from '../components/Layout';

export default function IntelligenceDashboard() {
  const [painPoints, setPainPoints] = useState<any[]>([]);
  const [unmetNeeds, setUnmetNeeds] = useState<any[]>([]);
  const [uxAnalyses, setUxAnalyses] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any[]>([]);
  const [strategies, setStrategies] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [marketCatalog, setMarketCatalog] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [reportState, setReportState] = useState<{status: string, filename?: string, url?: string}>({status: 'none'});
  const [targetMeals, setTargetMeals] = useState<string>("Pizza, Biryani, Chicken Masala, Tacos");
  const [loading, setLoading] = useState(true);
  const [intent, setIntent] = useState("");
  const [aiPlan, setAiPlan] = useState<{reasoning: string, pipeline: (number|string)[]} | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Session Management State
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const [openSections, setOpenSections] = useState({
    intent: true,
    painPoints: false,
    unmetNeeds: false,
    uxAnalyses: false,
    pricing: false,
    holidays: false,
    catalog: false,
    strategies: false,
    campaigns: false,
    keywords: false,
    report: true
  });

  const fetchSessions = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/intelligence/sessions');
      const data = await res.json();
      setSessions(data);
    } catch (e) {
      console.error("Failed to fetch sessions", e);
    }
  };

  const createNewSession = () => {
    setCurrentSessionId(null);
    setIntent("");
    setAiPlan(null);
    toast.success("Started new Research Session");
  };

  const loadSession = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:3001/api/intelligence/sessions/${id}`);
      const data = await res.json();
      setCurrentSessionId(data.id);
      setIntent(data.intent || "");
      setAiPlan(data.ai_plan ? JSON.parse(data.ai_plan) : null);
      toast.info(`Loaded Session: ${data.name || 'Untitled'}`);
    } catch (e) {
      toast.error("Failed to load session");
    }
  };

  const saveSession = async (updatedPlan?: any) => {
    const sessionId = currentSessionId || `session_${Date.now()}`;
    const sessionData = {
      id: sessionId,
      name: intent.slice(0, 30) + (intent.length > 30 ? "..." : ""),
      intent,
      ai_plan: updatedPlan || aiPlan
    };

    try {
      await fetch('http://localhost:3001/api/intelligence/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      });
      if (!currentSessionId) setCurrentSessionId(sessionId);
      fetchSessions();
    } catch (e) {
      console.error("Failed to save session", e);
    }
  };

  const analyzeIntent = async () => {
    if (!intent.trim()) return toast.error("Please enter a strategic intent first.");
    setIsAnalyzing(true);
    const toastId = toast.loading("AI is analyzing strategic intent...");
    try {
      const res = await fetch('http://localhost:3001/api/intelligence/analyze-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiPlan(data);
      toast.success("AI Strategy Plan Generated!", { id: toastId });
      
      // Auto-save session after analysis
      await saveSession(data);
    } catch (e) {
      toast.error("Failed to analyze intent", { id: toastId });
    }
    setIsAnalyzing(false);
  };

  const executeAiPlan = async () => {
    if (!aiPlan) return;
    setIsAnalyzing(true); // Re-use analyzing state for execution tracking
    toast.info("Executing AI-Optimized Pipeline sequentially...");
    
    try {
      for (const task of aiPlan.pipeline) {
        if (!task) continue;
        // Pass sync: true and task params to ensure we wait for completion
        const suiteId = (task && typeof task === 'object') ? (task as any).id : task;
        const params = (task && typeof task === 'object') ? (task as any).params : {};
        await triggerScraper(suiteId, true, params);
        // Small delay as extra safety for DB settlement
        await new Promise(r => setTimeout(r, 1000));
      }
      toast.success("AI Strategic Pipeline Fully Executed!");
    } catch (e) {
      toast.error("Pipeline interrupted or failed.");
    } finally {
      setIsAnalyzing(false);
      setAiPlan(null);
      setIntent("");
      // Refresh data at the end
      fetchIntelligence();
    }
  };

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const fetchIntelligence = async () => {
    if (!currentSessionId) {
      setPainPoints([]);
      setUnmetNeeds([]);
      setUxAnalyses([]);
      setPricing([]);
      setStrategies([]);
      setCampaigns([]);
      setMarketCatalog([]);
      setHolidays([]);
      setKeywords([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const q = `?sessionId=${currentSessionId}`;
      const [ppRes, unRes, uxRes, priceRes, stratRes, campRes, catRes, holRes, keyRes] = await Promise.all([
        fetch(`http://localhost:3001/api/intelligence/pain-points${q}`),
        fetch(`http://localhost:3001/api/intelligence/unmet-needs${q}`),
        fetch(`http://localhost:3001/api/intelligence/ux-analysis${q}`),
        fetch(`http://localhost:3001/api/intelligence/pricing${q}`),
        fetch(`http://localhost:3001/api/intelligence/strategies${q}`),
        fetch(`http://localhost:3001/api/intelligence/campaigns${q}`),
        fetch(`http://localhost:3001/api/intelligence/market-catalog${q}`),
        fetch(`http://localhost:3001/api/intelligence/holidays${q}`),
        fetch(`http://localhost:3001/api/intelligence/keywords${q}`)
      ]);
      const getJson = async (res: Response) => {
        const d = await res.json();
        return Array.isArray(d) ? d : [];
      };

      setPainPoints(await getJson(ppRes));
      setUnmetNeeds(await getJson(unRes));
      setUxAnalyses(await getJson(uxRes));
      setPricing(await getJson(priceRes));
      setStrategies(await getJson(stratRes));
      setCampaigns(await getJson(campRes));
      setMarketCatalog(await getJson(catRes));
      setHolidays(await getJson(holRes));
      setKeywords(await getJson(keyRes));
    } catch (e) {
      console.error(e);
      // Only toast on manual refresh or first load to avoid spamming on interval
    }
    setLoading(false);
  };

  const fetchReportStatus = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/intelligence/full-report');
      const data = await res.json();
      setReportState(data);
    } catch (e) {
      console.error("Report status check failed", e);
    }
  };

  const triggerScraper = async (suite: number | string, sync: boolean = false, extraParams: any = {}) => {
    const toastId = toast.loading(`${sync ? 'Executing' : 'Initiating'} Suite ${suite} Pipeline...`);
    try {
      const mealArr = targetMeals.split(',').map(s => s.trim()).filter(Boolean);
      const res = await fetch(`http://localhost:3001/api/intelligence/trigger-scraper/${suite}`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          meals: mealArr,
          intent: intent,
          sessionId: currentSessionId,
          sync: sync,
          params: extraParams
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Suite ${suite} failed`);
      }

      const messages: any = {
        'strategy': 'AI Strategy Generation Completed!',
        'campaign': 'Marketing Assets Generated!',
        'full-report': 'Executive Report Compiled!'
      };
      
      toast.success(messages[suite] || `Miner Task ${suite} ${sync ? 'Finished' : 'Triggered'}.`, { id: toastId });
      
      // If we are NOT in a global sync execution, refresh intelligence after a background task starts
      if (!sync) {
        setTimeout(fetchIntelligence, 5000);
      }
    } catch (e: any) {
      toast.error(`Error in Suite ${suite}: ${e.message}`, { id: toastId });
      throw e; // Re-throw to interrupt sequential execution if needed
    }
  };

  useEffect(() => {
    fetchIntelligence();
    fetchReportStatus();
    fetchSessions();
  }, [currentSessionId]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchIntelligence();
      fetchReportStatus();
    }, 15000);
    return () => clearInterval(interval);
  }, [currentSessionId]);

  const deleteSession = async (id: string) => {
    if (!window.confirm("Delete this session permanentely?")) return;
    try {
      await fetch(`http://localhost:3001/api/intelligence/sessions/${id}`, { method: 'DELETE' });
      if (currentSessionId === id) createNewSession();
      fetchSessions();
    } catch (e) {
      toast.error("Failed to delete session");
    }
  };

  return (
    <Layout>
      <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-6 md:-m-10">
        {/* Sidebar */}
        <div className="w-80 bg-gray-50 dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col shrink-0">
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <Button 
              className="w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-800 hover:bg-gray-100 font-bold py-6 rounded-xl shadow-sm"
              onClick={createNewSession}
            >
              <Zap className="w-4 h-4 mr-2 text-homemade-orange" /> New Research Session
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4 px-2">Previous Research</h3>
            {sessions.map((s) => (
              <div 
                key={s.id}
                onClick={() => loadSession(s.id)}
                className={`group p-4 rounded-xl cursor-pointer transition-all border ${currentSessionId === s.id ? 'bg-white dark:bg-gray-900 border-homemade-orange shadow-md' : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-900/50'}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm truncate ${currentSessionId === s.id ? 'text-homemade-orange' : 'text-gray-700 dark:text-gray-300'}`}>
                      {s.name || 'Untitled Discovery'}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1 font-medium">{new Date(s.updated_at).toLocaleDateString()}</p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                  >
                    <AlertTriangle className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Workspace */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 bg-white dark:bg-gray-950/20 backdrop-blur-sm relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-3 tracking-tight">
            <div className="p-2 bg-homemade-orange/10 rounded-lg">
              <Zap className="text-homemade-orange w-8 h-8" />
            </div>
            Intelligence Engine
          </h1>
          <p className="text-gray-500 mt-2 text-sm font-medium">Continuous Competitive Pain Point & Unmet Need Tracking</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="border-red-200 hover:bg-red-50 hover:text-red-700 shadow-sm transition-all" onClick={() => triggerScraper(1)}>
            <RefreshCw className="w-4 h-4 mr-2 text-red-500" /> 1. Mine Competitors
          </Button>
          <Button variant="outline" className="border-blue-200 hover:bg-blue-50 hover:text-blue-700 shadow-sm transition-all" onClick={() => triggerScraper(4)}>
            <TrendingUp className="w-4 h-4 mr-2 text-blue-500" /> 2. Mine Reddit
          </Button>
          <Button variant="outline" className="border-fuchsia-200 hover:bg-fuchsia-50 hover:text-fuchsia-700 shadow-sm transition-all" onClick={() => triggerScraper(2)}>
            <MonitorSmartphone className="w-4 h-4 mr-2 text-fuchsia-500" /> 3. Mine UX
          </Button>
          <Button variant="outline" className="border-amber-200 hover:bg-amber-50 hover:text-amber-700 shadow-sm transition-all" onClick={() => triggerScraper(3)}>
            <Zap className="w-4 h-4 mr-2 text-amber-500" /> 4. Mine Pricing
          </Button>
          <Button variant="outline" className="border-purple-200 hover:bg-purple-50 hover:text-purple-700 shadow-sm transition-all" onClick={() => triggerScraper(6)}>
            <Database className="w-4 h-4 mr-2 text-purple-500" /> 5. Mine Catalog
          </Button>
          <Button variant="outline" className="border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700 shadow-sm transition-all" onClick={() => triggerScraper(7)}>
            <Calendar className="w-4 h-4 mr-2 text-cyan-500" /> 6. Predict Holidays
          </Button>
          <Button variant="outline" className="border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 shadow-sm transition-all" onClick={() => triggerScraper(8)}>
            <TrendingUp className="w-4 h-4 mr-2 text-emerald-500" /> 7. Mine Keywords
          </Button>
          <Button className="bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-500/20 text-white transition-all ml-4" onClick={() => triggerScraper('strategy')}>
            <BrainCircuit className="w-4 h-4 mr-2" /> 8. Synthesize Strategies
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 text-white transition-all" onClick={() => triggerScraper('campaign')}>
            <Zap className="w-4 h-4 mr-2" /> 9. Generate Campaigns
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 text-white transition-all" onClick={() => triggerScraper(999)}>
            <Zap className="w-4 h-4 mr-2" /> Run All Miners
          </Button>
        </div>
      </div>

      {/* Strategic Intent & AI Orchestration */}
      <Card className="shadow-xl bg-white dark:bg-gray-900 border-t-4 border-t-homemade-orange rounded-2xl overflow-hidden">
        <CardHeader 
          className="bg-homemade-orange/5 cursor-pointer flex flex-row items-center justify-between"
          onClick={() => toggleSection('intent')}
        >
          <div className="flex items-center gap-4">
            <div className="p-2 bg-homemade-orange/10 rounded-lg">
              <BrainCircuit className="text-homemade-orange w-6 h-6" />
            </div>
            <CardTitle className="text-2xl font-black tracking-tight">AI Strategic Intent Orchestrator</CardTitle>
          </div>
          {openSections.intent ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </CardHeader>
        {openSections.intent && (
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-sm font-black uppercase text-gray-400 tracking-widest">Global Strategic Intent</label>
                <textarea 
                  className="w-full h-32 p-4 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 focus:border-homemade-orange outline-none transition-all font-medium text-lg leading-relaxed"
                  placeholder="e.g., I want to focus on high-end private chefs in Amsterdam West. Find their pricing gaps and mine keyword intent..."
                  value={intent}
                  onChange={(e) => setIntent(e.target.value)}
                />
                <Button 
                  className="w-full bg-homemade-orange hover:bg-orange-600 text-white font-bold py-6 rounded-xl shadow-lg shadow-orange-500/20"
                  onClick={analyzeIntent}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : <Zap className="w-5 h-5 mr-2" />}
                  Analyze & Design Strategy Plan
                </Button>
              </div>

              <div className="bg-gray-50 dark:bg-gray-950 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center min-h-[200px]">
                {!aiPlan ? (
                  <div className="text-center space-y-3 opacity-40">
                    <BrainCircuit className="w-12 h-12 mx-auto" />
                    <p className="font-bold">AI Plan Draft Area</p>
                    <p className="text-sm max-w-[250px]">Enter your intent and click 'Analyze' to generate a bespoke execution roadmap.</p>
                  </div>
                ) : (
                  <div className="w-full space-y-4">
                    <div className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-homemade-orange/20 shadow-sm relative">
                      <div className="absolute -top-3 -left-3 bg-homemade-orange text-white text-[10px] font-black px-2 py-1 rounded shadow-md uppercase tracking-widest">AI Reasoning</div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{aiPlan.reasoning}"</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-2">Recommended Pipeline</span>
                      <div className="flex flex-wrap gap-2">
                        {aiPlan.pipeline?.map((step: any, i) => (
                          <Badge key={i} className="bg-purple-100 text-purple-700 border border-purple-200 px-3 py-1">
                            {typeof step === 'object' && step !== null ? step.id : (typeof step === 'number' ? `Suite ${step}` : step)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button 
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-500/20 mt-4"
                      onClick={executeAiPlan}
                    >
                      <Zap className="w-4 h-4 mr-2" /> Execute AI-Optimized Strategy
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Pain Points */}
        <Card className="shadow-lg border-red-100/50 hover:shadow-xl transition-all duration-300">
          <CardHeader 
            className="bg-gradient-to-r from-red-50 to-white dark:from-red-950/20 dark:to-gray-900 rounded-t-xl border-b border-red-100/50 cursor-pointer flex flex-row items-center justify-between"
            onClick={() => toggleSection('painPoints')}
          >
            <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2 text-xl">
              <ServerCrash className="w-6 h-6" /> Competitor Failures
            </CardTitle>
            {openSections.painPoints ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
          </CardHeader>
          {openSections.painPoints && (
            <CardContent className="p-0 overflow-y-auto max-h-[750px] custom-scrollbar">
              {painPoints.length === 0 && <div className="p-12 text-center text-gray-400 flex flex-col items-center"><ServerCrash className="w-12 h-12 mb-4 opacity-50"/>No failures captured yet. Initiate the Competitor Miner above.</div>}
              {painPoints.map((pp, idx) => (
                <div key={idx} className="p-6 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-2 items-center">
                      <Badge variant={pp.severity === 'critical' ? 'destructive' : 'secondary'}>
                        {pp.competitor}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="border-red-500 text-red-600">
                      Opp Score: {pp.opportunity_score}
                    </Badge>
                  </div>
                  <h3 className="font-bold text-lg mb-2">{pp.specific_issue}</h3>
                  <div className="bg-red-50 p-3 rounded text-sm text-red-900 border border-red-100 italic mb-4">
                    "{pp.review_text}"
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>

        {/* Unmet Needs */}
        <Card className="shadow-lg border-blue-100/50 hover:shadow-xl transition-all duration-300">
          <CardHeader 
            className="bg-gradient-to-r from-blue-50 to-white dark:from-blue-950/20 dark:to-gray-900 rounded-t-xl border-b border-blue-100/50 cursor-pointer flex flex-row items-center justify-between"
            onClick={() => toggleSection('unmetNeeds')}
          >
            <CardTitle className="text-blue-700 dark:text-blue-400 flex items-center gap-2 text-xl">
              <TrendingUp className="w-6 h-6" /> Market Gaps
            </CardTitle>
            {openSections.unmetNeeds ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
          </CardHeader>
          {openSections.unmetNeeds && (
            <CardContent className="p-0 overflow-y-auto max-h-[750px] custom-scrollbar">
              {unmetNeeds.length === 0 && <div className="p-12 text-center text-gray-400 flex flex-col items-center"><TrendingUp className="w-12 h-12 mb-4 opacity-50"/>No market gaps discovered yet. Initiate the Reddit Signal Miner above.</div>}
              {unmetNeeds.map((need, idx) => (
                <div key={idx} className="p-6 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-2 items-center">
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 shadow-none border-none max-w-[120px] truncate">
                        {need.need_category}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="border-blue-500 text-blue-600">
                      Val: {need.validation_score}
                    </Badge>
                  </div>
                  <h3 className="font-bold text-lg mb-2">{need.unmet_need}</h3>
                  <div className="text-sm text-gray-600 mb-4 line-clamp-3">
                    {need.post_text}
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>

        {/* UX Friction Points */}
        <Card className="shadow-lg border-fuchsia-100/50 hover:shadow-xl transition-all duration-300">
          <CardHeader 
            className="bg-gradient-to-r from-fuchsia-50 to-white dark:from-fuchsia-950/20 dark:to-gray-900 rounded-t-xl border-b border-fuchsia-100/50 cursor-pointer flex flex-row items-center justify-between"
            onClick={() => toggleSection('uxAnalyses')}
          >
            <CardTitle className="text-fuchsia-700 dark:text-fuchsia-400 flex items-center gap-2 text-xl">
              <MonitorSmartphone className="w-6 h-6" /> UX Friction Points
            </CardTitle>
            {openSections.uxAnalyses ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
          </CardHeader>
          {openSections.uxAnalyses && (
            <CardContent className="p-0 overflow-y-auto max-h-[750px] custom-scrollbar">
              {uxAnalyses.length === 0 && <div className="p-12 text-center text-gray-400 flex flex-col items-center"><MonitorSmartphone className="w-12 h-12 mb-4 opacity-50"/>No UX intelligence gathered. Initiate the Competitor UX Miner above.</div>}
              {uxAnalyses.map((ux, idx) => {
                let weaknesses = [];
                try { weaknesses = JSON.parse(ux.ux_weaknesses || "[]"); } catch (e) {}
                return (
                  <div key={idx} className="p-6 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-2 items-center">
                        <Badge variant="outline" className="border-fuchsia-200 text-fuchsia-800 bg-fuchsia-50 font-bold uppercase tracking-wider text-[10px]">
                          {ux.competitor}
                        </Badge>
                        <span className="text-xs font-semibold text-gray-400">{ux.page_type}</span>
                      </div>
                      <Badge variant="outline" className="border-fuchsia-300 text-fuchsia-600 font-mono text-xs">
                        {ux.loading_time_ms}ms
                      </Badge>
                    </div>
                    <ul className="space-y-2 mt-2">
                      {weaknesses.slice(0, 3).map((w: string, i: number) => (
                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-fuchsia-500 shrink-0 mt-0.5" />
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </CardContent>
          )}
        </Card>

        {/* Pricing Intelligence */}
        <Card className="shadow-lg border-amber-100/50 hover:shadow-xl transition-all duration-300">
          <CardHeader 
            className="bg-gradient-to-r from-amber-50 to-white dark:from-amber-950/20 dark:to-gray-900 rounded-t-xl border-b border-amber-100/50 cursor-pointer flex flex-row items-center justify-between"
            onClick={() => toggleSection('pricing')}
          >
            <CardTitle className="text-amber-700 dark:text-amber-400 flex items-center gap-2 text-xl">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="22"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> 
              Pricing & Loyalty Engine
            </CardTitle>
            {openSections.pricing ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
          </CardHeader>
          {openSections.pricing && (
            <CardContent className="p-0 overflow-y-auto max-h-[750px] custom-scrollbar">
              {pricing.length === 0 && <div className="p-12 text-center text-gray-400 flex flex-col items-center"><svg className="w-12 h-12 mb-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="22"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>No pricing data loaded. Initiate the Competitor Pricing Miner above.</div>}
              {pricing.map((price, idx) => (
                  <div key={idx} className="p-6 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex gap-2 items-center">
                        <Badge variant="outline" className="border-amber-300 text-amber-800 bg-amber-50 font-bold uppercase tracking-wider text-[10px]">
                          {price.competitor}
                        </Badge>
                      </div>
                      {price.loyalty_program_active ? <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-none">Loyalty Active</Badge> : null}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="bg-white border border-gray-200 p-3 rounded-lg text-center">
                        <span className="block text-xs text-gray-400 uppercase font-black mb-1">Avg Meal</span>
                        <span className="text-xl font-bold text-gray-800">€{price.average_meal_price?.toFixed(2)}</span>
                      </div>
                      <div className="bg-white border border-gray-200 p-3 rounded-lg text-center">
                        <span className="block text-xs text-gray-400 uppercase font-black mb-1">Delivery</span>
                        <span className="text-xl font-bold text-gray-800">€{price.delivery_fee_avg?.toFixed(2)}</span>
                      </div>
                      <div className="bg-white border border-gray-200 p-3 rounded-lg text-center">
                        <span className="block text-xs text-gray-400 uppercase font-black mb-1">Platform</span>
                        <span className="text-xl font-bold text-gray-800">€{price.platform_fee?.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <div className="bg-amber-50/50 border border-amber-100 p-3 rounded text-sm text-gray-700 italic">
                      <span className="font-bold text-amber-700 block text-xs uppercase mb-1 not-italic">Promotional Logic</span>
                      {price.promotional_mechanics}
                    </div>
                  </div>
              ))}
            </CardContent>
          )}
        </Card>

        {/* Keyword Intelligence */}
        <Card className="shadow-lg border-emerald-100/50 hover:shadow-xl transition-all duration-300">
          <CardHeader 
            className="bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-950/20 dark:to-gray-900 rounded-t-xl border-b border-emerald-100/50 cursor-pointer flex flex-row items-center justify-between"
            onClick={() => toggleSection('keywords')}
          >
            <CardTitle className="text-emerald-700 dark:text-emerald-400 flex items-center gap-2 text-xl">
              <TrendingUp className="w-6 h-6" /> Keyword Intelligence
            </CardTitle>
            {openSections.keywords ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
          </CardHeader>
          {openSections.keywords && (
            <CardContent className="p-0 overflow-y-auto max-h-[750px] custom-scrollbar">
              {keywords.length === 0 && <div className="p-12 text-center text-gray-400 flex flex-col items-center"><TrendingUp className="w-12 h-12 mb-4 opacity-50"/>No keywords mined yet. Initiate Suite 8.</div>}
              {keywords.map((kw, idx) => (
                <div key={idx} className="p-4 border-b border-gray-100 hover:bg-gray-50 flex justify-between items-center transition-colors">
                  <div>
                    <h4 className="font-bold text-gray-900 leading-tight">{kw.keyword}</h4>
                    <span className="text-xs text-gray-400 uppercase font-bold tracking-tighter">{kw.intent_category || 'Commercial'}</span>
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="text-right">
                      <span className="block text-xs font-black text-gray-300 uppercase">Volume</span>
                      <span className="text-sm font-bold text-gray-700">{kw.search_volume_estimate || '0'}</span>
                    </div>
                    <Badge variant="outline" className={
                      kw.competition_index === 'High' ? 'border-red-200 text-red-700 bg-red-50' :
                      kw.competition_index === 'Medium' ? 'border-amber-200 text-amber-700 bg-amber-50' :
                      'border-green-200 text-green-700 bg-green-50'
                    }>
                      {kw.competition_index} Comp
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>

        {/* Actowiz Parity Market Catalog */}
        <Card className="shadow-lg border-purple-100/50 hover:shadow-xl transition-all duration-300">
          <CardHeader 
            className="bg-gradient-to-r from-purple-50 to-white dark:from-purple-950/20 dark:to-gray-900 rounded-t-xl border-b border-purple-100/50 cursor-pointer flex flex-row items-center justify-between"
            onClick={() => toggleSection('catalog')}
          >
            <CardTitle className="text-purple-700 dark:text-purple-400 flex items-center gap-2 text-xl">
              <Database className="w-6 h-6" /> Actowiz Parity Market Catalog
            </CardTitle>
            {openSections.catalog ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
          </CardHeader>
          {openSections.catalog && (
            <CardContent className="p-0 overflow-y-auto max-h-[750px] custom-scrollbar">
              {marketCatalog.length === 0 && <div className="p-12 text-center text-gray-400 flex flex-col items-center"><Database className="w-12 h-12 mb-4 opacity-50"/>No catalog data loaded. Initiate the Catalog Miner above.</div>}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                {marketCatalog.map((item, idx) => (
                  <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-4">
                      <h4 className="font-bold text-gray-900 dark:text-white text-base mb-1 truncate">{item.restaurant_name}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 truncate">{item.restaurant_address || 'Amsterdam'}</p>
                      <div className="flex justify-between items-center">
                        <Badge variant="outline" className="border-purple-300 text-purple-700 bg-purple-50/50">
                          €{(item.average_cost_for_two || 0).toFixed(2)} Avg
                        </Badge>
                        <span className="text-xs text-gray-400 capitalize">{item.cuisine_type || 'Takeaway'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* AI Strategies Synthesis */}
      <Card className="shadow-2xl border-purple-200/50 hover:shadow-3xl transition-all duration-300 mt-16 bg-gradient-to-br from-white to-purple-50/30 dark:from-gray-900 dark:to-purple-950/20 border-t-0 rounded-3xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-500"></div>
        <CardHeader 
          className="p-10 border-b border-purple-100/50 cursor-pointer flex flex-row items-center justify-between"
          onClick={() => toggleSection('strategies')}
        >
          <div>
            <CardTitle className="text-purple-900 dark:text-purple-100 flex items-center gap-4 text-4xl font-black tracking-tight">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-2xl shadow-inner text-purple-600 dark:text-purple-400">
                <BrainCircuit className="w-8 h-8" />
              </div>
              Base Foundation Strategies
            </CardTitle>
            <CardDescription className="text-lg mt-3 text-purple-800/70 dark:text-purple-200/70 font-medium max-w-3xl">
              High-leverage business directives synthesized by Local Llama 3.1. These strategies algorithmically target identified competitor weaknesses and market gaps.
            </CardDescription>
          </div>
          {openSections.strategies ? <ChevronDown className="w-8 h-8 text-purple-400" /> : <ChevronRight className="w-8 h-8 text-purple-400" />}
        </CardHeader>
        {openSections.strategies && (
          <CardContent className="p-10 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
            {strategies.length === 0 && (
              <div className="py-20 text-center text-purple-300 dark:text-purple-800 flex flex-col items-center">
                <BrainCircuit className="w-20 h-20 mb-6 opacity-20"/>
                <p className="text-xl font-medium tracking-wide">No strategies engineered yet.<br/>Ensure you have mined data, then press 'Synthesize Strategies'.</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {strategies.map((strat, idx) => (
                <div key={idx} className="bg-white dark:bg-gray-800 rounded-2xl border border-purple-100 dark:border-purple-900/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden group">
                  <div className="h-2 w-full bg-gradient-to-r from-purple-400 to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="p-8 h-full flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <span className="text-4xl font-black text-purple-100 dark:text-purple-900/50">0{idx+1}</span>
                        <Badge className="bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 px-3 py-1 uppercase tracking-widest text-[10px] font-bold">
                          {strat.insight_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50/50 shadow-sm">Impact: {strat.estimated_impact}</Badge>
                        <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50/50 shadow-sm">Effort: {strat.implementation_effort}</Badge>
                      </div>
                    </div>
                    
                    <h3 className="font-extrabold text-2xl mb-4 leading-tight tracking-tight text-gray-900 dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">
                      {strat.title}
                    </h3>
                    
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-[15px] mb-8">
                      {strat.description}
                    </p>
                    
                    <div className="mt-auto relative">
                      <div className="absolute -left-4 top-0 bottom-0 w-1 bg-purple-500 rounded-r-lg"></div>
                      <div className="ml-2 bg-purple-50/50 dark:bg-purple-900/20 p-5 rounded-xl border border-purple-100 dark:border-purple-800/50">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          <span className="font-black text-purple-900 dark:text-purple-300 text-xs uppercase tracking-widest">Execution Plan</span> 
                        </div>
                        <span className="text-purple-800 dark:text-purple-100 font-medium text-[15px] leading-relaxed block">{strat.recommended_action}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Omnichannel Marketing Campaigns */}
      <Card className="shadow-2xl border-emerald-100/50 hover:shadow-3xl transition-all duration-300 mt-12 mb-20 bg-white dark:bg-gray-900 border-t-8 border-t-emerald-500">
        <CardHeader 
          className="bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-950/20 dark:to-gray-900 rounded-t-xl border-b border-emerald-100/50 p-8 cursor-pointer flex flex-row items-center justify-between"
          onClick={() => toggleSection('campaigns')}
        >
          <div>
            <CardTitle className="text-emerald-700 dark:text-emerald-400 flex items-center gap-3 text-3xl font-black">
              <Zap className="w-10 h-10" /> Ready-to-Deploy Marketing Campaigns <Badge className="ml-3 bg-emerald-100 text-emerald-800 border border-emerald-300">Llama-3 Auto-Deployed</Badge>
            </CardTitle>
            <CardDescription className="font-medium text-lg mt-2 text-emerald-900/70">
              Explosive Ad Copy and Email Scripts automatically weaponized from the core strategies above.
            </CardDescription>
          </div>
          {openSections.campaigns ? <ChevronDown className="w-8 h-8 text-emerald-500" /> : <ChevronRight className="w-8 h-8 text-emerald-500" />}
        </CardHeader>
        {openSections.campaigns && (
          <CardContent className="p-0 divide-y divide-emerald-100 dark:divide-emerald-900/30">
            {campaigns.length === 0 && <div className="p-16 text-center text-gray-400 flex flex-col items-center"><Zap className="w-16 h-16 mb-4 opacity-30"/><p className="text-lg">No tactical campaigns loaded.<br/>Press 'Generate Ad Campaigns' to unleash Llama 3.</p></div>}
            {campaigns.map((camp, idx) => (
              <div key={idx} className="p-8 md:p-12 hover:bg-emerald-50/10 transition-all border-b border-emerald-100 dark:border-emerald-900/30 last:border-0 relative">
                <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-6 mb-10">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border border-emerald-200">Campaign {idx+1}</span>
                      <span className="text-gray-400 text-sm font-medium">Auto-generated by Llama 3</span>
                    </div>
                    <h3 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-3">{camp.campaign_name}</h3>
                    <p className="text-base font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                      <span className="font-bold text-gray-500 tracking-wider text-sm uppercase">Targeting:</span> {camp.target_audience}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-200 dark:border-gray-700 max-w-lg shadow-sm">
                    <span className="block text-xs text-emerald-600 uppercase font-bold mb-2">Based on Strategy</span>
                    <span className="text-base font-bold text-gray-800 dark:text-gray-200 leading-snug">{camp.strategy_title}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Ad Creatives & Social */}
                  <div className="space-y-8">
                    {/* Instagram/Social Conceptual Mock */}
                    {(() => {
                      let instaData: any = {};
                      try { instaData = JSON.parse(camp.instagram_post || "{}"); } catch (e) {}
                      const imageData = instaData.image_data || {};
                      
                      return (
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-md overflow-hidden group">
                          <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 via-pink-500 to-orange-400 rounded-full flex items-center justify-center shadow-inner">
                                <MonitorSmartphone className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-tight">Homemade Instagram</p>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">High-Fidelity Ready</p>
                              </div>
                            </div>
                            <Badge className="bg-homemade-orange text-white text-[10px] px-2 py-0 border-none">Visual Ready</Badge>
                          </div>
                          
                          <div className="p-6 space-y-4">
                            <div className="whitespace-pre-wrap font-sans text-gray-800 dark:text-gray-200 leading-relaxed text-[15px] font-medium">
                              {instaData.caption || camp.ad_copy}
                            </div>
                            <div className="text-homemade-orange text-xs font-bold">{instaData.hashtags}</div>
                            
                            {/* Image Data Wrapper - "Highsfield Gen" */}
                            <div className="mt-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-5 relative">
                              <div className="absolute -top-3 left-4 bg-gray-200 dark:bg-gray-700 text-[10px] font-black px-2 py-1 rounded uppercase tracking-tighter text-gray-600 dark:text-gray-400">image_data_wrapper</div>
                              <div className="space-y-3 mt-2">
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
                                  <div><span className="text-gray-400 font-bold uppercase block">Concept</span> <span className="text-gray-700 dark:text-gray-300 font-black">{imageData.concept_title || "Premium Candid Food"}</span></div>
                                  <div><span className="text-gray-400 font-bold uppercase block">Atmosphere</span> <span className="text-gray-700 dark:text-gray-300 font-black">{imageData.atmosphere || "Evening / Cozy"}</span></div>
                                </div>
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                                  <span className="text-gray-400 font-bold uppercase block text-[10px] mb-1">Scene Description</span>
                                  <p className="text-[12px] text-gray-600 dark:text-gray-400 leading-relaxed italic">"{imageData.scene_description || camp.visual_concept}"</p>
                                </div>
                                <div className="grid grid-cols-1 gap-2 text-[11px] bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                                  <div><span className="text-homemade-orange font-bold uppercase mr-2">Style:</span> {imageData.style || "Direct Flash / High Contrast"}</div>
                                  <div><span className="text-homemade-orange font-bold uppercase mr-2">Composition:</span> {imageData.composition || "Extreme Close-up"}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* TikTok / Reel Script Mock */}
                    {(() => {
                      let tiktokData: any = {};
                      try { tiktokData = JSON.parse(camp.tiktok_script || "{}"); } catch (e) {}
                      
                      return (
                        <div className="bg-black rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-100 transition-opacity">
                             <Video className="w-12 h-12 text-white" />
                           </div>
                           <div className="relative z-10 space-y-6">
                             <div className="flex items-center gap-3">
                               <Badge className="bg-pink-600 text-white border-none text-[10px] font-black px-3 py-1">TIKTOK / REEL</Badge>
                               <span className="text-pink-500 font-bold text-xs">9:16 Vertical</span>
                             </div>
                             
                             <div>
                               <span className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">The Hook</span>
                               <h4 className="text-2xl font-black text-white leading-tight">"{tiktokData.hook || 'Homemade Amsterdam'}"</h4>
                             </div>

                             <div className="bg-gray-900/50 rounded-xl p-5 border border-white/10">
                               <span className="block text-[10px] font-black text-pink-500 uppercase tracking-widest mb-3">Narrative & Visuals</span>
                               <div className="text-sm text-gray-300 leading-relaxed font-medium whitespace-pre-wrap italic">
                                 {tiktokData.script_markdown || camp.instagram_reel_script}
                               </div>
                             </div>

                             <div className="flex gap-4">
                               <div className="flex-1">
                                 <span className="block text-[9px] font-bold text-gray-600 uppercase mb-1">Visual Cues</span>
                                 <p className="text-[11px] text-gray-400">{tiktokData.visual_cues || "Rapid cuts, high energy"}</p>
                               </div>
                               <div className="flex-1">
                                 <span className="block text-[9px] font-bold text-gray-600 uppercase mb-1">Audio/Vibe</span>
                                 <p className="text-[11px] text-gray-400">{tiktokData.audio_vibe || "Dutch upbeat / Lo-fi"}</p>
                               </div>
                             </div>
                           </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Owned Media & Direct Marketing */}
                  <div className="space-y-8 flex flex-col">
                    {/* Landing Page Hero (Large Impact) */}
                    <div className="bg-homemade-orange rounded-3xl p-12 shadow-2xl flex flex-col justify-center items-center text-center relative overflow-hidden group min-h-[300px]">
                      <div className="absolute inset-0 bg-black opacity-10 mix-blend-overlay"></div>
                      <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-white/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
                      
                      < Megaphone className="w-10 h-10 text-white mb-6 relative z-10 animate-pulse" />
                      <h2 className="text-4xl md:text-5xl font-black leading-tight tracking-tighter text-white relative z-10 max-w-md">
                        "{camp.landing_page_hook || "Worth the ride."}"
                      </h2>
                      <p className="mt-4 text-white/80 font-bold uppercase tracking-widest text-xs relative z-10">Signature Landing Page Hook</p>
                      
                      <div className="mt-10 relative z-10">
                         <Button className="bg-white text-homemade-orange hover:bg-gray-100 font-black rounded-full px-10 py-7 text-lg shadow-xl shadow-black/20">
                            Get Early Access
                         </Button>
                      </div>
                    </div>

                    {/* High-Fidelity Email Mock */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg overflow-hidden flex flex-col flex-grow">
                      <div className="bg-gray-50 dark:bg-gray-800 p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                            <Mail className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">HOMEMADE Crew</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">To: Optimized Segment</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="border-emerald-200 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 font-black text-[10px]">READY TO SEND</Badge>
                      </div>
                      
                      <div className="p-8 border-b border-gray-50 dark:border-gray-800 bg-emerald-50/10">
                        <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Subject Line</span>
                        <h4 className="font-black text-2xl text-gray-900 dark:text-white leading-tight">
                          {camp.email_subject || camp.email_subject_line}
                        </h4>
                      </div>
                      
                      <div className="p-8 flex-grow">
                        <div className="whitespace-pre-wrap font-sans text-gray-700 dark:text-gray-300 leading-relaxed text-[15px] font-medium">
                          {camp.email_body}
                        </div>
                        
                        <div className="mt-10 pt-10 border-t border-gray-100 dark:border-gray-800 flex justify-center">
                          <Button className="bg-black dark:bg-white dark:text-black text-white font-black rounded-xl px-8 py-5">
                             Claim Your Dinner
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* Strategic Report Section */}
      <Card className="border-none shadow-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10 mb-20">
        <div 
          className="p-6 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          onClick={() => toggleSection('report')}
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-indigo-500/10 rounded-2xl">
              <FileText className="w-6 h-6 text-indigo-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">360° Executive Strategy Report</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Full AI market synthesis & roadmap</p>
            </div>
          </div>
          {openSections.report ? <ChevronUp className="w-6 h-6 text-gray-400" /> : <ChevronDown className="w-6 h-6 text-gray-400" />}
        </div>

        {openSections.report && (
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                  <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-100 mb-2">Automated Executive Synthesis</h3>
                  <p className="text-sm text-indigo-800/80 dark:text-indigo-200/80 leading-relaxed mb-4">
                    This task aggregates data from all 7 intelligence suites and runs 8 distinct Llama-3 synthesis passes to build a multi-page strategy roadmap.
                  </p>
                  <button 
                    onClick={() => triggerScraper('full-report')}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40 transition-all flex items-center justify-center space-x-2"
                  >
                    <Zap className="w-5 h-5 fill-current" />
                    <span>Compile Branded Strategy Report</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                {reportState.status === 'ready' ? (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">New Report Ready</p>
                      <p className="text-sm text-gray-500">{reportState.filename}</p>
                    </div>
                    <a 
                      href={`http://localhost:3001${reportState.url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center space-x-2 text-indigo-600 font-bold hover:underline"
                    >
                      <Download className="w-5 h-5" />
                      <span>Download Executive PDF</span>
                    </a>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto">
                      <Clock className="w-10 h-10 text-gray-400" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">No report generated for today yet.</p>
                    <p className="text-xs text-gray-400">Click compile to start the engine.</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      </div>
    </div>
    </Layout>
  );
}
