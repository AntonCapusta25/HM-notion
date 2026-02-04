import React from 'react';
import { cn } from '@/lib/utils';
import { Pencil, RefreshCw } from 'lucide-react';

interface AmsterdamStoryProps {
    images?: {
        top?: string;
        bottom?: string;
    };
    titles?: {
        main?: string;
        subtitle?: string;
        badge?: string;
    };
    className?: string;
    mode?: 'preview' | 'export'; // New Prop
    onEditImage?: (id: string) => void;
    onEditText?: (id: string) => void;
}

export function AmsterdamStory({ images, titles, className, mode = 'preview', onEditImage, onEditText }: AmsterdamStoryProps) {
    const { top, bottom } = images || {};
    const { main = "AMSTERDAM DINNER", subtitle = "Ideas and Prices", badge = "HOMEMADE" } = titles || {};

    const isExport = mode === 'export';

    // Scaling Factor ~2.7x (400px -> 1080px)
    // We conditionally apply classes or inline styles based on mode.

    return (
        <div
            className={cn(
                "relative w-full aspect-[4/5] bg-[#111B13] overflow-hidden flex flex-col gap-1 rounded-none",
                // Padding scaling
                isExport ? "p-[8rem] gap-3" : "p-12 gap-1",
                className
            )}
        >
            <style>{`
                @font-face {
                    font-family: 'NewSpirit';
                    src: url('https://firebasestorage.googleapis.com/v0/b/homemademeals-7040d.appspot.com/o/fonts%2FNewSpirit-BoldCondensed.ttf?alt=media&token=c8efe058-eff2-4ae3-937e-5ec9d0d760cd') format('truetype');
                    font-weight: bold;
                    font-style: normal;
                }
            `}</style>

            {/* Top Image */}
            <div
                className={cn(
                    "relative h-[46%] w-full overflow-hidden shadow-2xl mx-auto group shrink-0 bg-[#1A2C20]",
                    // Rounding scaling
                    isExport ? "rounded-[4rem]" : "rounded-[1.5rem]",
                    // Cursor only in preview
                    !isExport && "cursor-pointer"
                )}
                onClick={() => !isExport && onEditImage?.('img_top')}
            >
                <div
                    className="absolute inset-0 bg-cover bg-center transition-opacity group-hover:opacity-80"
                    style={{ backgroundImage: top ? `url(${top})` : undefined }}
                >
                    {!top && (
                        <div className="w-full h-full flex items-center justify-center text-white/10 text-xl font-serif italic">Chef's Selection</div>
                    )}
                </div>

                {/* Edit Overlay (Preview only) */}
                {!isExport && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        <RefreshCw className="text-white w-8 h-8 drop-shadow-lg" />
                    </div>
                )}

                {/* Text Overlay */}
                <div
                    className={cn(
                        "absolute flex flex-col items-start justify-end z-20 transition-transform",
                        // Edit interactions preview only
                        !isExport && "cursor-text hover:brightness-110 active:scale-95",
                        // Positioning scaling
                        isExport ? "bottom-14 left-14" : "bottom-5 left-5"
                    )}
                    onClick={(e) => {
                        e.stopPropagation();
                        !isExport && onEditText?.('txt_group_main');
                    }}
                >
                    <h1
                        className={cn(
                            "font-bold uppercase tracking-tight text-[#FFE8A3] leading-[1.0] drop-shadow-lg whitespace-nowrap",
                            // Text scaling: text-sm (14px) * 2.7 ~= 38px (text-4xl) to 48px (text-5xl)
                            isExport ? "text-5xl" : "text-sm sm:text-base"
                        )}
                        style={{ fontFamily: 'NewSpirit, serif', textShadow: isExport ? '3px 6px 12px rgba(0,0,0,0.8)' : '1px 2px 4px rgba(0,0,0,0.8)' }}
                    >
                        {main}
                    </h1>

                    <h2
                        className={cn(
                            "font-bold text-[#FF7A30] -rotate-2 origin-left whitespace-nowrap",
                            // Subtitle scaling
                            isExport ? "mt-2 text-4xl" : "mt-0.5 text-xs sm:text-sm"
                        )}
                        style={{ fontFamily: 'NewSpirit, serif', textShadow: isExport ? '2px 3px 6px rgba(0,0,0,0.6)' : '1px 1px 2px rgba(0,0,0,0.6)' }}
                    >
                        {subtitle}
                    </h2>

                    {!isExport && (
                        <div className="absolute -right-6 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Pencil className="w-3 h-3 text-white/50" />
                        </div>
                    )}
                </div>

                {/* Gradient for text */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Bottom Image */}
            <div
                className={cn(
                    "relative h-[46%] w-full overflow-hidden shadow-2xl shrink-0 group bg-[#1A2C20]",
                    isExport ? "rounded-[4rem]" : "rounded-[1.5rem]",
                    !isExport && "cursor-pointer"
                )}
                onClick={() => !isExport && onEditImage?.('img_bottom')}
            >
                <div
                    className="absolute inset-0 bg-cover bg-center transition-opacity group-hover:opacity-80"
                    style={{ backgroundImage: bottom ? `url(${bottom})` : undefined }}
                >
                    {!bottom && (
                        <div className="w-full h-full flex items-center justify-center text-white/10 text-xl font-serif italic">The Dish</div>
                    )}
                </div>

                {!isExport && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        <RefreshCw className="text-white w-8 h-8 drop-shadow-lg" />
                    </div>
                )}

                {/* Logo Image Replaces CSS Badge */}
                <div className={cn(
                    "absolute left-1/2 -translate-x-1/2 flex flex-col items-center origin-bottom pointer-events-none",
                    // Position scaling - Bleeding off the edge
                    isExport ? "-bottom-12" : "-bottom-4"
                )}>
                    <img
                        src="/homemade-logo.png"
                        alt="HOMEMADE"
                        className={cn(
                            "object-contain drop-shadow-2xl",
                            isExport ? "w-[850px]" : "w-[320px]" // Massive, bleeding off bottom
                        )}
                    />
                </div>
            </div>
        </div>
    );
}
