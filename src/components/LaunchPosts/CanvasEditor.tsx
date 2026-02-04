import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Type, Image as ImageIcon, Palette, Trash2, Scissors, Loader2, Move, MousePointer2, Copy, Layers, ChevronUp, ChevronDown, RotateCw, Undo, Redo, Grid, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import { removeImageBackground } from '@/utils/backgroundRemoval';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CanvasProperties } from './editor/CanvasProperties';
import { CanvasSidebar } from './editor/CanvasSidebar';
import { LayersPanel } from './editor/LayersPanel';
import { AlignmentTools } from './editor/AlignmentTools';
import { BrandPanel } from './editor/BrandPanel';
import { CanvasElement, ImageElement, TextElement } from './editor/types';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
} from "@/components/ui/context-menu"

interface CanvasEditorProps {
    initialImage?: string; // Made optional to support templates with no bg image
    initialState?: CanvasElement[]; // For loading templates
    onSave?: (imageUrl: string) => void;
    onBack?: () => void;
}

// Expanded Font List
const FONTS = [
    { name: 'Inter', value: 'Inter, sans-serif' },
    { name: 'Playfair Display', value: '"Playfair Display", serif' },
    { name: 'Roboto', value: '"Roboto", sans-serif' },
    { name: 'Montserrat', value: '"Montserrat", sans-serif' },
    { name: 'Lobster', value: '"Lobster", cursive' },
    { name: 'Oswald', value: '"Oswald", sans-serif' },
    { name: 'Oswald', value: '"Oswald", sans-serif' },
    { name: 'New Spirit (Custom)', value: 'NewSpirit, serif' },
    { name: 'Canela (Display)', value: 'ui-serif, Georgia, serif' }, // Simulated
    { name: 'Editorial New', value: '"Times New Roman", Times, serif' }, // Simulated
    { name: 'Geist (Sans)', value: 'ui-sans-serif, system-ui, sans-serif' }
];

export function CanvasEditor({ initialImage, initialState, onSave, onBack }: CanvasEditorProps) {
    const [elements, setElements] = useState<CanvasElement[]>(initialState || []);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const [backgroundImage, setBackgroundImage] = useState<string | null>(initialImage || null);
    const [history, setHistory] = useState<CanvasElement[][]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // If initialImage or initialState changes, update (useful for template switching)
    useEffect(() => {
        if (initialState) {
            setElements(initialState);
            setHistory([initialState]);
            setHistoryIndex(0);
        }
    }, [initialState]);

    useEffect(() => {
        if (initialImage) {
            setBackgroundImage(initialImage);
        }
    }, [initialImage]);

    // Save history
    const addToHistory = (newElements: CanvasElement[]) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newElements);
        if (newHistory.length > 20) newHistory.shift();
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        setElements(newElements);
    };

    const undo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(prev => prev - 1);
            setElements(history[historyIndex - 1]);
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(prev => prev + 1);
            setElements(history[historyIndex + 1]);
        }
    };

    // UI State
    const [isExporting, setIsExporting] = useState(false);
    const [isRemovingBg, setIsRemovingBg] = useState(false);

    // Interaction State
    const canvasRef = useRef<HTMLDivElement>(null);
    const dragItem = useRef<{ id: string; startX: number; startY: number; initialX: number; initialY: number } | null>(null);
    const resizeItem = useRef<{
        id: string;
        handle: string;
        startX: number;
        startY: number;
        initialWidth: number;
        initialHeight: number;
        initialFontSize: number;
        initialX: number;
        initialY: number
    } | null>(null);
    const rotateItem = useRef<{ id: string; startX: number; startY: number; startRotation: number; centerX: number; centerY: number } | null>(null);

    // Initialize Main Image as a Layer
    useEffect(() => {
        // Only add initialImage if we started with NO state (i.e. fresh blank canvas with just an image)
        // If we loaded a template (initialState has items), respect that instead.
        if (initialImage && (!initialState || initialState.length === 0)) {
            const img = new Image();
            img.onload = () => {
                // Calculate fit within 600x600 canvas while maintaining aspect ratio
                const MAX_SIZE = 600;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height = height * (MAX_SIZE / width);
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width = width * (MAX_SIZE / height);
                        height = MAX_SIZE;
                    }
                }

                // Check if main image already exists to avoid duplicate on re-renders
                setElements(prev => {
                    if (prev.some(el => el.type === 'image' && el.isMain)) return prev;

                    const newEl: ImageElement = {
                        id: 'main-image',
                        type: 'image',
                        src: initialImage,
                        x: (600 - width) / 2,
                        y: (600 - height) / 2,
                        width,
                        height,
                        rotation: 0,
                        opacity: 1,
                        isMain: true
                    };
                    return [newEl, ...prev];
                });
            };
            img.src = initialImage;
        }
    }, [initialImage, initialState]);

    // --- Actions ---

    const addText = () => {
        const newElement: TextElement = {
            id: crypto.randomUUID(),
            type: 'text',
            content: 'Double click to edit',
            x: 200,
            y: 200,
            rotation: 0,
            opacity: 1,
            fontSize: 24,
            fontFamily: 'Inter, sans-serif',
            color: '#000000',
            fontWeight: 'bold'
        };
        setElements(prev => [...prev, newElement]);
        setSelectedId(newElement.id);
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const aspectRatio = img.width / img.height;
                    const width = 150;
                    const height = 150 / aspectRatio;
                    const newElement: ImageElement = {
                        id: crypto.randomUUID(),
                        type: 'image',
                        src: e.target?.result as string,
                        x: 225, // Center-ish
                        y: 225,
                        width,
                        height,
                        rotation: 0,
                        opacity: 1
                    };
                    setElements(prev => [...prev, newElement]);
                    setSelectedId(newElement.id);
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setBackgroundImage(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveBackground = async () => {
        const selectedElement = elements.find(el => el.id === selectedId);
        if (!selectedElement || selectedElement.type !== 'image') {
            alert('Please select an image first');
            return;
        }

        setIsRemovingBg(true);
        try {
            const result = await removeImageBackground(
                selectedElement.src,
                undefined,
                { quality: 'high', outputFormat: 'image/png' }
            );

            updateElement(selectedElement.id, { src: result.imageUrl });
        } catch (err) {
            console.error('Failed to remove background:', err);
        } finally {
            setIsRemovingBg(false);
        }
    };

    // --- Brand Kit Handlers ---

    const handleApplyBrandColor = (color: string) => {
        if (!selectedId) return;
        updateElement(selectedId, { color });
    };

    const handleApplyBrandFont = (fontFamily: string) => {
        if (!selectedId) return;
        updateElement(selectedId, { fontFamily });
    };

    const handleShuffleBrand = (colors: string[]) => {
        // Randomly assign colors to all text elements
        const shuffled = elements.map(el => {
            if (el.type === 'text') {
                const randomColor = colors[Math.floor(Math.random() * colors.length)];
                return { ...el, color: randomColor };
            }
            return el;
        });
        setElements(shuffled);
        addToHistory(shuffled);
    };

    const updateElement = (id: string, updates: Partial<CanvasElement>, saveHistory = true) => {
        // console.log('DEBUG: updateElement', id, updates);
        setElements(prev => {
            const next = prev.map(el => {
                if (el.id === id) {
                    const newEl = { ...el, ...updates } as CanvasElement;
                    // console.log('DEBUG: updating element', newEl);
                    if (Number.isNaN(newEl.x) || Number.isNaN(newEl.y)) {
                        console.error('DEBUG: NaN coordinates detected! Aborting update.', updates, el);
                        return el;
                    }
                    return newEl;
                }
                return el;
            });
            return next;
        });
    };

    // Helper to save history after significant moves
    const saveToHistory = () => {
        addToHistory([...elements]);
    };

    const deleteSelected = () => {
        if (selectedId) {
            setElements(prev => prev.filter(el => el.id !== selectedId));
            setSelectedId(null);
        }
    };

    const duplicateElement = (id: string) => {
        const el = elements.find(e => e.id === id);
        if (el) {
            const newEl = { ...el, id: crypto.randomUUID(), x: el.x + 20, y: el.y + 20 };
            setElements(prev => [...prev, newEl]);
            setSelectedId(newEl.id);
        }
    };

    const moveLayer = (id: string, direction: 'front' | 'back' | 'forward' | 'backward') => {
        const index = elements.findIndex(e => e.id === id);
        if (index === -1) return;

        const newElements = [...elements];
        const el = newElements[index];

        if (direction === 'front') {
            newElements.splice(index, 1);
            newElements.push(el);
        } else if (direction === 'back') {
            newElements.splice(index, 1);
            newElements.unshift(el);
        } else if (direction === 'forward' && index < newElements.length - 1) {
            newElements[index] = newElements[index + 1];
            newElements[index + 1] = el;
        } else if (direction === 'backward' && index > 0) {
            newElements[index] = newElements[index - 1];
            newElements[index - 1] = el;
        }
        addToHistory(newElements);
    };

    // --- Interaction Logic (Drag & Resize) ---

    // Mouse Down on Element (Drag Start)
    const handleElementMouseDown = (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Prevent canvas background click
        console.log('DEBUG: MouseDown', id);
        setSelectedId(id);

        const el = elements.find(e => e.id === id);
        if (!el) {
            console.error('DEBUG: Element not found on MouseDown', id);
            return;
        }

        dragItem.current = {
            id,
            startX: e.clientX,
            startY: e.clientY,
            initialX: el.x,
            initialY: el.y
        };
        console.log('DEBUG: Drag Start', dragItem.current);
    };

    // Rotate Start
    const handleRotateMouseDown = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const el = elements.find(e => e.id === id);
        if (!el) return;

        // Calculate center
        const elWidth = el.type === 'image' ? el.width : 200; // approx for text if width not set
        const elHeight = el.type === 'image' ? el.height : 50;
        // For text, finding exact center is tricky without ref.
        // Simplified: use current x,y as top-left.
        const centerX = el.x + (el.width || 100) / 2;
        const centerY = el.y + (el.height || 50) / 2;

        rotateItem.current = {
            id,
            startX: e.clientX,
            startY: e.clientY,
            startRotation: el.rotation || 0,
            centerX,
            centerY
        };
    };

    // Mouse Down on Handle (Resize Start)
    const handleResizeMouseDown = (e: React.MouseEvent, id: string, handle: string) => {
        e.stopPropagation();
        const el = elements.find(e => e.id === id);
        if (!el) return;

        resizeItem.current = {
            id,
            handle,
            startX: e.clientX,
            startY: e.clientY,
            initialWidth: el.type === 'image' ? el.width : 0,
            initialHeight: el.type === 'image' ? el.height : 0,
            initialFontSize: el.type === 'text' ? el.fontSize : 0,
            initialX: el.x,
            initialY: el.y
        };
    };

    // Global Mouse Move
    const handleMouseMove = (e: React.MouseEvent) => {
        // Handle Dragging
        if (dragItem.current) {
            const { id, startX, startY, initialX, initialY } = dragItem.current;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            updateElement(id, { x: initialX + dx, y: initialY + dy }, false);
            return;
        }

        // Handle Resizing
        if (resizeItem.current) {
            const { id, handle, startX, startY, initialWidth, initialHeight, initialFontSize, initialX, initialY } = resizeItem.current;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            const element = elements.find(el => el.id === id);
            if (!element) return;

            if (element.type === 'image') {
                let newWidth = initialWidth;
                let newHeight = initialHeight;
                let newX = initialX;
                let newY = initialY;

                // Aspect ratio = width / height
                const ratio = initialWidth / initialHeight;

                if (handle === 'se') {
                    newWidth = initialWidth + dx;
                    newHeight = newWidth / ratio;
                } else if (handle === 'sw') {
                    newWidth = initialWidth - dx;
                    newHeight = newWidth / ratio;
                    newX = initialX + dx;
                } else if (handle === 'ne') {
                    newWidth = initialWidth + dx;
                    newHeight = newWidth / ratio;
                    newY = initialY - (newHeight - initialHeight);
                } else if (handle === 'nw') {
                    newWidth = initialWidth - dx;
                    newHeight = newWidth / ratio;
                    newX = initialX + dx;
                    newY = initialY - (newHeight - initialHeight);
                }

                if (newWidth > 20 && newHeight > 20) {
                    updateElement(id, { width: newWidth, height: newHeight, x: newX, y: newY }, false);
                }
            } else if (element.type === 'text') {
                // TEXT RESIZING FIX
                let scaleDelta = 0;
                if (handle === 'se') scaleDelta = dx;
                else if (handle === 'sw') scaleDelta = -dx;
                else if (handle === 'ne') scaleDelta = dx;
                else if (handle === 'nw') scaleDelta = -dx;

                const newFontSize = Math.max(12, initialFontSize + (scaleDelta * 0.5));
                updateElement(id, { fontSize: newFontSize }, false);
            }
            return;
        }

        // Handle Rotation
        if (rotateItem.current) {
            const { id, centerX, centerY, startRotation } = rotateItem.current;
            const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
            // Snap to 45 degrees
            // let rotation = currentAngle + 90; // Adjust offset if needed
            // Simple version:
            updateElement(id, { rotation: currentAngle }, false);
        }
    };

    const handleMouseUp = () => {
        if (dragItem.current || resizeItem.current || rotateItem.current) {
            saveToHistory();
        }
        dragItem.current = null;
        resizeItem.current = null;
        rotateItem.current = null;
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if (e.key === 'Backspace' || e.key === 'Delete') {
                if (selectedId) deleteSelected();
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
                if (e.shiftKey) redo();
                else undo();
                e.preventDefault();
            }

            if (!selectedId) return;
            const el = elements.find(e => e.id === selectedId);
            if (!el) return;

            const shift = e.shiftKey ? 10 : 1;
            if (e.key === 'ArrowUp') updateElement(selectedId, { y: el.y - shift });
            if (e.key === 'ArrowDown') updateElement(selectedId, { y: el.y + shift });
            if (e.key === 'ArrowLeft') updateElement(selectedId, { x: el.x - shift });
            if (e.key === 'ArrowRight') updateElement(selectedId, { x: el.x + shift });
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedId, elements, history, historyIndex]);

    useEffect(() => {
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseUp]);

    // --- Export ---

    const handleExport = async (format: 'png' | 'jpg') => {
        if (!canvasRef.current) return;
        setIsExporting(true);
        setSelectedId(null);

        try {
            const canvas = await html2canvas(canvasRef.current, {
                useCORS: true,
                scale: 2,
                backgroundColor: null
            } as any);

            const url = canvas.toDataURL(`image/${format}`);
            const link = document.createElement('a');
            link.href = url;
            link.download = `design-${Date.now()}.${format}`;
            link.click();

            if (onSave) onSave(url);
        } catch (err) {
            console.error('Export failed:', err);
        } finally {
            setIsExporting(false);
        }
    };

    const selectedElement = elements.find(el => el.id === selectedId);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[800px]" onMouseMove={handleMouseMove}>
            {/* Canvas Area */}
            <div className="lg:col-span-2 bg-gray-100 rounded-xl p-8 flex items-center justify-center overflow-hidden relative select-none">
                <div
                    ref={canvasRef}
                    className="relative w-[600px] h-[600px] shadow-2xl overflow-hidden bg-white"
                    onClick={() => setSelectedId(null)}
                    style={{
                        backgroundColor: '#ffffff',
                        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                    }}
                >
                    {elements.map(el => (
                        <ContextMenu key={el.id}>
                            <ContextMenuTrigger asChild>
                                <div
                                    className={cn(
                                        "absolute group",
                                        selectedId === el.id ? "z-50" : "z-10",
                                        el.visible === false ? "hidden" : ""
                                    )}
                                    style={{
                                        transform: `translate(${el.x}px, ${el.y}px) rotate(${el.rotation || 0}deg)`,
                                        width: el.type === 'image' ? el.width : 'auto',
                                        height: el.type === 'image' ? el.height : 'auto',
                                        opacity: el.opacity ?? 1,
                                        cursor: el.locked ? 'not-allowed' : 'move',
                                        pointerEvents: el.visible === false ? 'none' : 'auto'
                                    }}
                                    onMouseDown={(e) => {
                                        if (el.locked) return;
                                        handleElementMouseDown(e, el.id);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* Rotation Handle */}
                                    {selectedId === el.id && (
                                        <div
                                            className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border border-gray-300 rounded-full flex items-center justify-center cursor-alias shadow-sm z-50 hover:bg-gray-50"
                                            onMouseDown={(e) => handleRotateMouseDown(e, el.id)}
                                        >
                                            <RotateCw className="w-3 h-3 text-gray-600" />
                                        </div>
                                    )}

                                    {el.type === 'text' ? (
                                        <div className="relative">
                                            <div
                                                className={cn(
                                                    "p-2 border-2 text-nowrap",
                                                    selectedId === el.id ? "border-orange-500" : "border-transparent group-hover:border-blue-300"
                                                )}
                                                style={{
                                                    fontSize: `${el.fontSize}px`,
                                                    fontFamily: el.fontFamily,
                                                    color: el.color,
                                                    fontWeight: el.fontWeight || 'normal',
                                                    fontStyle: el.fontStyle || 'normal',
                                                    textDecoration: el.textDecoration || 'none',
                                                }}
                                                onDoubleClick={(e) => {
                                                    e.stopPropagation();
                                                    const newText = prompt('Edit text:', el.content);
                                                    if (newText !== null) updateElement(el.id, { content: newText });
                                                }}
                                            >
                                                {el.content}
                                            </div>
                                            {/* Resize Handles for Text */}
                                            {selectedId === el.id && (
                                                <>
                                                    <div
                                                        className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-orange-500 rounded-full cursor-nw-resize"
                                                        onMouseDown={(e) => handleResizeMouseDown(e, el.id, 'nw')}
                                                    />
                                                    <div
                                                        className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-orange-500 rounded-full cursor-ne-resize"
                                                        onMouseDown={(e) => handleResizeMouseDown(e, el.id, 'ne')}
                                                    />
                                                    <div
                                                        className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-orange-500 rounded-full cursor-sw-resize"
                                                        onMouseDown={(e) => handleResizeMouseDown(e, el.id, 'sw')}
                                                    />
                                                    <div
                                                        className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-orange-500 rounded-full cursor-se-resize"
                                                        onMouseDown={(e) => handleResizeMouseDown(e, el.id, 'se')}
                                                    />
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="relative w-full h-full">
                                            <img
                                                src={el.src}
                                                alt="element"
                                                className={cn(
                                                    "w-full h-full object-fill pointer-events-none border-2",
                                                    selectedId === el.id ? "border-orange-500" : "border-transparent group-hover:border-blue-300"
                                                )}
                                            />
                                            {/* Resize Handles for Image */}
                                            {selectedId === el.id && (
                                                <>
                                                    <div
                                                        className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-orange-500 rounded-full cursor-nw-resize"
                                                        onMouseDown={(e) => handleResizeMouseDown(e, el.id, 'nw')}
                                                    />
                                                    <div
                                                        className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-orange-500 rounded-full cursor-ne-resize"
                                                        onMouseDown={(e) => handleResizeMouseDown(e, el.id, 'ne')}
                                                    />
                                                    <div
                                                        className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-orange-500 rounded-full cursor-sw-resize"
                                                        onMouseDown={(e) => handleResizeMouseDown(e, el.id, 'sw')}
                                                    />
                                                    <div
                                                        className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-orange-500 rounded-full cursor-se-resize"
                                                        onMouseDown={(e) => handleResizeMouseDown(e, el.id, 'se')}
                                                    />
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent>
                                <ContextMenuItem onClick={() => duplicateElement(el.id)}>
                                    <Copy className="w-4 h-4 mr-2" /> Duplicate
                                </ContextMenuItem>
                                <ContextMenuSeparator />
                                <ContextMenuItem onClick={() => moveLayer(el.id, 'front')}>
                                    <Layers className="w-4 h-4 mr-2" /> Bring to Front
                                </ContextMenuItem>
                                <ContextMenuItem onClick={() => moveLayer(el.id, 'back')}>
                                    <Layers className="w-4 h-4 mr-2" /> Send to Back
                                </ContextMenuItem>
                                <ContextMenuItem onClick={() => moveLayer(el.id, 'forward')}>
                                    <ChevronUp className="w-4 h-4 mr-2" /> Bring Forward
                                </ContextMenuItem>
                                <ContextMenuItem onClick={() => moveLayer(el.id, 'backward')}>
                                    <ChevronDown className="w-4 h-4 mr-2" /> Send Backward
                                </ContextMenuItem>
                                <ContextMenuSeparator />
                                <ContextMenuItem onClick={() => {
                                    setElements(prev => prev.filter(e => e.id !== el.id));
                                    setSelectedId(null);
                                }} className="text-red-600">
                                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                                </ContextMenuItem>
                            </ContextMenuContent>
                        </ContextMenu>
                    ))}


                </div>
            </div>

            {/* Controls sidebar */}
            <div className="space-y-6 overflow-y-auto pr-2 h-full flex flex-col">
                <Tabs defaultValue="design" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="design">Design</TabsTrigger>
                        <TabsTrigger value="brand">Brand</TabsTrigger>
                        <TabsTrigger value="layers">Position</TabsTrigger>
                    </TabsList>

                    <TabsContent value="design" className="h-[calc(100%-40px)] m-0 pb-10 space-y-6">
                        {/* Sidebar Tools */}
                        <CanvasSidebar
                            addText={addText}
                            handleLogoUpload={handleLogoUpload}
                            handleBackgroundUpload={handleBackgroundUpload}
                            handleRemoveBackground={handleRemoveBackground}
                            isRemovingBg={isRemovingBg}
                            isExporting={isExporting}
                            handleExport={handleExport}

                            selectedElement={selectedElement}
                            undo={undo}
                            redo={redo}
                            canUndo={historyIndex > 0}
                            canRedo={historyIndex < history.length - 1}
                        />

                        {/* Properties Panel */}
                        <CanvasProperties
                            selectedElement={selectedElement}
                            updateElement={updateElement}
                            deleteSelected={deleteSelected}
                            FONTS={FONTS}
                        />
                    </TabsContent>

                    <TabsContent value="brand" className="h-[calc(100%-40px)] m-0 pt-4">
                        <BrandPanel
                            onApplyColor={handleApplyBrandColor}
                            onApplyFont={handleApplyBrandFont}
                            onShuffle={handleShuffleBrand}
                            FONTS={FONTS}
                        />
                    </TabsContent>

                    <TabsContent value="layers" className="space-y-6 mt-4 h-[600px] flex flex-col">
                        <AlignmentTools
                            selectedId={selectedId}
                            elements={elements}
                            updateElement={updateElement}
                            CanvasSize={600}
                        />

                        <LayersPanel
                            elements={elements}
                            setElements={(newEls) => {
                                setElements(newEls);
                                addToHistory(newEls);
                            }}
                            selectedId={selectedId}
                            setSelectedId={setSelectedId}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
