import { useState } from 'react';
import { LaunchPostPrompt } from '@/types/launchPosts';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Sparkles, Sliders } from 'lucide-react';
import { STYLE_PRESETS } from './styles';
import { SUBJECT_TYPES } from './subjectTypes';
import { cn } from '@/lib/utils';

interface SimplePromptEditorProps {
    prompt: LaunchPostPrompt;
    onChange: (prompt: LaunchPostPrompt) => void;
    onToggleAdvanced: () => void;
}

export function SimplePromptEditor({ prompt, onChange, onToggleAdvanced }: SimplePromptEditorProps) {
    const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

    const handleSubjectSelect = (subjectId: string) => {
        const subject = SUBJECT_TYPES.find(s => s.id === subjectId);
        if (subject) {
            setSelectedSubjectId(subjectId);
            const updates = subject.apply(prompt);
            onChange({ ...prompt, ...updates });
        }
    };

    const handleStyleSelect = (styleId: string) => {
        const style = STYLE_PRESETS.find(s => s.id === styleId);
        if (style) {
            setSelectedStyleId(styleId);
            const updates = style.apply(prompt);
            onChange({ ...prompt, ...updates });
        }
    };

    const handleSubjectChange = (text: string) => {
        onChange({
            ...prompt,
            subject: {
                ...prompt.subject,
                primary: text
            }
        });
    };

    return (
        <div className="space-y-8">
            {/* Header with Advanced Toggle */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold">Create your Launch Post</h2>
                    <p className="text-muted-foreground">Select a category and describe your vision.</p>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggleAdvanced}
                    className="text-muted-foreground hover:text-primary"
                >
                    <Sliders className="w-4 h-4 mr-2" />
                    Advanced Settings
                </Button>
            </div>

            {/* Subject Type Selector */}
            <div className="space-y-4">
                <Label className="text-lg font-semibold">1. Choose Content Type</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {SUBJECT_TYPES.map((subject) => (
                        <div
                            key={subject.id}
                            onClick={() => handleSubjectSelect(subject.id)}
                            className={cn(
                                "group cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-200 hover:scale-[1.02]",
                                selectedSubjectId === subject.id
                                    ? "border-homemade-orange shadow-lg ring-2 ring-homemade-orange/20"
                                    : "border-transparent hover:border-gray-200"
                            )}
                        >
                            <div className="h-24 w-full relative">
                                <img
                                    src={subject.previewImage}
                                    alt={subject.name}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                            </div>
                            <div className="p-3 bg-card text-center">
                                <h3 className={cn(
                                    "font-medium text-sm",
                                    selectedSubjectId === subject.id ? "text-homemade-orange" : "text-gray-900"
                                )}>
                                    {subject.name}
                                </h3>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Prompt Input */}
            <div className="space-y-4">
                <Label className="text-lg font-semibold">2. Describe It</Label>
                <Textarea
                    placeholder="Describe your subject in detail..."
                    value={prompt.subject.primary}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    className="h-24 text-lg p-4 resize-none bg-secondary/20"
                />
            </div>

            {/* Style Selector */}
            <div className="space-y-4">
                <Label className="text-lg font-semibold">3. Choose a Style</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {STYLE_PRESETS.map((style) => (
                        <div
                            key={style.id}
                            onClick={() => handleStyleSelect(style.id)}
                            className={cn(
                                "group cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-200 hover:scale-[1.02]",
                                selectedStyleId === style.id
                                    ? "border-homemade-orange shadow-lg ring-2 ring-homemade-orange/20"
                                    : "border-transparent hover:border-gray-200"
                            )}
                        >
                            <div className="h-24 w-full relative">
                                <img
                                    src={style.previewImage}
                                    alt={style.name}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                            </div>
                            <div className="p-3 bg-card">
                                <h3 className={cn(
                                    "font-medium",
                                    selectedStyleId === style.id ? "text-homemade-orange" : "text-gray-900"
                                )}>
                                    {style.name}
                                </h3>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-1">{style.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
