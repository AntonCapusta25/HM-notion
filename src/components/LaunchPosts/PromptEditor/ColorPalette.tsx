import { HexColorPicker } from 'react-colorful';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ColorPlate } from '@/types/launchPosts';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';

interface ColorPaletteProps {
    colorPlate: ColorPlate;
    onChange: (colorPlate: ColorPlate) => void;
}

export function ColorPalette({ colorPlate, onChange }: ColorPaletteProps) {
    const [showPrimaryPicker, setShowPrimaryPicker] = useState(false);
    const [showAccentPicker, setShowAccentPicker] = useState(false);
    const [tempColor, setTempColor] = useState('#000000');

    const addPrimaryColor = () => {
        onChange({
            ...colorPlate,
            primaryColors: [...colorPlate.primaryColors, tempColor]
        });
        setShowPrimaryPicker(false);
        setTempColor('#000000');
    };

    const addAccentColor = () => {
        onChange({
            ...colorPlate,
            accentColors: [...colorPlate.accentColors, tempColor]
        });
        setShowAccentPicker(false);
        setTempColor('#000000');
    };

    const removePrimaryColor = (index: number) => {
        onChange({
            ...colorPlate,
            primaryColors: colorPlate.primaryColors.filter((_, i) => i !== index)
        });
    };

    const removeAccentColor = (index: number) => {
        onChange({
            ...colorPlate,
            accentColors: colorPlate.accentColors.filter((_, i) => i !== index)
        });
    };

    return (
        <div className="space-y-6">
            {/* Primary Colors */}
            <div className="space-y-3">
                <Label>Primary Colors</Label>
                <div className="flex flex-wrap gap-2">
                    {colorPlate.primaryColors.map((color, index) => (
                        <div key={index} className="relative group">
                            <div
                                className="w-12 h-12 rounded-lg border-2 border-gray-200 shadow-sm cursor-pointer"
                                style={{ backgroundColor: color }}
                                title={color}
                            />
                            <Button
                                variant="destructive"
                                size="sm"
                                className="absolute -top-2 -right-2 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removePrimaryColor(index)}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                            <span className="absolute -bottom-6 left-0 text-xs text-gray-500 font-mono">
                                {color}
                            </span>
                        </div>
                    ))}
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-12 h-12"
                        onClick={() => setShowPrimaryPicker(!showPrimaryPicker)}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
                {showPrimaryPicker && (
                    <div className="p-4 border rounded-lg bg-white shadow-lg">
                        <HexColorPicker color={tempColor} onChange={setTempColor} />
                        <div className="mt-3 flex gap-2">
                            <Input value={tempColor} onChange={(e) => setTempColor(e.target.value)} className="font-mono" />
                            <Button onClick={addPrimaryColor}>Add</Button>
                            <Button variant="outline" onClick={() => setShowPrimaryPicker(false)}>Cancel</Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Accent Colors */}
            <div className="space-y-3">
                <Label>Accent Colors</Label>
                <div className="flex flex-wrap gap-2">
                    {colorPlate.accentColors.map((color, index) => (
                        <div key={index} className="relative group">
                            <div
                                className="w-12 h-12 rounded-lg border-2 border-gray-200 shadow-sm cursor-pointer"
                                style={{ backgroundColor: color }}
                                title={color}
                            />
                            <Button
                                variant="destructive"
                                size="sm"
                                className="absolute -top-2 -right-2 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeAccentColor(index)}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                            <span className="absolute -bottom-6 left-0 text-xs text-gray-500 font-mono">
                                {color}
                            </span>
                        </div>
                    ))}
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-12 h-12"
                        onClick={() => setShowAccentPicker(!showAccentPicker)}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
                {showAccentPicker && (
                    <div className="p-4 border rounded-lg bg-white shadow-lg">
                        <HexColorPicker color={tempColor} onChange={setTempColor} />
                        <div className="mt-3 flex gap-2">
                            <Input value={tempColor} onChange={(e) => setTempColor(e.target.value)} className="font-mono" />
                            <Button onClick={addAccentColor}>Add</Button>
                            <Button variant="outline" onClick={() => setShowAccentPicker(false)}>Cancel</Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
