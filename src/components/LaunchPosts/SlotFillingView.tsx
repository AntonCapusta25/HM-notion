import { useState } from 'react';
import { Button } from '@/components/ui/button';

import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Rocket, ArrowLeft, Palette, Type, Image as ImageIcon, Settings2 } from 'lucide-react';
import { LaunchPostTemplate, LaunchPostPrompt } from '@/types/launchPosts';
import { STYLE_PRESETS } from './styles';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PromptEditor } from './PromptEditor';

// Default prompt structure (copied for initialization)
const DEFAULT_PROMPT: LaunchPostPrompt = {
    camera: { model: 'Canon EOS R5', lens: '50mm', aperture: 'f/5.6', shutter: '1/200', iso: '100', framing: 'Medium shot', angle: 'Eye-level', movement: 'Static' },
    subject: { primary: '', secondary: 'Clean background', pose: 'Centered', expression: 'N/A', build: 'N/A' },
    character: { hair: 'N/A', wardrobeNotes: 'N/A', props: [] },
    materialPhysics: { fabricBehavior: 'N/A', surfaceQuality: 'High quality', lightInteraction: 'Natural' },
    skinRendering: { textureDetail: 'N/A', finish: 'N/A', retouchingStyle: 'N/A' },
    composition: { theory: 'Rule of thirds', depth: 'Medium', focus: 'Sharp' },
    setting: { environment: 'Studio', timeOfDay: 'Day', atmosphere: 'Clean', shadowPlay: 'Soft' },
    lighting: { source: 'Natural', direction: 'Side', quality: 'Soft', colorTemperature: 'Neutral' },
    style: { artDirection: 'Photo', mood: 'Neutral', references: [] },
    rendering: { engine: 'Photorealistic', fidelitySpec: 'High', postProcessing: 'Color correction' },
    colorPlate: { primaryColors: [], accentColors: [] },
    negative_prompt: 'text, watermark, low quality'
};

interface SlotFillingViewProps {
    template: LaunchPostTemplate;
    onBack: () => void;
    onGenerate: (slotPrompts: Record<string, string | LaunchPostPrompt>, styleId: string | null) => void;
}

export function SlotFillingView({ template, onBack, onGenerate }: SlotFillingViewProps) {
    // Initialize prompts for each slot
    const [slotPrompts, setSlotPrompts] = useState<Record<string, string>>(() => {
        const defaults: Record<string, string> = {};
        template.slots_config?.forEach((slot: any) => {
            if (slot.default) defaults[slot.id] = slot.default;
        });
        return defaults;
    });

    // Store full prompt objects for slots that use Advanced Settings
    const [advancedPrompts, setAdvancedPrompts] = useState<Record<string, LaunchPostPrompt>>({});

    // Dialog State
    const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
    const [tempPrompt, setTempPrompt] = useState<LaunchPostPrompt | null>(null);

    const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);

    const handlePromptChange = (slotId: string, value: string) => {
        setSlotPrompts(prev => ({
            ...prev,
            [slotId]: value
        }));
    };

    const isComplete = template.slots_config?.every(slot =>
        slotPrompts[slot.id] && slotPrompts[slot.id].trim().length > 0
    );

    // Initialiaze advanced settings for a slot
    const openAdvancedSettings = (slotId: string) => {
        const currentInput = slotPrompts[slotId] || "";
        const existingAdvanced = advancedPrompts[slotId];

        let initialPrompt = existingAdvanced ? { ...existingAdvanced } : { ...DEFAULT_PROMPT };

        // Ensure the current text input is synced to the subject
        if (!existingAdvanced) {
            initialPrompt.subject.primary = currentInput;
        }

        setTempPrompt(initialPrompt);
        setEditingSlotId(slotId);
    };

    const saveAdvancedSettings = () => {
        if (editingSlotId && tempPrompt) {
            setAdvancedPrompts(prev => ({
                ...prev,
                [editingSlotId]: tempPrompt
            }));
            // Sync specific parts back to simple input if desired, or just leave it
            // We might want to lock the simple input if advanced is active? 
            // For now, let's just update the simple input with the primary subject to keep them vaguely in sync
            handlePromptChange(editingSlotId, tempPrompt.subject.primary);
        }
        setEditingSlotId(null);
        setTempPrompt(null);
    };

    const handleGenerateClick = () => {
        // Merge simple strings and advanced objects
        const finalPrompts: Record<string, string | LaunchPostPrompt> = {};

        template.slots_config?.forEach((slot: any) => {
            if (advancedPrompts[slot.id]) {
                finalPrompts[slot.id] = advancedPrompts[slot.id];
            } else {
                finalPrompts[slot.id] = slotPrompts[slot.id];
            }
        });

        onGenerate(finalPrompts, selectedStyleId);
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold">Customize "{template.name}"</h2>
                    <p className="text-muted-foreground">Describe what you want to see in each section.</p>
                </div>
            </div>

            <div className="space-y-6">
                {template.slots_config?.map((slot: any) => (
                    <Card key={slot.id} className={cn(
                        "p-6 space-y-4 border-2 transition-colors",
                        advancedPrompts[slot.id] ? "border-purple-500 bg-purple-50/10" : "focus-within:border-primary"
                    )}>
                        <div className="flex items-center justify-between">
                            <Label htmlFor={slot.id} className="text-lg font-semibold flex items-center gap-2">
                                <span className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-xs",
                                    slot.type === 'text' ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                                )}>
                                    {slot.type === 'text' ? <Type className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                                </span>
                                {slot.description}
                            </Label>

                            {/* Advanced Settings Button for Image Slots */}
                            {slot.type === 'image' && (
                                <Button
                                    variant={advancedPrompts[slot.id] ? "default" : "ghost"}
                                    size="sm"
                                    onClick={() => openAdvancedSettings(slot.id)}
                                    className={cn("gap-2", advancedPrompts[slot.id] ? "bg-purple-600 hover:bg-purple-700" : "")}
                                >
                                    <Settings2 className="w-3 h-3" />
                                    {advancedPrompts[slot.id] ? "Advanced Active" : "Advanced"}
                                </Button>
                            )}
                        </div>

                        {slot.type === 'text' ? (
                            <Input
                                id={slot.id}
                                placeholder={slot.default || "Enter text..."}
                                value={slotPrompts[slot.id] || ''}
                                onChange={(e) => handlePromptChange(slot.id, e.target.value)}
                                className="text-lg h-12"
                            />
                        ) : (
                            <div className="relative">
                                <Textarea
                                    id={slot.id}
                                    placeholder={`Describe the ${slot.description.toLowerCase()}...`}
                                    value={slotPrompts[slot.id] || ''}
                                    onChange={(e) => handlePromptChange(slot.id, e.target.value)}
                                    className="bg-secondary/20 min-h-[100px] text-lg resize-none pr-12"
                                />
                            </div>
                        )}

                        {advancedPrompts[slot.id] && (
                            <p className="text-xs text-purple-600 font-medium flex items-center gap-1">
                                <Settings2 className="w-3 h-3" />
                                Using custom camera, lighting, and physics settings.
                            </p>
                        )}
                    </Card>
                ))}
            </div>

            {/* Style Selector */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold">
                    <Palette className="w-5 h-5" />
                    <h3>Choose a Style</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {STYLE_PRESETS.map((style) => (
                        <div
                            key={style.id}
                            onClick={() => setSelectedStyleId(style.id)}
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

            <div className="flex justify-end pt-4">
                <Button
                    size="lg"
                    disabled={!isComplete || !selectedStyleId}
                    onClick={handleGenerateClick}
                    className="w-full md:w-auto text-lg px-8"
                >
                    <Rocket className="w-5 h-5 mr-2" />
                    Generate Images
                </Button>
            </div>

            {/* Advanced Settings Modal */}
            <Dialog open={!!editingSlotId} onOpenChange={(open) => !open && setEditingSlotId(null)}>
                <DialogContent className="max-w-4xl h-[90vh] overflow-hidden flex flex-col p-0 bg-gray-50/95 backdrop-blur-xl">
                    <DialogHeader className="p-6 pb-2 border-b bg-white">
                        <DialogTitle className="flex items-center gap-2">
                            <Settings2 className="w-5 h-5 text-purple-600" />
                            Advanced Settings for Slot
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-0">
                        {tempPrompt && (
                            <PromptEditor
                                prompt={tempPrompt}
                                onChange={setTempPrompt}
                            />
                        )}
                    </div>

                    <div className="p-4 border-t bg-white flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setEditingSlotId(null)}>Cancel</Button>
                        <Button onClick={saveAdvancedSettings}>Save Configuration</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
