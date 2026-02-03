import { LaunchPostTemplate } from '../types/launchPosts';

export const defaultTemplates: LaunchPostTemplate[] = [
    {
        id: 'rubber-stamp',
        name: 'Rubber Stamp Design',
        description: 'Grunge rubber stamp with vintage aesthetic',
        isDefault: true,
        createdAt: new Date('2024-01-01'),
        prompt: {
            camera: {
                model: 'Scanner / High-Res Digital Capture',
                lens: 'Macro Lens 100mm',
                aperture: 'f/11',
                shutter: '1/100',
                iso: '100',
                framing: 'Macro close-up, centered on the graphic element.',
                angle: 'Direct overhead (Flat lay).',
                movement: 'Static.',
            },
            subject: {
                primary: 'A circular rubber stamp imprint with a grunge texture.',
                secondary: 'The text content within the stamp design.',
                pose: 'Centered on a clean white background.',
                expression: 'N/A',
                build: 'Graphic design element.',
            },
            character: {
                hair: 'N/A',
                wardrobeNotes: 'N/A',
                props: [
                    'A bold, stamped typography design.',
                    'Central rectangular banner containing the word "HOMEMADE" in bold, distressed block letters.',
                    'Circular borders enclosing the central banner.',
                    'Curved text along the top and bottom arcs mirroring the style (e.g., "QUALITY" or repeating "HOMEMADE").',
                ],
            },
            materialPhysics: {
                fabricBehavior: 'N/A',
                surfaceQuality: 'The ink appears uneven, with "noise" and missing speckles characteristic of a dry rubber stamp on paper.',
                lightInteraction: 'Matte finish, no reflections, purely graphical ink density variations.',
            },
            skinRendering: {
                textureDetail: 'N/A',
                finish: 'N/A',
                retouchingStyle: 'N/A',
            },
            composition: {
                theory: 'Centralized graphic composition.',
                depth: 'Flat, 2D plane.',
                focus: 'Sharp focus on the entire graphic.',
            },
            setting: {
                environment: 'Isolated on white.',
                timeOfDay: 'N/A',
                atmosphere: 'Industrial, rustic, authentic.',
                shadowPlay: 'None (flat graphic).',
            },
            lighting: {
                source: 'Even, flat scanning light.',
                direction: 'Frontal.',
                quality: 'Even illumination to highlight the stamp texture.',
                colorTemperature: 'Neutral.',
            },
            style: {
                artDirection: 'Grunge graphic design, vintage rubber stamp aesthetic.',
                mood: 'Authentic, rustic, verified.',
                references: ['Rubber stamp textures', 'Grunge typography', 'Vintage postage marks'],
            },
            rendering: {
                engine: '2D Graphic / Photorealistic texture scan.',
                fidelitySpec: 'High resolution, capturing the grain of the ink and the paper texture in the negative space.',
                postProcessing: 'High contrast to separate the orange ink from the white background.',
            },
            colorPlate: {
                primaryColors: ['#FFA500'],
                accentColors: ['#FFFFFF'],
            },
            negative_prompt: 'red, approved, clean vector, solid lines, perfect coverage, digital text, black ink, blue ink, 3D render, low resolution, blurry',
        },
    },
    {
        id: 'cafe-window',
        name: 'Cafe Window Scene',
        description: 'Hands reaching from takeout window with diverse food items',
        isDefault: true,
        createdAt: new Date('2024-01-01'),
        prompt: {
            camera: {
                model: 'Canon EOS R5',
                lens: 'Canon RF 50mm f/1.2L USM',
                aperture: 'f/5.6',
                shutter: '1/200',
                iso: '400',
                framing: 'Medium shot, vertical orientation, capturing the window frame and a portion of the exterior wall.',
                angle: 'Eye-level, straight-on perspective.',
                movement: 'Static, handheld feel for spontaneity but sharp focus.',
            },
            subject: {
                primary: 'Three hands reaching out vertically from a partially open takeout window.',
                secondary: 'The architectural details of a vibrant orange window frame against a rough, cream-colored stone wall.',
                pose: 'Three distinct arms stacked vertically. Top arm holds a cup, middle arm holds a food item, bottom arm holds a different food item.',
                expression: 'N/A (faceless)',
                build: 'Human arms/hands.',
            },
            character: {
                hair: 'N/A',
                wardrobeNotes: 'Top arm: Long black sleeve. Middle arm: Bare skin. Bottom arm: Long black sleeve with a silver ring on the ring finger.',
                props: [
                    'Top: Clear plastic cup with a Japanese matcha latte, foam art visible.',
                    'Middle: A vibrant Mexican street taco on a small paper plate, with carnitas, onions, cilantro, and salsa.',
                    'Bottom: A small ceramic plate with three Greek dolmades and a lemon wedge.',
                ],
            },
            materialPhysics: {
                fabricBehavior: 'Black fabric sleeves appear soft and knit.',
                surfaceQuality: 'The exterior wall is highly textured, porous, and weathered stone. The window frame is smooth, matte-painted wood in vibrant orange. The window glass is reflective.',
                lightInteraction: 'The window glass reflects a classical white building from across the street. The plastic cup shows transparency and liquid density.',
            },
            skinRendering: {
                textureDetail: 'Realistic skin texture on the hands, showing natural creases and knuckles.',
                finish: 'Natural matte.',
                retouchingStyle: 'Minimal, authentic look.',
            },
            composition: {
                theory: 'Vertical stacking element within a split composition (wall on left, window on right).',
                depth: 'Moderate depth of field; the hands and food are the focal point, with the reflected background in the glass slightly sharp.',
                focus: 'Sharp focus on the three food items and hands.',
            },
            setting: {
                environment: 'Exterior of a trendy urban cafe.',
                timeOfDay: 'Daytime, late afternoon.',
                atmosphere: 'Inviting, casual, international cuisine vibe.',
                shadowPlay: 'Soft, natural shadows from the window frame and hands, defining form without being harsh.',
            },
            lighting: {
                source: 'Natural daylight.',
                direction: 'Side-lighting from the left, creating subtle modeling.',
                quality: 'Soft, natural, diffused daylight with gentle shadowing for depth, avoiding flat, even illumination.',
                colorTemperature: 'Warm, natural daylight, not overly cool or sterile.',
            },
            style: {
                artDirection: 'Editorial lifestyle photography with a focus on minimalism, diverse cuisine, and realistic lighting.',
                mood: 'Playful, welcoming, authentic, and culturally rich.',
                references: ['Cafe lifestyle photography', 'Editorial food styling', 'Kinfolk aesthetic', 'Natural light photography'],
            },
            rendering: {
                engine: 'Photorealistic render.',
                fidelitySpec: 'High resolution, capturing the details of each diverse food item, the matcha foam, the taco ingredients, and the dolmades with lifelike accuracy.',
                postProcessing: 'Natural, true-to-life color grading with gentle contrast, avoiding oversaturation or artificial vibrance.',
            },
            colorPlate: {
                primaryColors: ['#E67E22', '#F5E6D3', '#7CB342'],
                accentColors: ['#C0392B', '#2E7D32', '#F9E79F'],
            },
            negative_prompt: 'text, typography, blurry, distorted hands, extra fingers, messy composition, neon colors, night time, indoor shot, low resolution, watermark, cartoon, sage green frame, oversaturated, artificial lighting',
        },
    },
    {
        id: 'chef-portrait',
        name: 'Chef Portrait',
        description: 'Professional chef in orange apron in modern kitchen',
        isDefault: true,
        createdAt: new Date('2024-01-01'),
        prompt: {
            camera: {
                model: 'Canon EOS R5',
                lens: 'Canon RF 50mm f/1.2L USM',
                aperture: 'f/2.8',
                shutter: '1/125',
                iso: '400',
                framing: 'Medium shot, waist-up portrait, centered composition.',
                angle: 'Eye-level, straight-on perspective.',
                movement: 'Static.',
            },
            subject: {
                primary: 'A professional chef standing behind a kitchen counter with plated dishes.',
                secondary: 'Modern kitchen environment with professional equipment and warm lighting.',
                pose: 'Standing confidently with hands resting on the counter, leaning slightly forward.',
                expression: 'Warm, welcoming smile.',
                build: 'Average build, professional demeanor.',
            },
            character: {
                hair: 'Dark, curly hair.',
                wardrobeNotes: 'White chef\'s jacket with orange apron over it. The apron has a small chest pocket.',
                props: [
                    'Multiple white plates with beautifully plated dishes arranged on the counter.',
                    'Professional kitchen equipment visible in the background (espresso machine, pots, knives).',
                    'Warm pendant lights hanging above.',
                ],
            },
            materialPhysics: {
                fabricBehavior: 'Crisp white chef\'s jacket with natural wrinkles. Orange apron with slight texture and natural draping.',
                surfaceQuality: 'Marble or light-colored stone countertop with natural patterns. Stainless steel equipment with subtle reflections.',
                lightInteraction: 'Soft reflections on the countertop and equipment. Fabric absorbs light naturally with subtle highlights.',
            },
            skinRendering: {
                textureDetail: 'Natural skin texture with visible pores and facial hair.',
                finish: 'Natural matte with slight shine from kitchen warmth.',
                retouchingStyle: 'Minimal retouching, authentic and approachable look.',
            },
            composition: {
                theory: 'Rule of thirds with subject centered, balanced by kitchen elements on sides.',
                depth: 'Shallow depth of field with sharp focus on the chef, slightly soft background.',
                focus: 'Sharp focus on the chef\'s face and upper body, with plated dishes also in focus.',
            },
            setting: {
                environment: 'Modern, well-equipped professional kitchen with warm, inviting atmosphere.',
                timeOfDay: 'Daytime with supplemental warm lighting.',
                atmosphere: 'Professional yet welcoming, showcasing culinary expertise.',
                shadowPlay: 'Soft shadows that add dimension without being harsh.',
            },
            lighting: {
                source: 'Mixed lighting: natural daylight from windows and warm pendant lights above.',
                direction: 'Frontal and slightly from above, creating even illumination.',
                quality: 'Soft, diffused lighting with warm tones that create an inviting atmosphere.',
                colorTemperature: 'Warm (3000-3500K) creating a cozy, professional kitchen ambiance.',
            },
            style: {
                artDirection: 'Professional editorial photography with lifestyle elements, emphasizing authenticity and craftsmanship.',
                mood: 'Confident, welcoming, professional, passionate about food.',
                references: ['Chef portraits', 'Culinary editorial photography', 'Professional kitchen photography', 'Lifestyle food content'],
            },
            rendering: {
                engine: 'Photorealistic render.',
                fidelitySpec: 'High resolution capturing fine details of food plating, fabric textures, and kitchen equipment.',
                postProcessing: 'Natural color grading with warm tones, slight contrast enhancement, maintaining authentic feel.',
            },
            colorPlate: {
                primaryColors: ['#FFFFFF', '#E67E22', '#2C3E50'],
                accentColors: ['#ECF0F1', '#95A5A6', '#F39C12'],
            },
            negative_prompt: 'blurry, distorted features, unnatural lighting, oversaturated colors, messy kitchen, unprofessional appearance, cartoon, low resolution, watermark, text overlay, neon colors, artificial look',
        },
    },
];

// Helper function to get template by ID
export const getTemplateById = (id: string): LaunchPostTemplate | undefined => {
    return defaultTemplates.find(template => template.id === id);
};

// Helper function to get all default templates
export const getDefaultTemplates = (): LaunchPostTemplate[] => {
    return defaultTemplates.filter(template => template.isDefault);
};
