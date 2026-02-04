import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Rocket, Sparkles, Image, Palette, Download, Save, Loader2 } from 'lucide-react';
import { LaunchPostTemplate, LaunchPostPrompt } from '@/types/launchPosts';
import { TemplateManager } from '@/components/LaunchPosts/TemplateManager';
import { PromptEditor } from '@/components/LaunchPosts/PromptEditor';
import { ImageGenerator } from '@/components/LaunchPosts/ImageGenerator';
import { SimplePromptEditor } from '@/components/LaunchPosts/SimplePromptEditor';
import { CanvasEditor } from '@/components/LaunchPosts/CanvasEditor';
import { createTemplate } from '@/utils/launchPostsApi';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function ForNerdsView() {
    // Default prompt structure
    const DEFAULT_PROMPT: LaunchPostPrompt = {
        camera: {
            model: 'Canon EOS R5',
            lens: '50mm',
            aperture: 'f/5.6',
            shutter: '1/200',
            iso: '100',
            framing: 'Medium shot',
            angle: 'Eye-level',
            movement: 'Static'
        },
        subject: {
            primary: 'A delicious gourmet burger with melting cheese',
            secondary: 'Clean background',
            pose: 'Centered',
            expression: 'N/A',
            build: 'N/A'
        },
        character: {
            hair: 'N/A',
            wardrobeNotes: 'N/A',
            props: []
        },
        materialPhysics: {
            fabricBehavior: 'N/A',
            surfaceQuality: 'High quality texture',
            lightInteraction: 'Natural reflection'
        },
        skinRendering: {
            textureDetail: 'N/A',
            finish: 'N/A',
            retouchingStyle: 'N/A'
        },
        composition: {
            theory: 'Rule of thirds',
            depth: 'Medium depth of field',
            focus: 'Sharp focus on subject'
        },
        setting: {
            environment: 'Studio setting',
            timeOfDay: 'Daytime',
            atmosphere: 'Bright and airy',
            shadowPlay: 'Soft shadows'
        },
        lighting: {
            source: 'Natural light',
            direction: 'Side lighting',
            quality: 'Soft diffused',
            colorTemperature: 'Neutral'
        },
        style: {
            artDirection: 'Professional food photography',
            mood: 'Appetizing',
            references: []
        },
        rendering: {
            engine: 'Photorealistic',
            fidelitySpec: 'High resolution',
            postProcessing: 'Color correction'
        },
        colorPlate: {
            primaryColors: ['#FFFFFF', '#E67E22'],
            accentColors: ['#000000']
        },
        negative_prompt: 'text, watermark, low quality, blurry, distorted'
    };

    const [currentStep, setCurrentStep] = useState(2); // Start at Customize step
    const [isAdvancedMode, setIsAdvancedMode] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<LaunchPostTemplate | null>(null);
    const [currentPrompt, setCurrentPrompt] = useState<LaunchPostPrompt | null>(DEFAULT_PROMPT);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [refreshTemplatesTrigger, setRefreshTemplatesTrigger] = useState(0);
    const { toast } = useToast();

    // Save Template Dialog State
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');
    const [newTemplateDescription, setNewTemplateDescription] = useState('');

    const onSaveSubmit = async () => {
        if (!newTemplateName.trim()) {
            toast({
                title: "Name required",
                description: "Please give your template a name.",
                variant: "destructive"
            });
            return;
        }

        await handleSaveTemplate({
            name: newTemplateName,
            description: newTemplateDescription,
            isDefault: false
        });

        setIsSaveDialogOpen(false);
        setNewTemplateName('');
        setNewTemplateDescription('');
    };

    const steps = [
        { id: 1, name: 'Template', icon: Sparkles, description: 'Choose or create a template' },
        { id: 2, name: 'Customize', icon: Image, description: 'Customize your prompt' },
        { id: 3, name: 'Generate', icon: Rocket, description: 'Generate your image' },
        { id: 4, name: 'Design', icon: Palette, description: 'Design & Export' },
    ];

    const handleSelectTemplate = (template: LaunchPostTemplate) => {
        setSelectedTemplate(template);
        setCurrentPrompt(template.prompt);
        setCurrentStep(2);
    };

    const handlePromptChange = (updatedPrompt: LaunchPostPrompt) => {
        setCurrentPrompt(updatedPrompt);
    };

    const handleImageGenerated = (imageUrl: string) => {
        setGeneratedImage(imageUrl);
        setGeneratedImage(imageUrl);
        setCurrentStep(4);
    };

    const handleCreateNew = () => {
        setSelectedTemplate(null);
        setCurrentPrompt({ ...DEFAULT_PROMPT, subject: { ...DEFAULT_PROMPT.subject, primary: 'A delicious gourmet burger with melting cheese' } });
        setCurrentStep(2);
    };

    const handleSaveTemplate = async (templateData: { name: string; description: string; isDefault: boolean }) => {
        if (!currentPrompt) return;
        setIsSavingTemplate(true);
        try {
            await createTemplate({
                name: templateData.name,
                description: templateData.description,
                prompt: currentPrompt,
                isDefault: templateData.isDefault
            });
            toast({
                title: "Template saved",
                description: "Your template has been saved successfully.",
            });
            setRefreshTemplatesTrigger(prev => prev + 1);
        } catch (error) {
            console.error('Failed to save template:', error);
            toast({
                title: "Error",
                description: "Failed to save template. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSavingTemplate(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Steps Navigation - Only show if not in Design mode, OR keep it but maybe simplified */}
            {currentStep !== 4 && (
                <nav aria-label="Progress">
                    <ol role="list" className="space-y-4 md:flex md:space-x-8 md:space-y-0 text-center justify-center">
                        {steps.map((step) => (
                            <li key={step.name} className="md:flex-1">
                                <button
                                    onClick={() => step.id < currentStep ? setCurrentStep(step.id) : null}
                                    className={`group flex flex-col items-center border-l-4 md:border-l-0 md:border-t-4 py-2 pl-4 md:pl-0 md:pt-4 md:pb-0 ${step.id <= currentStep ? 'border-primary' : 'border-gray-200 hover:border-gray-300'
                                        } w-full`}
                                >
                                    <span className={`text-sm font-medium ${step.id <= currentStep ? 'text-primary' : 'text-gray-500'}`}>
                                        Step {step.id}
                                    </span>
                                    <span className="text-sm font-medium">{step.name}</span>
                                </button>
                            </li>
                        ))}
                    </ol>
                </nav>
            )}

            <div className="mt-6">
                {currentStep === 1 && (
                    <TemplateManager
                        onSelectTemplate={handleSelectTemplate}
                        refreshTrigger={refreshTemplatesTrigger}
                        onCreateTemplate={handleCreateNew}
                    />
                )}

                {currentStep === 2 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-end gap-2 mb-4">
                            <Button
                                variant="outline"
                                onClick={() => setIsAdvancedMode(!isAdvancedMode)}
                            >
                                {isAdvancedMode ? 'Switch to Simple Mode' : 'Switch to Advanced Mode'}
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => setIsSaveDialogOpen(true)}
                                className="gap-2"
                            >
                                <Save className="w-4 h-4" />
                                Save as Template
                            </Button>
                        </div>

                        {isAdvancedMode ? (
                            <PromptEditor
                                prompt={currentPrompt || DEFAULT_PROMPT}
                                onChange={handlePromptChange}
                            />
                        ) : (
                            <SimplePromptEditor
                                prompt={currentPrompt || DEFAULT_PROMPT}
                                onChange={handlePromptChange}
                                onToggleAdvanced={() => setIsAdvancedMode(!isAdvancedMode)}
                            />
                        )}

                        <div className="flex justify-end mt-6">
                            <Button
                                size="lg"
                                onClick={() => setCurrentStep(3)}
                                disabled={!currentPrompt?.subject.primary || currentPrompt.subject.primary.trim() === ''}
                            >
                                Next: Generate <Rocket className="ml-2 w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {currentStep === 3 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <ImageGenerator
                            prompt={currentPrompt || DEFAULT_PROMPT}
                            onImageGenerated={handleImageGenerated}
                        />
                        <div className="flex justify-between mt-6">
                            <Button variant="outline" onClick={() => setCurrentStep(2)}>
                                Back to Customize
                            </Button>
                        </div>
                    </div>
                )}

                {currentStep === 4 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-200px)]">
                        <CanvasEditor
                            initialImage={generatedImage}
                            onBack={() => setCurrentStep(3)}
                        />
                    </div>
                )}
            </div>
            {/* Save Template Dialog */}
            <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save as Template</DialogTitle>
                        <DialogDescription>
                            Save your current prompt settings to reuse later.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Template Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g. Cinematic Food Shot"
                                value={newTemplateName}
                                onChange={(e) => setNewTemplateName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Textarea
                                id="description"
                                placeholder="Briefly describe what this template does..."
                                value={newTemplateDescription}
                                onChange={(e) => setNewTemplateDescription(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>Cancel</Button>
                        <Button onClick={onSaveSubmit} disabled={isSavingTemplate}>
                            {isSavingTemplate && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Template
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
