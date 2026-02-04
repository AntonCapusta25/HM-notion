export interface BaseElement {
    id: string;
    x: number;
    y: number;
    rotation: number;
    opacity: number;
    locked?: boolean;
    visible?: boolean;
}

export interface ImageElement extends BaseElement {
    type: 'image';
    src: string;
    width: number;
    height: number;
    isMain?: boolean;
}

export interface TextElement extends BaseElement {
    type: 'text';
    content: string;
    fontSize: number;
    fontFamily: string;
    color: string;
    fontWeight: string;
    width?: number;
    height?: number;
}

export type CanvasElement = TextElement | ImageElement;
