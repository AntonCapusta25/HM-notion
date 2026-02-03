import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles, AlertCircle, Download } from 'lucide-react';
import { LaunchPostPrompt } from '@/types/launchPosts';
import { generateImage } from '@/utils/launchPostsApi';

interface ImageGeneratorProps {
    prompt: LaunchPostPrompt;
    onImageGenerated: (imageUrl: string) => void;
}

export function ImageGenerator({ prompt, onImageGenerated }: ImageGeneratorProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);

        try {
            const response = await generateImage(prompt);

            if (response.success && response.imageUrl) {
                setGeneratedImage(response.imageUrl);
                onImageGenerated(response.imageUrl);
            } else if (response.success && response.imageData) {
                // Handle base64 image data
                const imageUrl = `data:image/png;base64,${response.imageData}`;
                setGeneratedImage(imageUrl);
                onImageGenerated(imageUrl);
            } else {
                setError(response.error || 'Failed to generate image');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-4">
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {!generatedImage ? (
                <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gradient-to-br from-homemade-orange to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Generate</h3>
                    <p className="text-sm text-gray-500 mb-6">
                        Click the button below to generate your image using AI
                    </p>
                    <Button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="bg-homemade-orange hover:bg-homemade-orange-dark"
                        size="lg"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-5 w-5 mr-2" />
                                Generate Image
                            </>
                        )}
                    </Button>
                </div>
            ) : (
                <div className="space-y-4">
                    <Card>
                        <CardContent className="p-4">
                            <img
                                src={generatedImage}
                                alt="Generated launch post"
                                className="w-full h-auto rounded-lg"
                            />
                        </CardContent>
                    </Card>

                    <div className="flex gap-2 justify-center">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setGeneratedImage(null);
                                setError(null);
                            }}
                        >
                            Generate New Image
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                const link = document.createElement('a');
                                link.href = generatedImage;
                                link.download = 'generated-image.png';
                                link.click();
                            }}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Download Original
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
