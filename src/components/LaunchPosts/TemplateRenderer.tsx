import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Share2 } from 'lucide-react';
import html2canvas from 'html2canvas'; // types are loose, assuming scale works or using any
import { AmsterdamStory } from './templates/AmsterdamStory';

interface TemplateRendererProps {
    templateId: string;
    canvasState: any[]; // The array of elements from our generation engine
    onBack: () => void;
    onRegenerateImage?: (slotId: string) => void;
    onEditText?: (slotId: string) => void;
}

export function TemplateRenderer({ templateId, canvasState, onBack, onRegenerateImage, onEditText }: TemplateRendererProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    // 1. Helper to extract value by ID from canvasState
    const getVal = (id: string, key: 'content' | 'src') => {
        const item = canvasState.find(el => el.id === id);
        return item ? item[key] : undefined;
    };

    // 2. Map state to props based on Template ID
    const renderTemplate = () => {
        // We can check templateId or template name.
        // Assuming "hardcoded_1" is Amsterdam
        if (templateId === 'hardcoded_1' || templateId.includes('Amsterdam')) {
            return (
                <AmsterdamStory
                    images={{
                        top: getVal('img_top', 'src'),
                        bottom: getVal('img_bottom', 'src'),
                    }}
                    titles={{
                        main: getVal('txt_title', 'content'),
                        subtitle: getVal('txt_subtitle', 'content'),
                        badge: getVal('txt_badge', 'content'),
                    }}
                    className="h-full w-full"
                    onEditImage={onRegenerateImage}
                    onEditText={onEditText}
                />
            );
        }

        return <div className="text-white">Unknown Template ID: {templateId}</div>;
    };

    // 3. Export Functionality
    const handleDownload = async () => {
        // Target the off-screen high-res container
        const target = document.getElementById('export-container');
        if (!target) return;

        try {
            const options: any = {
                useCORS: true,
                scale: 1, // Native 1:1 capture of the 1080p container
                backgroundColor: null,
                logging: false,
            };

            const canvas = await html2canvas(target, options);
            const link = document.createElement('a');
            link.download = `story-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
        } catch (e) {
            console.error("Download failed", e);
        }
    };

    return (
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500 h-full justify-center">
            {/* Toolbar */}
            <div className="flex items-center gap-4 w-full max-w-md justify-between">
                <Button variant="ghost" onClick={onBack}>
                    ← Edit Prompts
                </Button>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleDownload}>
                        <Download className="w-4 h-4 mr-2" /> Download
                    </Button>
                    <Button size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                        <Share2 className="w-4 h-4 mr-2" /> Post
                    </Button>
                </div>
            </div>

            {/* The Stage - Responsive Height (Preview Mode) */}
            <div className="relative shadow-2xl rounded-none overflow-hidden border-4 border-gray-900/10">
                <div
                    ref={containerRef}
                    className="bg-black origin-top"
                    style={{
                        height: '55vh', // screen fit
                        aspectRatio: '4/5'
                    }}
                >
                    {renderTemplate()}
                </div>
            </div>

            {/* HIDDEN EXPORT CONTAINER (Native 1080x1350) */}
            {/* This renders the template in 'export' mode, where everything is scaled up for high res */}
            <div
                id="export-container"
                style={{
                    position: 'fixed',
                    top: '-9999px',
                    left: '-9999px',
                    width: '1080px',
                    height: '1350px',
                    zIndex: -50,
                    overflow: 'hidden'
                }}
            >
                <div style={{
                    width: '400px',
                    height: '500px',
                    transform: 'scale(2.7)',
                    transformOrigin: 'top left'
                }}>
                    {renderTemplate()}
                </div>
            </div>

            <p className="text-muted-foreground text-xs mt-2">
                *High-resolution export (1080x1350px)
            </p>
        </div>
    );
}
