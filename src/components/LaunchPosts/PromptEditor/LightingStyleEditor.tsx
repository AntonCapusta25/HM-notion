import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Lighting as LightingType, Setting, Style } from '@/types/launchPosts';

interface LightingStyleEditorProps {
    lighting: LightingType;
    setting: Setting;
    style: Style;
    onLightingChange: (lighting: LightingType) => void;
    onSettingChange: (setting: Setting) => void;
    onStyleChange: (style: Style) => void;
}

export function LightingStyleEditor({
    lighting,
    setting,
    style,
    onLightingChange,
    onSettingChange,
    onStyleChange
}: LightingStyleEditorProps) {
    const updateLighting = (field: keyof LightingType, value: string) => {
        onLightingChange({ ...lighting, [field]: value });
    };

    const updateSetting = (field: keyof Setting, value: string) => {
        onSettingChange({ ...setting, [field]: value });
    };

    const updateStyle = (field: keyof Style, value: string | string[]) => {
        onStyleChange({ ...style, [field]: value });
    };

    const updateReferences = (value: string) => {
        const refsArray = value.split('\n').filter(r => r.trim());
        updateStyle('references', refsArray);
    };

    return (
        <div className="space-y-6">
            {/* Lighting */}
            <div className="space-y-4">
                <h3 className="font-medium">Lighting</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="lighting-source">Source</Label>
                        <Input
                            id="lighting-source"
                            value={lighting.source}
                            onChange={(e) => updateLighting('source', e.target.value)}
                            placeholder="e.g., Natural daylight"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="lighting-direction">Direction</Label>
                        <Input
                            id="lighting-direction"
                            value={lighting.direction}
                            onChange={(e) => updateLighting('direction', e.target.value)}
                            placeholder="e.g., Side-lighting from left"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="lighting-quality">Quality</Label>
                        <Input
                            id="lighting-quality"
                            value={lighting.quality}
                            onChange={(e) => updateLighting('quality', e.target.value)}
                            placeholder="e.g., Soft, diffused"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="lighting-temp">Color Temperature</Label>
                        <Input
                            id="lighting-temp"
                            value={lighting.colorTemperature}
                            onChange={(e) => updateLighting('colorTemperature', e.target.value)}
                            placeholder="e.g., Warm (3000K)"
                        />
                    </div>
                </div>
            </div>

            {/* Setting */}
            <div className="space-y-4 border-t pt-4">
                <h3 className="font-medium">Setting</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="setting-environment">Environment</Label>
                        <Input
                            id="setting-environment"
                            value={setting.environment}
                            onChange={(e) => updateSetting('environment', e.target.value)}
                            placeholder="e.g., Modern kitchen"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="setting-time">Time of Day</Label>
                        <Input
                            id="setting-time"
                            value={setting.timeOfDay}
                            onChange={(e) => updateSetting('timeOfDay', e.target.value)}
                            placeholder="e.g., Late afternoon"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="setting-atmosphere">Atmosphere</Label>
                        <Input
                            id="setting-atmosphere"
                            value={setting.atmosphere}
                            onChange={(e) => updateSetting('atmosphere', e.target.value)}
                            placeholder="e.g., Warm and inviting"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="setting-shadows">Shadow Play</Label>
                        <Input
                            id="setting-shadows"
                            value={setting.shadowPlay}
                            onChange={(e) => updateSetting('shadowPlay', e.target.value)}
                            placeholder="e.g., Soft, natural shadows"
                        />
                    </div>
                </div>
            </div>

            {/* Style */}
            <div className="space-y-4 border-t pt-4">
                <h3 className="font-medium">Style</h3>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="style-art">Art Direction</Label>
                        <Textarea
                            id="style-art"
                            value={style.artDirection}
                            onChange={(e) => updateStyle('artDirection', e.target.value)}
                            placeholder="Overall artistic style"
                            rows={2}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="style-mood">Mood</Label>
                        <Input
                            id="style-mood"
                            value={style.mood}
                            onChange={(e) => updateStyle('mood', e.target.value)}
                            placeholder="e.g., Professional, welcoming"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="style-references">References (one per line)</Label>
                        <Textarea
                            id="style-references"
                            value={style.references.join('\n')}
                            onChange={(e) => updateReferences(e.target.value)}
                            placeholder="Style references, one per line"
                            rows={3}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
