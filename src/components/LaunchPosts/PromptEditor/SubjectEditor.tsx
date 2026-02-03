import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SubjectSettings as SubjectSettingsType, CharacterSettings } from '@/types/launchPosts';

interface SubjectEditorProps {
    subject: SubjectSettingsType;
    character: CharacterSettings;
    onSubjectChange: (subject: SubjectSettingsType) => void;
    onCharacterChange: (character: CharacterSettings) => void;
}

export function SubjectEditor({ subject, character, onSubjectChange, onCharacterChange }: SubjectEditorProps) {
    const updateSubject = (field: keyof SubjectSettingsType, value: string) => {
        onSubjectChange({ ...subject, [field]: value });
    };

    const updateCharacter = (field: keyof CharacterSettings, value: string | string[]) => {
        onCharacterChange({ ...character, [field]: value });
    };

    const updateProps = (value: string) => {
        const propsArray = value.split('\n').filter(p => p.trim());
        updateCharacter('props', propsArray);
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="subject-primary">Primary Subject</Label>
                <Textarea
                    id="subject-primary"
                    value={subject.primary}
                    onChange={(e) => updateSubject('primary', e.target.value)}
                    placeholder="Main subject of the image"
                    rows={2}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="subject-secondary">Secondary Subject</Label>
                <Input
                    id="subject-secondary"
                    value={subject.secondary}
                    onChange={(e) => updateSubject('secondary', e.target.value)}
                    placeholder="Secondary elements"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="subject-pose">Pose</Label>
                    <Input
                        id="subject-pose"
                        value={subject.pose}
                        onChange={(e) => updateSubject('pose', e.target.value)}
                        placeholder="e.g., Standing, Sitting"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="subject-expression">Expression</Label>
                    <Input
                        id="subject-expression"
                        value={subject.expression}
                        onChange={(e) => updateSubject('expression', e.target.value)}
                        placeholder="e.g., Smiling, Serious"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="subject-build">Build</Label>
                    <Input
                        id="subject-build"
                        value={subject.build}
                        onChange={(e) => updateSubject('build', e.target.value)}
                        placeholder="e.g., Athletic, Average"
                    />
                </div>
            </div>

            <div className="border-t pt-4 mt-4">
                <h3 className="font-medium mb-3">Character Details</h3>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="character-hair">Hair</Label>
                        <Input
                            id="character-hair"
                            value={character.hair}
                            onChange={(e) => updateCharacter('hair', e.target.value)}
                            placeholder="e.g., Dark, curly hair"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="character-wardrobe">Wardrobe Notes</Label>
                        <Textarea
                            id="character-wardrobe"
                            value={character.wardrobeNotes}
                            onChange={(e) => updateCharacter('wardrobeNotes', e.target.value)}
                            placeholder="Clothing description"
                            rows={2}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="character-props">Props (one per line)</Label>
                        <Textarea
                            id="character-props"
                            value={character.props.join('\n')}
                            onChange={(e) => updateProps(e.target.value)}
                            placeholder="List props, one per line"
                            rows={3}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
