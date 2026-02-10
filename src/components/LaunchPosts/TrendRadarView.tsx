import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    TrendingUp,
    Calendar,
    Lightbulb,
    Users,
    ChefHat,
    Flame,
    RefreshCw,
    ExternalLink
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface ContentIdea {
    id: string;
    created_at: string;
    title: string;
    format: string;
    concept: string;
    execution_steps: string[];
    platform: string;
    why_it_works: string;
    cultural_tie_in: string | null;
    target_audience: 'B2C' | 'B2B';
    viral_score: number;
    week_number: number;
    year: number;
}

interface Event {
    id: string;
    created_at: string;
    event_name: string;
    event_type: string;
    event_date: string | null;
    opportunity: string;
    urgency: string;
    source: string;
}

export function TrendRadarView() {
    const [contentIdeas, setContentIdeas] = useState<ContentIdea[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch content ideas (last 50)
            const { data: ideasData, error: ideasError } = await supabase
                .from('content_ideas')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (ideasError) throw ideasError;
            setContentIdeas(ideasData || []);

            // Fetch upcoming events
            const { data: eventsData, error: eventsError } = await supabase
                .from('events_calendar')
                .select('*')
                .order('event_date', { ascending: true })
                .limit(20);

            if (eventsError) throw eventsError;
            setEvents(eventsData || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const b2cIdeas = contentIdeas.filter(idea => idea.target_audience === 'B2C');
    const b2bIdeas = contentIdeas.filter(idea => idea.target_audience === 'B2B');
    const topIdeas = [...contentIdeas].sort((a, b) => b.viral_score - a.viral_score).slice(0, 10);

    const filteredIdeas = activeTab === 'all' ? contentIdeas :
        activeTab === 'b2c' ? b2cIdeas :
            activeTab === 'b2b' ? b2bIdeas : topIdeas;

    return (
        <div className="h-full flex flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold flex items-center gap-2">
                        <TrendingUp className="w-8 h-8 text-red-500" />
                        Trend Radar Dashboard
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        AI-powered content ideas and cultural calendar. Updated daily at 9:30 AM CET.
                    </p>
                </div>
                <Button onClick={fetchData} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Ideas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{contentIdeas.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">B2C Ideas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{b2cIdeas.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">B2B Ideas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{b2bIdeas.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Events</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">{events.length}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content Ideas */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Lightbulb className="w-5 h-5 text-yellow-500" />
                                Content Ideas Library
                            </CardTitle>
                            <CardDescription>
                                AI-generated content ideas from daily trend analysis
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs value={activeTab} onValueChange={setActiveTab}>
                                <TabsList className="grid w-full grid-cols-4">
                                    <TabsTrigger value="all">All ({contentIdeas.length})</TabsTrigger>
                                    <TabsTrigger value="b2c">
                                        <Users className="w-4 h-4 mr-1" />
                                        B2C ({b2cIdeas.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="b2b">
                                        <ChefHat className="w-4 h-4 mr-1" />
                                        B2B ({b2bIdeas.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="top">
                                        <Flame className="w-4 h-4 mr-1" />
                                        Top 10
                                    </TabsTrigger>
                                </TabsList>

                                <ScrollArea className="h-[600px] mt-4">
                                    <div className="space-y-4 pr-4">
                                        {loading ? (
                                            <div className="text-center py-8 text-muted-foreground">
                                                Loading ideas...
                                            </div>
                                        ) : filteredIdeas.length === 0 ? (
                                            <div className="text-center py-8 text-muted-foreground">
                                                No ideas found. Run the daily workflow to generate ideas.
                                            </div>
                                        ) : (
                                            filteredIdeas.map((idea) => (
                                                <div
                                                    key={idea.id}
                                                    className="border rounded-lg p-4 space-y-3 hover:bg-slate-50 transition-colors"
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <Badge
                                                                variant="secondary"
                                                                className={
                                                                    idea.target_audience === 'B2C'
                                                                        ? 'bg-orange-100 text-orange-700'
                                                                        : 'bg-blue-100 text-blue-700'
                                                                }
                                                            >
                                                                {idea.target_audience}
                                                            </Badge>
                                                            <Badge variant="outline">{idea.platform}</Badge>
                                                            <Badge variant="outline">{idea.format}</Badge>
                                                            {idea.viral_score > 0 && (
                                                                <Badge className="bg-red-100 text-red-700">
                                                                    <Flame className="w-3 h-3 mr-1" />
                                                                    {idea.viral_score.toFixed(1)}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <span className="text-xs text-muted-foreground">
                                                            {new Date(idea.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>

                                                    <div>
                                                        <h3 className="font-semibold text-lg">{idea.title}</h3>
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            {idea.concept}
                                                        </p>
                                                    </div>

                                                    {idea.cultural_tie_in && (
                                                        <div className="bg-purple-50 p-3 rounded-md border border-purple-100">
                                                            <p className="text-sm text-purple-800">
                                                                <strong>Cultural Tie-in:</strong> {idea.cultural_tie_in}
                                                            </p>
                                                        </div>
                                                    )}

                                                    <div className="bg-green-50 p-3 rounded-md border border-green-100">
                                                        <p className="text-sm text-green-800 font-medium mb-2">
                                                            How to Execute:
                                                        </p>
                                                        <ol className="text-sm text-green-800 space-y-1 list-decimal list-inside">
                                                            {typeof idea.execution_steps === 'string'
                                                                ? JSON.parse(idea.execution_steps).map((step: string, i: number) => (
                                                                    <li key={i}>{step}</li>
                                                                ))
                                                                : idea.execution_steps.map((step, i) => (
                                                                    <li key={i}>{step}</li>
                                                                ))}
                                                        </ol>
                                                    </div>

                                                    <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                                                        <p className="text-sm text-blue-800">
                                                            <strong>Why it works:</strong> {idea.why_it_works}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </ScrollArea>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>

                {/* Events Calendar Sidebar */}
                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-purple-500" />
                                Cultural Calendar
                            </CardTitle>
                            <CardDescription>Upcoming events to leverage</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[600px]">
                                <div className="space-y-4 pr-4">
                                    {loading ? (
                                        <div className="text-center py-8 text-muted-foreground text-sm">
                                            Loading events...
                                        </div>
                                    ) : events.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground text-sm">
                                            No events found. Events will appear after the daily workflow runs.
                                        </div>
                                    ) : (
                                        events.map((event) => (
                                            <div
                                                key={event.id}
                                                className="border rounded-lg p-3 space-y-2 hover:bg-slate-50 transition-colors"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <h4 className="font-semibold text-sm">{event.event_name}</h4>
                                                    <Badge variant="outline" className="text-xs">
                                                        {event.event_type}
                                                    </Badge>
                                                </div>

                                                {event.event_date && (
                                                    <p className="text-xs text-muted-foreground">
                                                        📅 {new Date(event.event_date).toLocaleDateString()}
                                                    </p>
                                                )}

                                                <div className="bg-yellow-50 p-2 rounded border border-yellow-100">
                                                    <p className="text-xs text-yellow-800">
                                                        <strong>Opportunity:</strong> {event.opportunity}
                                                    </p>
                                                </div>

                                                <div className="bg-red-50 p-2 rounded border border-red-100">
                                                    <p className="text-xs text-red-800">
                                                        <strong>Act:</strong> {event.urgency}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
