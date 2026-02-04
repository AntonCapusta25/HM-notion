import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Trash2, MousePointer2 } from 'lucide-react';
import { CanvasElement } from './types';

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
                            <Label>Content</Label>
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
