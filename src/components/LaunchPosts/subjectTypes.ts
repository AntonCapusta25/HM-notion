import { LaunchPostPrompt } from '@/types/launchPosts';

export interface SubjectType {
    id: string;
    name: string;
    description: string;
    previewImage: string;
    apply: (current: LaunchPostPrompt) => Partial<LaunchPostPrompt>;
}

export const SUBJECT_TYPES: SubjectType[] = [
    {
        id: 'food',
        name: 'Gourmet Food',
        description: 'Plated dishes, ingredients, beverages',
        previewImage: '/images/subjects/food.png',
        apply: (current) => ({
            subject: { ...current.subject, secondary: 'Clean surface' },
            camera: { ...current.camera, framing: 'Medium shot', angle: '45-degree' }
        })
    },
    {
        id: 'chef',
        name: 'Chef Portrait',
        description: 'Professional headshots, cooking action',
        previewImage: '/images/subjects/chef.png',
        apply: (current) => ({
            subject: { ...current.subject, pose: 'Professional', expression: 'Confidant' },
            camera: { ...current.camera, framing: 'Waist-up', angle: 'Eye-level' }
        })
    },
    {
        id: 'stamp',
        name: 'Rubber Stamp',
        description: 'Vintage, grunge, official marks',
        previewImage: '/images/subjects/stamp.png',
        apply: (current) => ({
            style: { ...current.style, artDirection: 'Vintage Graphic', mood: 'Official' },
            rendering: { ...current.rendering, postProcessing: 'Monochrome, Grunge texture' },
            lighting: { ...current.lighting, quality: 'Flat' }
        })
    },
    {
        id: 'sticker',
        name: 'Logo / Sticker',
        description: 'Die-cut, bold colors, vector style',
        previewImage: '/images/subjects/sticker.png',
        apply: (current) => ({
            style: { ...current.style, artDirection: 'Vector Illustration', mood: 'Playful' },
            lighting: { ...current.lighting, quality: 'Flat', shadowPlay: 'None' },
            rendering: { ...current.rendering, engine: '2D Vector' },
            subject: { ...current.subject, secondary: 'Solid background' }
        })
    }
];
