import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sparkles, LayoutTemplate } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CanvasElement } from '@/components/LaunchPosts/editor/types';

interface JustDoItViewProps {
    onTemplateSelect: (template: any) => void;
}

export function JustDoItView({ onTemplateSelect }: JustDoItViewProps) {
    const [templates, setTemplates] = useState<any[]>([]);

    // HARDCODED TEMPLATES (Scaled to fit 600x600 Canvas)
    const TEMPLATES = [
        {
            id: "hardcoded_1",
            name: "Amsterdam Split Story",
            category: "food",
            // thumbnail_url: "/templates/amsterdam-split.jpg", // User requested no background preview
            canvas_state: [
                {
                    id: "img_top",
                    type: "image",
                    x: 0,
                    y: 0,
                    width: 600,
                    height: 300,
                    rotation: 0,
                    opacity: 1,
                    src: "https://images.unsplash.com/photo-1556910103-1c02745a30bf?w=1080&h=960&fit=crop"
                },
                {
                    id: "img_bottom",
                    type: "image",
                    x: 0,
                    y: 300,
                    width: 600,
                    height: 300,
                    rotation: 0,
                    opacity: 1,
                    src: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1080&h=960&fit=crop"
                },
                {
                    id: "txt_title",
                    type: "text",
                    content: "AMSTERDAM DINNER",
                    x: 40,
                    y: 260,
                    fontSize: 36,
                    fontFamily: "Inter, sans-serif",
                    color: "#FDE68A",
                    fontWeight: "bold",
                    rotation: 0,
                    opacity: 1
                },
                {
                    id: "txt_subtitle",
                    type: "text",
                    content: "Ideas and Prices",
                    x: 40,
                    y: 320,
                    fontSize: 28,
                    fontFamily: "serif",
                    color: "#F97316",
                    fontWeight: "normal",
                    rotation: 0,
                    opacity: 1
                },
                {
                    id: "txt_badge",
                    type: "text",
                    content: "HOMEMADE",
                    x: 230,
                    y: 540,
                    fontSize: 20,
                    fontFamily: "Inter, sans-serif",
                    color: "#FFFFFF",
                    fontWeight: "bold",
                    rotation: 0,
                    opacity: 1
                }
            ],
            // Config targets the specific element IDs above
            // Config targets the specific element IDs above
            slots_config: [
                { id: "slot_1", targetElementId: "img_top", type: "image", description: "Top Image (Chef/Context)" },
                { id: "slot_2", targetElementId: "img_bottom", type: "image", description: "Bottom Image (Food Detail)" },
                { id: "slot_3", targetElementId: "txt_title", type: "text", description: "Main Title", default: "AMSTERDAM DINNER" },
                { id: "slot_4", targetElementId: "txt_subtitle", type: "text", description: "Subtitle/Price", default: "Ideas and Prices" },
                { id: "slot_5", targetElementId: "txt_badge", type: "text", description: "Badge Text", default: "HOMEMADE" }
            ]
        },
        {
            id: "hardcoded_2",
            name: "Product Spotlight",
            category: "product",
            thumbnail_url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop",
            canvas_state: [
                {
                    id: "img_bg",
                    type: "image",
                    x: 0,
                    y: 0,
                    width: 600,
                    height: 600,
                    rotation: 0,
                    opacity: 1,
                    src: "https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=1080&h=1920&fit=crop"
                },
                {
                    id: "txt_product",
                    type: "text",
                    content: "SARMA",
                    x: 300,
                    y: 450,
                    fontSize: 64,
                    fontFamily: "serif",
                    color: "#FDE68A",
                    fontWeight: "bold",
                    rotation: 0,
                    opacity: 1,
                    isMain: false
                },
                {
                    id: "txt_price",
                    type: "text",
                    content: "€8",
                    x: 300,
                    y: 520,
                    fontSize: 52,
                    fontFamily: "serif",
                    color: "#FDE68A",
                    fontWeight: "bold",
                    rotation: 0,
                    opacity: 1
                },
                {
                    id: "txt_side",
                    type: "text",
                    content: "ORDER NOW",
                    x: 40,
                    y: 450,
                    fontSize: 24,
                    fontFamily: "Inter, sans-serif",
                    color: "#F97316",
                    fontWeight: "bold",
                    rotation: -90,
                    opacity: 1
                }
            ],
            slots_config: [
                { id: "slot_bg", targetElementId: "img_bg", description: "Main Product Background" }
            ]
        }
    ];

    useEffect(() => {
        setTemplates(TEMPLATES);
    }, []);

    return (
        <div className="space-y-8 p-6 animate-in fade-in">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Just Do It</h2>
                <p className="text-muted-foreground">Pick a style, type your idea, and let AI do the rest.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Create New (Blank) */}
                <Card className="aspect-square flex flex-col items-center justify-center p-6 cursor-pointer hover:border-primary/50 transition-all group border-dashed" onClick={() => onTemplateSelect(null)}>
                    <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Sparkles className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">Start from Blank</h3>
                    <p className="text-sm text-center text-muted-foreground mt-2">I know what I'm doing</p>
                </Card>

                {/* Templates mapped here */}
                {templates.map(t => (
                    <Card key={t.id} className="aspect-square relative overflow-hidden group cursor-pointer border-0 shadow-lg" onClick={() => onTemplateSelect(t)}>
                        <div className="absolute inset-0 bg-gray-100">
                            {t.thumbnail_url ? <img src={t.thumbnail_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><LayoutTemplate className="w-12 h-12 text-gray-300" /></div>}
                        </div>
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button variant="secondary" className="font-bold">Use Template</Button>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                            <p className="text-white font-bold">{t.name}</p>
                        </div>
                    </Card>
                ))}

                {templates.length === 0 && (
                    <div className="col-span-full text-center p-8 text-muted-foreground">
                        <p>No templates found. Please check database seeding.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
