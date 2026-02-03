import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Loader2, Scissors, AlertCircle, Upload, Image as ImageIcon } from 'lucide-react';
import { removeImageBackground, composeWithBackground } from '@/utils/backgroundRemoval';

interface BackgroundProcessorProps {
    originalImage: string;
    onProcessed: (processedImage: string) => void;
}

export function BackgroundProcessor({ originalImage, onProcessed }: BackgroundProcessorProps) {
    const [isRemoving, setIsRemoving] = useState(false);
    const [progress, setProgress] = useState(0);
    const [removedBgImage, setRemovedBgImage] = useState<string | null>(null);
    const [selectedBackground, setSelectedBackground] = useState<string | null>(null);
    const [finalImage, setFinalImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('high');

    const handleRemoveBackground = async () => {
        setIsRemoving(true);
        setError(null);
        setProgress(0);

        try {
            const result = await removeImageBackground(
                originalImage,
                (p) => setProgress(p),
                { quality, outputFormat: 'image/png' }
            );
            setRemovedBgImage(result.imageUrl);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to remove background');
        } finally {
            setIsRemoving(false);
        }
    };

    const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setSelectedBackground(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCompose = async () => {
        if (!removedBgImage || !selectedBackground) return;

        try {
            const composed = await composeWithBackground(removedBgImage, selectedBackground, {
                outputQuality: 1.0,
            });
            setFinalImage(composed);
            onProcessed(composed);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to compose image');
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

            {/* Step 1: Remove Background */}
            {!removedBgImage ? (
                <div className="space-y-4">
                    <Card>
                        <CardContent className="p-4">
                            <img
                                src={originalImage}
                                alt="Original"
                                className="w-full h-auto rounded-lg"
                            />
                        </CardContent>
                    </Card>

                    {isRemoving && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span>Removing background...</span>
                                <span>{progress}%</span>
                            </div>
                            <Progress value={progress} />
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <label className="text-sm font-medium">Quality:</label>
                            <div className="flex gap-2">
                                {(['low', 'medium', 'high'] as const).map((q) => (
                                    <Button
                                        key={q}
                                        variant={quality === q ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setQuality(q)}
                                        disabled={isRemoving}
                                        className={quality === q ? 'bg-homemade-orange hover:bg-homemade-orange-dark' : ''}
                                    >
                                        {q.charAt(0).toUpperCase() + q.slice(1)}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="text-center">
                            <Button
                                onClick={handleRemoveBackground}
                                disabled={isRemoving}
                                className="bg-homemade-orange hover:bg-homemade-orange-dark"
                                size="lg"
                            >
                                {isRemoving ? (
                                    <>
                                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Scissors className="h-5 w-5 mr-2" />
                                        Remove Background
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                /* Step 2: Select Background & Compose */
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardContent className="p-4">
                                <p className="text-sm font-medium mb-2">Background Removed</p>
                                <img
                                    src={removedBgImage}
                                    alt="Background removed"
                                    className="w-full h-auto rounded-lg bg-checkered"
                                />
                            </CardContent>
                        </Card>

                        {selectedBackground && (
                            <Card>
                                <CardContent className="p-4">
                                    <p className="text-sm font-medium mb-2">Selected Background</p>
                                    <img
                                        src={selectedBackground}
                                        alt="Background"
                                        className="w-full h-auto rounded-lg"
                                    />
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {finalImage && (
                        <Card>
                            <CardContent className="p-4">
                                <p className="text-sm font-medium mb-2">Final Composition</p>
                                <img
                                    src={finalImage}
                                    alt="Final"
                                    className="w-full h-auto rounded-lg"
                                />
                            </CardContent>
                        </Card>
                    )}

                    <div className="flex gap-2 justify-center">
                        <Button variant="outline" asChild>
                            <label className="cursor-pointer">
                                <Upload className="h-4 w-4 mr-2" />
                                Upload Background
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleBackgroundUpload}
                                    className="hidden"
                                />
                            </label>
                        </Button>

                        {selectedBackground && !finalImage && (
                            <Button
                                onClick={handleCompose}
                                className="bg-homemade-orange hover:bg-homemade-orange-dark"
                            >
                                <ImageIcon className="h-4 w-4 mr-2" />
                                Compose Image
                            </Button>
                        )}

                        {finalImage && (
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSelectedBackground(null);
                                    setFinalImage(null);
                                }}
                            >
                                Try Different Background
                            </Button>
                        )}
                    </div>
                </div>
            )}

            <style>{`
        .bg-checkered {
          background-image: 
            linear-gradient(45deg, #ccc 25%, transparent 25%),
            linear-gradient(-45deg, #ccc 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #ccc 75%),
            linear-gradient(-45deg, transparent 75%, #ccc 75%);
          background-size: 20px 20px;
          background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
        }
      `}</style>
        </div>
    );
}
