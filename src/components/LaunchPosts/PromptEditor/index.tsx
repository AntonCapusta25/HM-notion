import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LaunchPostPrompt } from '@/types/launchPosts';
import { CameraSettings } from './CameraSettings';
import { SubjectEditor } from './SubjectEditor';
import { LightingStyleEditor } from './LightingStyleEditor';
import { ColorPalette } from './ColorPalette';
import { Camera, User, Lightbulb, Palette } from 'lucide-react';

interface PromptEditorProps {
    prompt: LaunchPostPrompt;
    onChange: (prompt: LaunchPostPrompt) => void;
}

export function PromptEditor({ prompt, onChange }: PromptEditorProps) {
    const [activeTab, setActiveTab] = useState('camera');

    return (
        <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="camera" className="flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        <span className="hidden sm:inline">Camera</span>
                    </TabsTrigger>
                    <TabsTrigger value="subject" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span className="hidden sm:inline">Subject</span>
                    </TabsTrigger>
                    <TabsTrigger value="lighting" className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" />
                        <span className="hidden sm:inline">Lighting</span>
                    </TabsTrigger>
                    <TabsTrigger value="colors" className="flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        <span className="hidden sm:inline">Colors</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="camera" className="mt-4">
                    <CameraSettings
                        settings={prompt.camera}
                        onChange={(camera) => onChange({ ...prompt, camera })}
                    />
                </TabsContent>

                <TabsContent value="subject" className="mt-4">
                    <SubjectEditor
                        subject={prompt.subject}
                        character={prompt.character}
                        onSubjectChange={(subject) => onChange({ ...prompt, subject })}
                        onCharacterChange={(character) => onChange({ ...prompt, character })}
                    />
                </TabsContent>

                <TabsContent value="lighting" className="mt-4">
                    <LightingStyleEditor
                        lighting={prompt.lighting}
                        setting={prompt.setting}
                        style={prompt.style}
                        onLightingChange={(lighting) => onChange({ ...prompt, lighting })}
                        onSettingChange={(setting) => onChange({ ...prompt, setting })}
                        onStyleChange={(style) => onChange({ ...prompt, style })}
                    />
                </TabsContent>

                <TabsContent value="colors" className="mt-4">
                    <ColorPalette
                        colorPlate={prompt.colorPlate}
                        onChange={(colorPlate) => onChange({ ...prompt, colorPlate })}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
