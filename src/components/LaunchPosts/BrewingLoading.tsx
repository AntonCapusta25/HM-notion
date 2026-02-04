import { useEffect, useState } from 'react';
import { FlaskConical, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BrewingLoading() {
    const [bubbles, setBubbles] = useState<{ id: number; left: number; delay: number }[]>([]);

    useEffect(() => {
        // Create random bubbles
        const newBubbles = Array.from({ length: 12 }).map((_, i) => ({
            id: i,
            left: Math.random() * 100, // Random horizontal position
            delay: Math.random() * 2 // Random delay
        }));
        setBubbles(newBubbles);
    }, []);

    return (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-500">
            <div className="relative">
                {/* Glowing Aura */}
                <div className="absolute inset-0 bg-purple-500/30 blur-3xl rounded-full animate-pulse" />

                {/* Potion Icon */}
                <div className="relative text-purple-400 animate-bounce duration-1000">
                    <FlaskConical size={80} strokeWidth={1.5} />

                    {/* Liquid Level Animation (Clip Path Hack or simplified) */}
                    <div className="absolute bottom-2 left-2 right-2 h-1/2 bg-purple-500/50 rounded-b-full animate-pulse blur-sm" />
                </div>

                {/* Bubbles */}
                {bubbles.map(b => (
                    <div
                        key={b.id}
                        className="absolute bottom-4 w-2 h-2 bg-purple-300 rounded-full animate-ping"
                        style={{
                            left: `${b.left}%`,
                            animationDelay: `${b.delay}s`,
                            animationDuration: '2s',
                            opacity: 0
                        }}
                    />
                ))}

                {/* Magic Sparkles */}
                <Sparkles className="absolute -top-4 -right-4 text-yellow-300 w-8 h-8 animate-spin-slow" />
                <Sparkles className="absolute -bottom-2 -left-6 text-yellow-200 w-6 h-6 animate-pulse" />
            </div>

            <div className="mt-8 text-center space-y-2">
                <h3 className="text-2xl font-bold text-white tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 animate-pulse">
                    Brewing Magic
                </h3>
                <p className="text-purple-200 text-sm">Mixing pixels & prompts...</p>
            </div>
        </div>
    );
}
