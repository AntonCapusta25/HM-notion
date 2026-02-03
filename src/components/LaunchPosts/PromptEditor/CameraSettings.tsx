import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CameraSettings as CameraSettingsType } from '@/types/launchPosts';

interface CameraSettingsProps {
    settings: CameraSettingsType;
    onChange: (settings: CameraSettingsType) => void;
}

export function CameraSettings({ settings, onChange }: CameraSettingsProps) {
    const updateField = (field: keyof CameraSettingsType, value: string) => {
        onChange({ ...settings, [field]: value });
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="camera-model">Camera Model</Label>
                    <Input
                        id="camera-model"
                        value={settings.model}
                        onChange={(e) => updateField('model', e.target.value)}
                        placeholder="e.g., Canon EOS R5"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="camera-lens">Lens</Label>
                    <Input
                        id="camera-lens"
                        value={settings.lens}
                        onChange={(e) => updateField('lens', e.target.value)}
                        placeholder="e.g., 50mm f/1.2"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="camera-aperture">Aperture</Label>
                    <Input
                        id="camera-aperture"
                        value={settings.aperture}
                        onChange={(e) => updateField('aperture', e.target.value)}
                        placeholder="e.g., f/2.8"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="camera-shutter">Shutter Speed</Label>
                    <Input
                        id="camera-shutter"
                        value={settings.shutter}
                        onChange={(e) => updateField('shutter', e.target.value)}
                        placeholder="e.g., 1/125"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="camera-iso">ISO</Label>
                    <Input
                        id="camera-iso"
                        value={settings.iso}
                        onChange={(e) => updateField('iso', e.target.value)}
                        placeholder="e.g., 400"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="camera-movement">Movement</Label>
                    <Select value={settings.movement} onValueChange={(value) => updateField('movement', value)}>
                        <SelectTrigger id="camera-movement">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Static">Static</SelectItem>
                            <SelectItem value="Handheld">Handheld</SelectItem>
                            <SelectItem value="Tracking">Tracking</SelectItem>
                            <SelectItem value="Panning">Panning</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="camera-framing">Framing</Label>
                <Input
                    id="camera-framing"
                    value={settings.framing}
                    onChange={(e) => updateField('framing', e.target.value)}
                    placeholder="e.g., Medium shot, vertical orientation"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="camera-angle">Angle</Label>
                <Input
                    id="camera-angle"
                    value={settings.angle}
                    onChange={(e) => updateField('angle', e.target.value)}
                    placeholder="e.g., Eye-level, straight-on perspective"
                />
            </div>
        </div>
    );
}
