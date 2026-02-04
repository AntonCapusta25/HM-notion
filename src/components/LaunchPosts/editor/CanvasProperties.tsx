import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Trash2, MousePointer2, Sparkles } from 'lucide-react';
import { CanvasElement } from './types';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CanvasPropertiesProps {
    selectedElement: CanvasElement | undefined;
    updateElement: (id: string, updates: Partial<CanvasElement>) => void;
    deleteSelected: () => void;
    FONTS: { name: string; value: string }[];
}

export function CanvasProperties({ selectedElement, updateElement, deleteSelected, FONTS }: CanvasPropertiesProps) {
    if (!selectedElement) {
        return (
            <div className="p-8 text-center text-gray-400 border-2 border-dashed rounded-lg bg-gray-50 h-full flex flex-col items-center justify-center">
                <MousePointer2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                Select an element to edit
            </div>
        );
    }

    return (
        <Card className="animate-in slide-in-from-right-4 h-full border-0 shadow-none">
            <CardContent className="p-0 space-y-4">
                <div className="flex justify-between items-center">
                    <Label className="font-bold">
                        {selectedElement.type === 'text' ? 'Text Style' : 'Image Style'}
                    </Label>
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={deleteSelected}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>

                {selectedElement.type === 'text' ? (
                    <>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center mb-1">
                                <Label>Content</Label>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button size="sm" variant="ghost" className="h-6 text-purple-600 hover:text-purple-700 hover:bg-purple-50 px-2 rounded-full">
                                            <Sparkles className="w-3 h-3 mr-1" /> Magic Write
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuItem onClick={() => {
                                            // Mock AI Latency
                                            const original = selectedElement.content;
                                            updateElement(selectedElement.id, { content: '✨ Writing...' });
                                            setTimeout(() => {
                                                updateElement(selectedElement.id, { content: `Generic Professional: ${original}` });
                                            }, 800);
                                        }}>
                                            <Sparkles className="w-3 h-3 mr-2 text-purple-500" /> Rewrite Professional
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => {
                                            const original = selectedElement.content;
                                            updateElement(selectedElement.id, { content: '✨ Writing...' });
                                            setTimeout(() => {
                                                updateElement(selectedElement.id, { content: `${original} 🚀✨` });
                                            }, 800);
                                        }}>
                                            <Sparkles className="w-3 h-3 mr-2 text-pink-500" /> Rewrite Fun
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => {
                                            const original = selectedElement.content;
                                            updateElement(selectedElement.id, { content: '✨ Checking...' });
                                            setTimeout(() => {
                                                updateElement(selectedElement.id, { content: original.trim() }); // Mock valid
                                            }, 800);
                                        }}>
                                            <Sparkles className="w-3 h-3 mr-2 text-blue-500" /> Fix Spelling
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <Input
                                value={selectedElement.content}
                                onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Font</Label>
                            <Select
                                value={selectedElement.fontFamily}
                                onValueChange={(val) => updateElement(selectedElement.id, { fontFamily: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {FONTS.map(f => (
                                        <SelectItem key={f.name} value={f.value} style={{ fontFamily: f.value }}>
                                            {f.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Color</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="color"
                                    value={selectedElement.color}
                                    onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                                    className="h-10 w-full"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Style</Label>
                            <div className="flex gap-2">
                                <Button
                                    variant={selectedElement.fontWeight === 'bold' ? 'default' : 'outline'}
                                    size="icon"
                                    onClick={() => updateElement(selectedElement.id, {
                                        fontWeight: selectedElement.fontWeight === 'bold' ? 'normal' : 'bold'
                                    })}
                                >
                                    <span className="font-bold">B</span>
                                </Button>
                                <Button
                                    variant={selectedElement.fontStyle === 'italic' ? 'default' : 'outline'}
                                    size="icon"
                                    onClick={() => updateElement(selectedElement.id, {
                                        fontStyle: selectedElement.fontStyle === 'italic' ? 'normal' : 'italic'
                                    })}
                                >
                                    <span className="italic">I</span>
                                </Button>
                                <Button
                                    variant={selectedElement.textDecoration === 'underline' ? 'default' : 'outline'}
                                    size="icon"
                                    onClick={() => updateElement(selectedElement.id, {
                                        textDecoration: selectedElement.textDecoration === 'underline' ? 'none' : 'underline'
                                    })}
                                >
                                    <span className="underline">U</span>
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Size ({selectedElement.fontSize ? Math.round(selectedElement.fontSize) : 24}px)</Label>
                            <Input
                                type="number"
                                value={Math.round(selectedElement.fontSize || 24)}
                                onChange={(e) => updateElement(selectedElement.id, { fontSize: Number(e.target.value) })}
                            />
                        </div>
                    </>
                ) : (
                    <div className="text-sm text-gray-500">
                        <p>Resize using the handles on the image.</p>
                        <p className="mt-2">Dimensions: {Math.round(selectedElement.width)} x {Math.round(selectedElement.height)}</p>
                    </div>
                )}

                <div className="space-y-2">
                    <Label>Opacity ({Math.round((selectedElement.opacity || 1) * 100)}%)</Label>
                    <Slider
                        defaultValue={[selectedElement.opacity || 1]}
                        max={1}
                        step={0.01}
                        onValueChange={(val) => updateElement(selectedElement.id, { opacity: val[0] })}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
