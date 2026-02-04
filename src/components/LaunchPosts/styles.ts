import { LaunchPostPrompt } from '@/types/launchPosts';

export interface StylePreset {
    id: string;
    name: string;
    description: string;
    previewImage: string;
    apply: (current: LaunchPostPrompt) => Partial<LaunchPostPrompt>;
}

export const STYLE_PRESETS: StylePreset[] = [
    {
        id: 'cinematic',
        name: 'Cinematic',
        description: 'Dramatic lighting, high contrast, movie-like quality',
        previewImage: '/images/styles/cinematic.png',
        apply: (current) => ({
            camera: {
                ...current.camera,
                framing: 'Wide shot',
                angle: 'Low angle',
                lens: '35mm'
            },
            lighting: {
                ...current.lighting,
                quality: 'Hard',
                direction: 'Backlight',
                colorTemperature: 'Warm'
            },
            style: {
                ...current.style,
                artDirection: 'Cinematic',
                mood: 'Dramatic'
            }
        })
    },
    {
        id: 'studio',
        name: 'Studio Clean',
        description: 'Professional, bright, evenly lit, clean background',
        previewImage: '/images/styles/studio.png',
        apply: (current) => ({
            camera: {
                ...current.camera,
                framing: 'Medium shot',
                angle: 'Eye-level',
                lens: '50mm',
                aperture: 'f/8'
            },
            lighting: {
                ...current.lighting,
                quality: 'Soft diffused',
                direction: 'Studio lighting',
                source: 'Softbox'
            },
            setting: {
                ...current.setting,
                environment: 'Infinity cove',
                atmosphere: 'Clean'
            },
            style: {
                ...current.style,
                artDirection: 'Commercial',
                mood: 'Professional'
            }
        })
    },
    {
        id: 'vibrant',
        name: 'Vibrant Pop',
        description: 'Punchy colors, high saturation, energetic',
        previewImage: '/images/styles/vibrant.png',
        apply: (current) => ({
            lighting: {
                ...current.lighting,
                quality: 'Hard',
                colorTemperature: 'Cool'
            },
            colorPlate: {
                primaryColors: ['#FF00FF', '#00FFFF'],
                accentColors: ['#FFFF00']
            },
            style: {
                ...current.style,
                artDirection: 'Pop Art',
                mood: 'Energetic'
            }
        })
    },
    {
        id: 'nature',
        name: 'Natural & Organic',
        description: 'Soft sunlight, earth tones, outdoor feel',
        previewImage: '/images/styles/nature.png',
        apply: (current) => ({
            lighting: {
                ...current.lighting,
                source: 'Sunlight',
                colorTemperature: 'Golden Hour'
            },
            setting: {
                ...current.setting,
                environment: 'Outdoors',
                atmosphere: 'Peaceful'
            },
            style: {
                ...current.style,
                mood: 'Organic'
            }
        })
    },
    {
        id: 'dark_moody',
        name: 'Dark & Moody',
        description: 'Shadowy, mysterious, elegant',
        previewImage: '/images/styles/dark.png',
        apply: (current) => ({
            lighting: {
                ...current.lighting,
                quality: 'Low key',
                direction: 'Side lighting',
                shadowPlay: 'Deep shadows'
            },
            style: {
                ...current.style,
                mood: 'Mysterious'
            }
        })
    },
    {
        id: 'cyberpunk',
        name: 'Neon Cyberpunk',
        description: 'Futuristic, neon lights, night time',
        previewImage: '/images/styles/cyberpunk.png',
        apply: (current) => ({
            lighting: {
                ...current.lighting,
                source: 'Neon lights',
                colorTemperature: 'Mixed'
            },
            setting: {
                ...current.setting,
                timeOfDay: 'Night'
            },
            style: {
                ...current.style,
                artDirection: 'Cyberpunk',
                mood: 'Futuristic'
            }
        })
    }
];
