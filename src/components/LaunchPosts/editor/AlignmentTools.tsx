import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AlignCenter, AlignHorizontalJustifyCenter, AlignHorizontalJustifyStart, AlignHorizontalJustifyEnd, AlignVerticalJustifyCenter, AlignVerticalJustifyStart, AlignVerticalJustifyEnd } from 'lucide-react';
import { CanvasElement } from './types';

interface AlignmentToolsProps {
    selectedId: string | null;
    elements: CanvasElement[];
    updateElement: (id: string, updates: Partial<CanvasElement>) => void;
    CanvasSize: number; // e.g. 600
}

export function AlignmentTools({ selectedId, elements, updateElement, CanvasSize = 600 }: AlignmentToolsProps) {
    if (!selectedId) return null;

    const handleAlign = (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
        const el = elements.find(e => e.id === selectedId);
        if (!el) return;

        const elWidth = el.type === 'image' ? el.width : (el.width || 200); // approx logic for text width if missing
        const elHeight = el.type === 'image' ? el.height : (el.height || 50);

        let updates: Partial<CanvasElement> = {};

        switch (type) {
            case 'left':
                updates = { x: 0 };
                break;
            case 'center':
                updates = { x: (CanvasSize - elWidth) / 2 };
                break;
            case 'right':
                updates = { x: CanvasSize - elWidth };
                break;
            case 'top':
                updates = { y: 0 };
                break;
            case 'middle':
                updates = { y: (CanvasSize - elHeight) / 2 };
                break;
            case 'bottom':
                updates = { y: CanvasSize - elHeight };
                break;
        }

        updateElement(selectedId, updates);
    };

    return (
        <Card className="border-0 shadow-none bg-transparent mb-4">
            <CardContent className="p-0">
                <Label className="text-xs font-semibold mb-2 block uppercase text-gray-500">Alignment</Label>
                <div className="flex flex-wrap gap-1">
                    <Button variant="outline" size="icon" onClick={() => handleAlign('left')} title="Align Left">
                        <AlignHorizontalJustifyStart className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleAlign('center')} title="Center Horizontally">
                        <AlignCenter className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleAlign('right')} title="Align Right">
                        <AlignHorizontalJustifyEnd className="w-4 h-4" />
                    </Button>
                    <div className="w-px h-8 bg-gray-200 mx-1" />
                    <Button variant="outline" size="icon" onClick={() => handleAlign('top')} title="Align Top">
                        <AlignVerticalJustifyStart className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleAlign('middle')} title="Center Vertically">
                        <AlignVerticalJustifyCenter className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleAlign('bottom')} title="Align Bottom">
                        <AlignVerticalJustifyEnd className="w-4 h-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
