import { useState } from 'react';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Rocket, Sparkles, Image, Layers, Download, Save, Loader2 } from 'lucide-react';
import { LaunchPostTemplate, LaunchPostPrompt } from '@/types/launchPosts';
import { TemplateManager } from '@/components/LaunchPosts/TemplateManager';
import { PromptEditor } from '@/components/LaunchPosts/PromptEditor';
import { ImageGenerator } from '@/components/LaunchPosts/ImageGenerator';
import { BackgroundProcessor } from '@/components/LaunchPosts/BackgroundProcessor';
import { ExportPanel } from '@/components/LaunchPosts/ExportPanel';
import { createTemplate } from '@/utils/launchPostsApi';
import { useToast } from '@/hooks/use-toast';

export default function LaunchPosts() {
    const [currentStep, setCurrentStep] = useState(1);
    const [selectedTemplate, setSelectedTemplate] = useState<LaunchPostTemplate | null>(null);
    const [currentPrompt, setCurrentPrompt] = useState<LaunchPostPrompt | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [refreshTemplatesTrigger, setRefreshTemplatesTrigger] = useState(0);
    const { toast } = useToast();

    const steps = [
        { id: 1, name: 'Template', icon: Sparkles, description: 'Choose or create a template' },
        { id: 2, name: 'Customize', icon: Image, description: 'Customize your prompt' },
        { id: 3, name: 'Generate', icon: Rocket, description: 'Generate your image' },
        { id: 4, name: 'Process', icon: Layers, description: 'Remove background & compose' },
        { id: 5, name: 'Export', icon: Download, description: 'Download final image' },
    ];

    const handleSelectTemplate = (template: LaunchPostTemplate) => {
        setSelectedTemplate(template);
        setCurrentPrompt(template.prompt);
    };

    const handleNext = () => {
        if (currentStep === 1 && !selectedTemplate) {
            toast({
                title: "No template selected",
                description: "Please select a template to continue.",
                variant: "destructive"
            });
            return;
        }
        if (currentStep === 3 && !generatedImage) {
            toast({
                title: "No image generated",
                description: "Please generate an image first.",
                variant: "destructive"
            });
            return;
        }
        if (currentStep === 4 && !processedImage) {
            toast({
                title: "Image not processed",
                description: "Please process the image first.",
                variant: "destructive"
            });
            return;
        }
        setCurrentStep(Math.min(5, currentStep + 1));
    };

    const handlePrevious = () => {
        setCurrentStep(Math.max(1, currentStep - 1));
    };

    const saveAsTemplate = async () => {
        if (!currentPrompt) return;

        const templateName = prompt('Enter template name:');
        if (!templateName) return;

        setIsSavingTemplate(true);
        try {
            await createTemplate({
                name: templateName,
                description: 'Custom template',
                prompt: currentPrompt,
                isDefault: false
            });

            toast({
                title: "Template saved",
                description: "Your custom template has been saved to the database."
            });

            // Trigger refresh in TemplateManager
            setRefreshTemplatesTrigger(prev => prev + 1);
        } catch (error) {
            console.error('Failed to save template:', error);
            toast({
                title: "Error saving template",
                description: "Failed to save to database. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsSavingTemplate(false);
        }
    };

    const handleImageGenerated = (imageUrl: string) => {
        setGeneratedImage(imageUrl);
    };

    const handleImageProcessed = (imageUrl: string) => {
        setProcessedImage(imageUrl);
    };

    const handleCreateTemplate = () => {
        // Initialize with default empty/skeleton prompt
        const defaultPrompt: LaunchPostPrompt = {
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
                primary: 'A delicious food item',
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

        setCurrentPrompt(defaultPrompt);
        setSelectedTemplate(null); // Clear selected template since this is new
        setCurrentStep(2); // Go to Customize step
    };

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-homemade-orange rounded-xl flex items-center justify-center">
                            <Rocket className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Launch Post Generator</h1>
                            <p className="text-sm text-gray-500">Create stunning launch posts with AI-powered image generation</p>
                        </div>
                    </div>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center justify-between">
                    {steps.map((step, index) => (
                        <div key={step.id} className="flex items-center flex-1">
                            <div className="flex flex-col items-center flex-1">
                                <div
                                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${currentStep >= step.id
                                        ? 'bg-homemade-orange text-white'
                                        : 'bg-gray-200 text-gray-400'
                                        }`}
                                >
                                    <step.icon className="h-5 w-5" />
                                </div>
                                <div className="mt-2 text-center">
                                    <p
                                        className={`text-sm font-medium ${currentStep >= step.id ? 'text-gray-900' : 'text-gray-400'
                                            }`}
                                    >
                                        {step.name}
                                    </p>
                                    <p className="text-xs text-gray-500 hidden sm:block">{step.description}</p>
                                </div>
                            </div>
                            {index < steps.length - 1 && (
                                <div
                                    className={`h-1 flex-1 mx-4 transition-colors ${currentStep > step.id ? 'bg-homemade-orange' : 'bg-gray-200'
                                        }`}
                                />
                            )}
                        </div>
                    ))}
                </div>

                {/* Main Content Area */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>{steps[currentStep - 1].name}</CardTitle>
                                <CardDescription>{steps[currentStep - 1].description}</CardDescription>
                            </div>
                            {currentStep === 2 && currentPrompt && (
                                <Button
                                    variant="outline"
                                    onClick={saveAsTemplate}
                                    disabled={isSavingTemplate}
                                >
                                    {isSavingTemplate ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Save className="h-4 w-4 mr-2" />
                                    )}
                                    Save as Template
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Step 1: Template Selection */}
                        {currentStep === 1 && (
                            <TemplateManager
                                onSelectTemplate={handleSelectTemplate}
                                selectedTemplateId={selectedTemplate?.id}
                                refreshTrigger={refreshTemplatesTrigger}
                                onCreateTemplate={handleCreateTemplate}
                            />
                        )}

                        {/* Step 2: Customize Prompt */}
                        {currentStep === 2 && currentPrompt && (
                            <PromptEditor
                                prompt={currentPrompt}
                                onChange={setCurrentPrompt}
                            />
                        )}

                        {/* Step 3: Generate Image */}
                        {currentStep === 3 && currentPrompt && (
                            <ImageGenerator
                                prompt={currentPrompt}
                                onImageGenerated={handleImageGenerated}
                            />
                        )}

                        {/* Step 4: Process Background */}
                        {currentStep === 4 && generatedImage && (
                            <BackgroundProcessor
                                originalImage={generatedImage}
                                onProcessed={handleImageProcessed}
                            />
                        )}

                        {/* Step 5: Export */}
                        {currentStep === 5 && processedImage && selectedTemplate && (
                            <ExportPanel
                                finalImage={processedImage}
                                templateName={selectedTemplate.name}
                            />
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex gap-2 justify-between mt-8 pt-6 border-t">
                            <Button
                                variant="outline"
                                onClick={handlePrevious}
                                disabled={currentStep === 1}
                            >
                                Previous
                            </Button>
                            <Button
                                onClick={handleNext}
                                disabled={currentStep === 5}
                                className="bg-homemade-orange hover:bg-homemade-orange-dark"
                            >
                                {currentStep === 5 ? 'Done' : 'Next'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Selected Template Info */}
                {selectedTemplate && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Selected Template</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-homemade-orange to-orange-600 rounded-lg flex items-center justify-center">
                                    <Sparkles className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <p className="font-medium">{selectedTemplate.name}</p>
                                    <p className="text-sm text-gray-500">{selectedTemplate.description}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </Layout>
    );
}
