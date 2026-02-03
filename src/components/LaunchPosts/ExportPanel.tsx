import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Share2, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface ExportPanelProps {
    finalImage: string;
    templateName: string;
}

export function ExportPanel({ finalImage, templateName }: ExportPanelProps) {
    const [copied, setCopied] = useState(false);

    const handleDownload = (format: 'png' | 'jpg') => {
        const link = document.createElement('a');
        link.href = finalImage;
        link.download = `launch-post-${templateName.toLowerCase().replace(/\s+/g, '-')}.${format}`;
        link.click();
    };

    const handleCopyToClipboard = async () => {
        try {
            const response = await fetch(finalImage);
            const blob = await response.blob();
            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob })
            ]);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy image:', err);
            alert('Failed to copy image to clipboard');
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="p-6">
                    <img
                        src={finalImage}
                        alt="Final launch post"
                        className="w-full h-auto rounded-lg shadow-lg"
                    />
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                    onClick={() => handleDownload('png')}
                    className="bg-homemade-orange hover:bg-homemade-orange-dark"
                    size="lg"
                >
                    <Download className="h-5 w-5 mr-2" />
                    Download PNG
                </Button>

                <Button
                    onClick={() => handleDownload('jpg')}
                    variant="outline"
                    size="lg"
                >
                    <Download className="h-5 w-5 mr-2" />
                    Download JPG
                </Button>

                <Button
                    onClick={handleCopyToClipboard}
                    variant="outline"
                    size="lg"
                >
                    {copied ? (
                        <>
                            <Check className="h-5 w-5 mr-2" />
                            Copied!
                        </>
                    ) : (
                        <>
                            <Copy className="h-5 w-5 mr-2" />
                            Copy to Clipboard
                        </>
                    )}
                </Button>

                <Button
                    onClick={() => {
                        if (navigator.share) {
                            navigator.share({
                                title: 'Launch Post',
                                text: 'Check out my launch post!',
                                url: finalImage
                            }).catch(console.error);
                        } else {
                            alert('Sharing is not supported on this device');
                        }
                    }}
                    variant="outline"
                    size="lg"
                >
                    <Share2 className="h-5 w-5 mr-2" />
                    Share
                </Button>
            </div>

            <div className="text-center text-sm text-gray-500">
                <p>Your launch post is ready! Download or share it directly.</p>
            </div>
        </div>
    );
}
