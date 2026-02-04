import { useState } from 'react';
import { Layout } from '../components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { JustDoItView } from '@/components/LaunchPosts/JustDoItView';
import ForNerdsView from '@/components/LaunchPosts/ForNerdsView';
import { Sparkles, Code2 } from 'lucide-react';
import { SlotFillingView } from '@/components/LaunchPosts/SlotFillingView';
import { STYLE_PRESETS } from '@/components/LaunchPosts/styles';
import { SUBJECT_TYPES } from '@/components/LaunchPosts/subjectTypes';
import { generateImage, uploadGeneratedImage } from '@/utils/launchPostsApi';
import { LaunchPostPrompt } from '@/types/launchPosts';
import { useToast } from '@/hooks/use-toast';
import { BrewingLoading } from '@/components/LaunchPosts/BrewingLoading';
import { Button } from '@/components/ui/button';
import { TemplateRenderer } from '@/components/LaunchPosts/TemplateRenderer';
import { cn } from '@/lib/utils';

export default function LaunchPosts() {
    // Top-level state for Just-Do-It flow
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isBrewing, setIsBrewing] = useState(false);
    const [generatedCanvasState, setGeneratedCanvasState] = useState<any[] | null>(null);
    const { toast } = useToast();

    // Default empty prompt structure to start from
    const basePrompt: LaunchPostPrompt = {
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

    const handleGenerate = async (slotPrompts: Record<string, string | LaunchPostPrompt>, styleId: string | null) => {
        console.log("Starting generation...", { slotPrompts, styleId });
        setIsGenerating(true);
        setIsBrewing(true);

        // NOTE: We REMOVED the timeout. Brewing stays ON until generation completes.

        try {
            if (!selectedTemplate.slots_config || selectedTemplate.slots_config.length === 0) {
                console.warn("No slots configured for this template");
                toast({ title: "Configuration Error", description: "This template has no slots defined.", variant: "destructive" });
                setIsGenerating(false);
                setIsBrewing(false);
                return;
            }

            // Clone the canvas state so we can mutate it with new images
            let newCanvasState = JSON.parse(JSON.stringify(selectedTemplate.canvas_state));

            // Find selected style
            const selectedStyle = STYLE_PRESETS.find(s => s.id === styleId);
            // Default subject type (could be inferred from template category in future)
            const defaultSubject = SUBJECT_TYPES.find(s => s.id === 'food') || SUBJECT_TYPES[0];

            console.log("Processing slots...", selectedTemplate.slots_config.length);

            // Iterate through slots and generate images SEQUENTIALLY to avoid rate limits
            for (const slot of selectedTemplate.slots_config || []) {
                const userInputValue = slotPrompts[slot.id];

                if (!userInputValue) {
                    console.log(`Skipping slot ${slot.id}: No input provided`);
                    continue;
                }

                // --- TEXT SLOT HANDLE ---
                if (slot.type === 'text') {
                    const targetElementIndex = newCanvasState.findIndex((el: any) => el.id === slot.targetElementId);
                    if (targetElementIndex !== -1) {
                        newCanvasState[targetElementIndex].content = userInputValue;
                        console.log(`Updated text element ${slot.targetElementId} with: "${userInputValue}"`);
                    } else {
                        console.warn(`Target text element ${slot.targetElementId} not found`);
                    }
                    continue; // Done for text slot
                }

                // --- IMAGE SLOT HANDLE ---

                let prompt = { ...basePrompt };

                // CHECK: Is this an advanced prompt object?
                if (typeof userInputValue === 'object' && userInputValue !== null) {
                    console.log(`Using advanced prompt for slot ${slot.id}`);
                    prompt = userInputValue as LaunchPostPrompt;
                } else {
                    // Standard String Input
                    console.log(`Generating for slot ${slot.id}: "${userInputValue}"`);

                    // Apply Subject Type defaults
                    if (defaultSubject) {
                        prompt = { ...prompt, ...defaultSubject.apply(prompt) };
                    }

                    // Apply Selected Style
                    if (selectedStyle) {
                        prompt = { ...prompt, ...selectedStyle.apply(prompt) };
                    }

                    // Apply User Input
                    prompt.subject.primary = userInputValue as string;
                }

                // 2. Generate Image
                try {
                    const result = await generateImage(prompt);
                    console.log(`Generation result for ${slot.id}:`, result);

                    if (result.success && result.imageData) {
                        // Success! Now attempt to upload to Storage

                        let imageUrl = `data:${result.mimeType || 'image/png'};base64,${result.imageData}`;

                        try {
                            const storageUrl = await uploadGeneratedImage(result.imageData, result.mimeType || 'image/png');
                            if (storageUrl) {
                                console.log(`Uploaded image to storage: ${storageUrl}`);
                                imageUrl = storageUrl;
                            } else {
                                console.warn("Failed to upload to storage, falling back to base64");
                            }
                        } catch (uploadInfo) {
                            console.warn("Upload exception, falling back to base64", uploadInfo);
                        }

                        // 3. Update Canvas State
                        const targetElementIndex = newCanvasState.findIndex((el: any) => el.id === slot.targetElementId);
                        if (targetElementIndex !== -1) {
                            newCanvasState[targetElementIndex].src = imageUrl;
                            console.log(`Updated element ${slot.targetElementId} with new image`);
                        } else {
                            console.warn(`Target element ${slot.targetElementId} not found in canvas state`);
                        }
                    } else {
                        console.error(`Failed to generate for slot ${slot.id}:`, result.error);
                        toast({
                            title: `Generation Failed for ${slot.description}`,
                            description: result.error || "Unknown error",
                            variant: "destructive"
                        });
                    }
                } catch (err) {
                    console.error(`Exception generating slot ${slot.id}:`, err);
                }
            }

            console.log("All generations complete. Updating state.");
            setGeneratedCanvasState(newCanvasState);

        } catch (error) {
            console.error("Generation failed:", error);
            toast({
                title: "Generation Failed",
                description: "Something went wrong while creating your images.",
                variant: "destructive"
            });
            setIsGenerating(false); // Go back if failed
        } finally {
            // Stop brewing ONLY after everything is done
            setIsBrewing(false);
        }
    };

    // --- NEW: Handle single image regeneration ---
    const handleRegenerateImage = async (elementId: string) => {
        // Find which slot maps to this element
        const slot = selectedTemplate.slots_config.find((s: any) => s.targetElementId === elementId);
        if (!slot) {
            console.warn("No slot found for element", elementId);
            return;
        }

        // Find the *last used prompt* for this slot? 
        // We might need to store the prompts map in state or just ask user?
        // For now, let's re-use the default logic or ask user for new prompt?
        // Simpler: Just re-run the generation logic for this ONE slot using the SAME prompt logic as before.
        // Problem: We don't have the original `slotPrompts` here easily unless we stored them.

        // MVP: Ask user for new prompt or confirmation?
        // Let's just assume we want to "try again" with the same subject if we had it.
        // better: Open a prompt dialog?
        // For "Just Do It" speed, let's just re-roll with same prompt if possible, or generic.

        // ACTUAL MVP: Prompt input for new subject
        const newSubject = prompt(`Enter new subject for ${slot.description}:`, "Delicious food");
        if (!newSubject) return;

        setIsBrewing(true); // Short brew for single item

        try {
            // Re-construct prompt
            let promptObj = { ...basePrompt };
            // Apply defaults/styles if we had them stored... 
            // We lost `styleId` context. Ideally handleGenerate should save it.
            // Fallback: Just basic prompt with new subject
            promptObj.subject.primary = newSubject;

            const result = await generateImage(promptObj);

            if (result.success && result.imageData) {
                const storageUrl = await uploadGeneratedImage(result.imageData);
                const finalUrl = storageUrl || `data:image/png;base64,${result.imageData}`;

                // Update State
                setGeneratedCanvasState(prev => {
                    if (!prev) return null;
                    return prev.map((el: any) =>
                        el.id === elementId ? { ...el, src: finalUrl } : el
                    );
                });
            } else {
                toast({ title: "Failed", description: "Could not regenerate image", variant: "destructive" });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsBrewing(false);
        }
    };

    // --- NEW: Handle text editing ---
    const handleEditText = (elementId: string) => {
        const currentEl = generatedCanvasState?.find((el: any) => el.id === elementId);
        if (!currentEl) return;

        const newText = prompt("Edit Text:", currentEl.content);
        if (newText !== null) {
            setGeneratedCanvasState(prev => {
                if (!prev) return null;
                return prev.map((el: any) =>
                    el.id === elementId ? { ...el, content: newText } : el
                );
            });
        }
    };

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Launch Posts</h1>
                    <p className="mt-2 text-sm text-gray-600">Create stunning visuals for your product launch.</p>
                </div>

                <Tabs defaultValue="images" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                        <TabsTrigger value="templator" className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple-500" />
                            Templator
                        </TabsTrigger>
                        <TabsTrigger value="images" className="flex items-center gap-2">
                            <Code2 className="w-4 h-4 text-blue-500" />
                            Images
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="templator">
                        {selectedTemplate ? (
                            isGenerating ? (
                                <div className="h-[calc(100vh-250px)] animate-in fade-in slide-in-from-bottom-4 relative overflow-hidden">
                                    {isBrewing && <BrewingLoading />}

                                    <div className={cn("transition-all duration-1000", isBrewing ? "blur-xl" : "blur-0")}>
                                        <Button variant="ghost" onClick={() => setIsGenerating(false)} className="mb-4">
                                            ← Back to Customization
                                        </Button>
                                        <TemplateRenderer
                                            templateId={selectedTemplate.id}
                                            canvasState={generatedCanvasState || selectedTemplate.canvas_state}
                                            onBack={() => {
                                                setIsGenerating(false);
                                                setGeneratedCanvasState(null);
                                            }}
                                            onRegenerateImage={handleRegenerateImage}
                                            onEditText={handleEditText}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <SlotFillingView
                                    template={selectedTemplate}
                                    onBack={() => setSelectedTemplate(null)}
                                    // @ts-ignore - Updating signature next
                                    onGenerate={handleGenerate}
                                />
                            )
                        ) : (
                            <JustDoItView onTemplateSelect={setSelectedTemplate} />
                        )}
                    </TabsContent>

                    <TabsContent value="images">
                        <ForNerdsView />
                    </TabsContent>
                </Tabs>
            </div>
        </Layout>
    );
}
