import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { GripVertical, Eye, EyeOff, Lock, Unlock, Trash2, Image as ImageIcon, Type } from 'lucide-react';
import { CanvasElement } from './types';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface LayersPanelProps {
    elements: CanvasElement[];
    setElements: (elements: CanvasElement[]) => void;
    selectedId: string | null;
    setSelectedId: (id: string | null) => void;
}

interface SortableLayerItemProps {
    element: CanvasElement;
    isSelected: boolean;
    onSelect: () => void;
    onToggleVisibility: (e: React.MouseEvent) => void;
    onToggleLock: (e: React.MouseEvent) => void;
}

function SortableLayerItem({ element, isSelected, onSelect, onToggleVisibility, onToggleLock }: SortableLayerItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: element.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-2 p-2 rounded-md border text-sm cursor-pointer mb-2
                ${isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 hover:bg-gray-50'}
                ${element.locked ? 'opacity-75' : ''}
            `}
            onClick={onSelect}
        >
            <div {...attributes} {...listeners} className="cursor-grab hover:text-gray-600 text-gray-400">
                <GripVertical className="w-4 h-4" />
            </div>

            <div className="flex-1 flex items-center gap-2 truncate">
                {element.type === 'text' ? <Type className="w-3 h-3 text-blue-500" /> : <ImageIcon className="w-3 h-3 text-purple-500" />}
                <span className="truncate max-w-[120px]">
                    {element.type === 'text' ? (element.content || 'Text') : 'Image'}
                </span>
            </div>

            <div className="flex gap-1">
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={onToggleLock}
                >
                    {element.locked ? <Lock className="w-3 h-3 text-red-500" /> : <Unlock className="w-3 h-3 text-gray-400" />}
                </Button>
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={onToggleVisibility}
                >
                    {element.visible === false ? <EyeOff className="w-3 h-3 text-gray-400" /> : <Eye className="w-3 h-3 text-gray-600" />}
                </Button>
            </div>
        </div>
    );
}

export function LayersPanel({ elements, setElements, selectedId, setSelectedId }: LayersPanelProps) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            const oldIndex = elements.findIndex((el) => el.id === active.id);
            const newIndex = elements.findIndex((el) => el.id === over?.id);

            // Reverse logic because layers are rendered bottom-to-top in canvas (0 is back),
            // but top-to-bottom in list (0 is top).
            // Actually, usually List Index 0 = Top Layer = Last Element in Array.
            // Let's decide: Array [0..N] -> 0 is back, N is front.
            // List: Top item should be N (Front), Bottom item 0 (Back).
            // So we need to reverse the list for display, or handle the reorder carefully.

            // Simplest: Display array in reverse order (Front first).
            // When moving in list from i to j: 
            // We'll perform the move on the reversed copy, then un-reverse it for source of truth.

            const reversedElements = [...elements].reverse();
            const oldReversedIndex = reversedElements.findIndex(el => el.id === active.id);
            const newReversedIndex = reversedElements.findIndex(el => el.id === over?.id);

            const newReversed = arrayMove(reversedElements, oldReversedIndex, newReversedIndex);
            setElements(newReversed.reverse());
        }
    };

    const toggleLock = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setElements(elements.map(el => el.id === id ? { ...el, locked: !el.locked } : el));
    };

    const toggleVisibility = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setElements(elements.map(el => el.id === id ? { ...el, visible: (el.visible === false ? true : false) } : el));
    };

    // Render in reverse order so top layers are at the top of the list
    const displayElements = [...elements].reverse();

    return (
        <Card className="h-full border-0 shadow-none">
            <CardContent className="p-0">
                <div className="mb-4 flex items-center justify-between">
                    <Label className="font-bold">Layers</Label>
                </div>

                <div className="space-y-1">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={displayElements.map(el => el.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {displayElements.map((el) => (
                                <SortableLayerItem
                                    key={el.id}
                                    element={el}
                                    isSelected={el.id === selectedId}
                                    onSelect={() => setSelectedId(el.id)}
                                    onToggleLock={(e) => toggleLock(e, el.id)}
                                    onToggleVisibility={(e) => toggleVisibility(e, el.id)}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>

                    {elements.length === 0 && (
                        <div className="text-center text-sm text-gray-400 py-8">
                            No layers
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
