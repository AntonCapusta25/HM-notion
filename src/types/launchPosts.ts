// Launch Post Generator Types

export interface CameraSettings {
    model: string;
    lens: string;
    aperture: string;
    shutter: string;
    iso: string;
    framing: string;
    angle: string;
    movement: string;
}

export interface SubjectSettings {
    primary: string;
    secondary: string;
    pose: string;
    expression: string;
    build: string;
}

export interface CharacterSettings {
    hair: string;
    wardrobeNotes: string;
    props: string[];
}

export interface MaterialPhysics {
    fabricBehavior: string;
    surfaceQuality: string;
    lightInteraction: string;
}

export interface SkinRendering {
    textureDetail: string;
    finish: string;
    retouchingStyle: string;
}

export interface Composition {
    theory: string;
    depth: string;
    focus: string;
}

export interface Setting {
    environment: string;
    timeOfDay: string;
    atmosphere: string;
    shadowPlay: string;
}

export interface Lighting {
    source: string;
    direction: string;
    quality: string;
    colorTemperature: string;
}

export interface Style {
    artDirection: string;
    mood: string;
    references: string[];
}

export interface Rendering {
    engine: string;
    fidelitySpec: string;
    postProcessing: string;
}

export interface ColorPlate {
    primaryColors: string[];
    accentColors: string[];
}

export interface LaunchPostPrompt {
    camera: CameraSettings;
    subject: SubjectSettings;
    character: CharacterSettings;
    materialPhysics: MaterialPhysics;
    skinRendering: SkinRendering;
    composition: Composition;
    setting: Setting;
    lighting: Lighting;
    style: Style;
    rendering: Rendering;
    colorPlate: ColorPlate;
    negative_prompt: string;
}

export interface LaunchPostTemplate {
    id: string;
    name: string;
    description: string;
    thumbnail?: string;
    prompt: LaunchPostPrompt;
    createdAt: Date;
    isDefault: boolean;
}

export interface GeneratedImage {
    id: string;
    originalUrl: string;
    processedUrl?: string;
    backgroundRemovedUrl?: string;
    finalUrl?: string;
    prompt: LaunchPostPrompt;
    createdAt: Date;
}

export interface BackgroundImage {
    id: string;
    name: string;
    url: string;
    thumbnail: string;
    isDefault: boolean;
}
