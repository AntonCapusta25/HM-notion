import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Palette, Shuffle, Type } from 'lucide-react';
import { useState } from 'react';

interface BrandPanelProps {
    onApplyColor: (color: string) => void;
    onApplyFont: (font: string) => void;
    onShuffle: (colors: string[]) => void;
    FONTS: { name: string; value: string }[];
}

export function BrandPanel({ onApplyColor, onApplyFont, onShuffle, FONTS }: BrandPanelProps) {
    // Mock persistent state (in a real app, this would come from the database/user profile)
    const [brandColors, setBrandColors] = useState<string[]>(['#FF5722', '#2196F3', '#4CAF50', '#FFC107']);
    const [brandHeadings, setBrandHeadings] = useState<string>('Inter');
    const [brandBody, setBrandBody] = useState<string>('Roboto');

    const addColor = () => {
        setBrandColors([...brandColors, '#000000']);
    };

    const removeColor = (index: number) => {
        setBrandColors(brandColors.filter((_, i) => i !== index));
    };

    const updateColor = (index: number, newColor: string) => {
        const newColors = [...brandColors];
        newColors[index] = newColor;
        setBrandColors(newColors);
    };

    return (
        <Card className="h-full border-0 shadow-none">
            <CardContent className="p-0 space-y-6">
                <div>
                    <h3 className="font-bold text-lg mb-2 flex items-center">
                        <Palette className="w-5 h-5 mr-2" /> Brand Kit
                    </h3>
                    <p className="text-xs text-gray-500 mb-4">
                        Manage your brand's logos, colors, and fonts to ensure consistency across all your designs.
                    </p>
                </div>

                {/* Colors Section */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label className="font-semibold">Brand Colors</Label>
                        <Button variant="ghost" size="sm" onClick={() => onShuffle(brandColors)} title="Shuffle brand colors on canvas">
                            <Shuffle className="w-4 h-4 mr-1" /> Shuffle
                        </Button>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                        {brandColors.map((color, index) => (
                            <div key={index} className="relative group">
                                <div
                                    className="w-10 h-10 rounded-full cursor-pointer shadow-sm border border-gray-200 transition-transform hover:scale-110"
                                    style={{ backgroundColor: color }}
                                    onClick={() => onApplyColor(color)}
                                />
                                <div className="absolute -top-1 -right-1 hidden group-hover:block z-10">
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="h-4 w-4 rounded-full"
                                        onClick={(e) => { e.stopPropagation(); removeColor(index); }}
                                    >
                                        <Trash2 className="w-2 h-2" />
                                    </Button>
                                </div>
                                <Input
                                    type="color"
                                    value={color}
                                    onChange={(e) => updateColor(index, e.target.value)}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                            </div>
                        ))}
                        <Button variant="outline" size="icon" className="w-10 h-10 rounded-full border-dashed" onClick={addColor}>
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <Separator />

                {/* Fonts Section */}
                <div className="space-y-4">
                    <Label className="font-semibold flex items-center">
                        <Type className="w-4 h-4 mr-2" /> Brand Fonts
                    </Label>

                    <div className="space-y-2">
                        <Label className="text-xs text-gray-500">Heading</Label>
                        <div className="flex items-center gap-2">
                            <select
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={brandHeadings}
                                onChange={(e) => {
                                    setBrandHeadings(e.target.value);
                                    onApplyFont(e.target.value);
                                }}
                            >
                                {FONTS.map(f => (
                                    <option key={f.name} value={f.value} style={{ fontFamily: f.value }}>
                                        {f.name}
                                    </option>
                                ))}
                            </select>
                            <Button size="sm" variant="ghost" onClick={() => onApplyFont(brandHeadings)}>Apply</Button>
                        </div>
                        <p className="text-3xl font-bold truncate" style={{ fontFamily: brandHeadings }}>
                            Heading
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs text-gray-500">Body</Label>
                        <div className="flex items-center gap-2">
                            <select
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={brandBody}
                                onChange={(e) => {
                                    setBrandBody(e.target.value);
                                    onApplyFont(e.target.value);
                                }}
                            >
                                {FONTS.map(f => (
                                    <option key={f.name} value={f.value} style={{ fontFamily: f.value }}>
                                        {f.name}
                                    </option>
                                ))}
                            </select>
                            <Button size="sm" variant="ghost" onClick={() => onApplyFont(brandBody)}>Apply</Button>
                        </div>
                        <p className="text-sm truncate" style={{ fontFamily: brandBody }}>
                            The quick brown fox jumps over the lazy dog.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
