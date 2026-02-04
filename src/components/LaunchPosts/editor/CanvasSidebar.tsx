import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Type, Image as ImageIcon, Scissors, Loader2, Download, Undo, Redo } from 'lucide-react';
import { CanvasElement } from './types';

interface CanvasSidebarProps {
    addText: () => void;
    handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleBackgroundUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleRemoveBackground: () => void;
    isRemovingBg: boolean;
    isExporting: boolean;
    handleExport: (format: 'png' | 'jpg') => void;
    backgroundColor: string;
    setBackgroundColor: (color: string) => void;
    selectedElement: CanvasElement | undefined;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
}

export function CanvasSidebar({
    addText,
    handleLogoUpload,
    handleBackgroundUpload,
    handleRemoveBackground,
    isRemovingBg,
    isExporting,
    handleExport,
    backgroundColor,
    setBackgroundColor,
    selectedElement,
    undo,
    redo,
    canUndo,
    canRedo
}: CanvasSidebarProps) {
    return (
        <Card className="border-0 shadow-none bg-transparent">
            <CardContent className="p-0 space-y-6">
                <div className="space-y-4">
                    <Label className="text-lg font-bold">Tools</Label>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={undo} disabled={!canUndo} className="flex-1">
                            <Undo className="w-4 h-4 mr-2" /> Undo
                        </Button>
                        <Button size="sm" variant="outline" onClick={redo} disabled={!canRedo} className="flex-1">
                            <Redo className="w-4 h-4 mr-2" /> Redo
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <Button onClick={addText} variant="outline" className="w-full">
                            <Type className="w-4 h-4 mr-2" />
                            Text
                        </Button>

                        <div className="relative">
                            <Button variant="outline" className="w-full relative">
                                <ImageIcon className="w-4 h-4 mr-2" />
                                Logo
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                            </Button>
                        </div>

                        <Button
                            onClick={handleRemoveBackground}
                            variant="outline"
                            className="w-full col-span-2"
                            disabled={!selectedElement || selectedElement.type !== 'image' || isRemovingBg}
                        >
                            {isRemovingBg ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Scissors className="w-4 h-4 mr-2" />
                                    Remove BG (Select Image)
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Background Controls */}
                    <div className="space-y-2 pt-4 border-t">
                        <Label>Background</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="relative">
                                <Button variant="ghost" className="w-full relative justify-start px-2 border">
                                    <ImageIcon className="w-4 h-4 mr-2" />
                                    Image
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleBackgroundUpload}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                </Button>
                            </div>
                            <div className="flex gap-1">
                                <Input
                                    type="color"
                                    value={backgroundColor}
                                    onChange={(e) => setBackgroundColor(e.target.value)}
                                    className="w-full h-10 p-1 cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t">
                    <Button
                        size="lg"
                        className="w-full bg-homemade-orange hover:bg-homemade-orange-dark shadow-lg"
                        onClick={() => handleExport('png')}
                        disabled={isExporting}
                    >
                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-5 h-5 mr-2" />}
                        {isExporting ? 'Exporting...' : 'Export Design'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
