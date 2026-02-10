import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    TrendingUp,
    Video,
    Instagram,
    Youtube,
    MessageCircle,
    Share2,
    Flame,
    ChefHat,
    Lightbulb
} from 'lucide-react';

export function TrendRadarView() {
    // Mock Data based on the user request
    const viralFormats = [
        {
            id: 1,
            title: "The 'Silent Review' but for Cooking",
            platform: "TikTok",
            score: 9.8,
            whyViral: "ASMR chopping + expressive facial reactions without speaking creates high engagement.",
            adaptation: "Film yourself silently prepping ingredients, using exaggerated expressions for 'good' (sweet potato) vs 'bad' (onion tears)."
        },
        {
            id: 2,
            title: "3-Ingredient Trader Joe's Hacks",
            platform: "Instagram",
            score: 9.5,
            whyViral: "Low barrier to entry + brand recognition. People save these for later.",
            adaptation: "Use 3 common pantry staples for a 'Neighborhood Gnocchi' hack."
        },
        {
            id: 3,
            title: "Grandma's Secret Weapon",
            platform: "YouTube Shorts",
            score: 9.2,
            whyViral: "Nostalgia + 'Secret Knowledge' hook.",
            adaptation: "Reveal a 'secret' spice blend you use for the Sunday Roast."
        }
    ];

    const contentHooks = [
        "Stop throwing away your [Ingredient]! 🛑",
        "The one thing my Italian grandmother taught me...",
        "POV: You're the chef at a sold-out dinner party"
    ];

    const neighborhoodIdeas = [
        {
            title: "The 'Leftover Rescue' Run",
            description: "Offer a discount to anyone who brings a reusable container."
        },
        {
            title: "Local Farmer Spotlight",
            description: "Feature the exact farm where your carrots came from today."
        }
    ];

    return (
        <div className="h-full flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-red-500" />
                        Daily Viral Radar
                    </h2>
                    <p className="text-muted-foreground">AI-analyzed trends for home chefs. Updated daily at 09:30.</p>
                </div>
                <Button>
                    <Flame className="w-4 h-4 mr-2" />
                    Refresh Radar
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Viral Formats Column */}
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Video className="w-5 h-5 text-purple-500" />
                                Top Viral Formats
                            </CardTitle>
                            <CardDescription>High-velocity trends adapted for your kitchen.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {viralFormats.map(trend => (
                                <div key={trend.id} className="border rounded-lg p-4 space-y-3 hover:bg-slate-50 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="bg-red-100 text-red-700">
                                                {trend.score} Viral Score
                                            </Badge>
                                            <Badge variant="outline">{trend.platform}</Badge>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="font-semibold text-lg">{trend.title}</h3>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            <span className="font-medium text-purple-600">Why it's viral: </span>
                                            {trend.whyViral}
                                        </p>
                                    </div>

                                    <div className="bg-green-50 p-3 rounded-md border border-green-100">
                                        <p className="text-sm text-green-800 flex gap-2">
                                            <ChefHat className="w-4 h-4 shrink-0 mt-0.5" />
                                            <span className="font-medium">Chef Adaptation:</span> {trend.adaptation}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar: Hooks & Local Ideas */}
                <div className="space-y-6">
                    <Card className="bg-slate-50 border-slate-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Lightbulb className="w-4 h-4 text-yellow-500" />
                                Winning Hooks
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-3">
                                {contentHooks.map((hook, i) => (
                                    <li key={i} className="text-sm bg-white p-2 rounded shadow-sm border cursor-pointer hover:border-blue-400 transition-colors">
                                        "{hook}"
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Share2 className="w-4 h-4 text-blue-500" />
                                Neighborhood Angles
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {neighborhoodIdeas.map((idea, i) => (
                                <div key={i}>
                                    <h4 className="font-medium text-sm">{idea.title}</h4>
                                    <p className="text-xs text-muted-foreground">{idea.description}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
