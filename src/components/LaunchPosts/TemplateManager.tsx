import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LaunchPostTemplate } from '@/types/launchPosts';
import { defaultTemplates } from '@/data/launchPostTemplates';
import { Sparkles, Plus, Trash2, Search, FileText } from 'lucide-react';

interface TemplateManagerProps {
    onSelectTemplate: (template: LaunchPostTemplate) => void;
    selectedTemplateId?: string;
}

export function TemplateManager({ onSelectTemplate, selectedTemplateId }: TemplateManagerProps) {
    const [templates, setTemplates] = useState<LaunchPostTemplate[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredTemplates, setFilteredTemplates] = useState<LaunchPostTemplate[]>([]);

    // Load templates from localStorage and merge with defaults
    useEffect(() => {
        const savedTemplates = localStorage.getItem('launchPostTemplates');
        const customTemplates = savedTemplates ? JSON.parse(savedTemplates) : [];
        setTemplates([...defaultTemplates, ...customTemplates]);
    }, []);

    // Filter templates based on search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredTemplates(templates);
        } else {
            const query = searchQuery.toLowerCase();
            setFilteredTemplates(
                templates.filter(
                    (t) =>
                        t.name.toLowerCase().includes(query) ||
                        t.description.toLowerCase().includes(query)
                )
            );
        }
    }, [searchQuery, templates]);

    const handleDeleteTemplate = (templateId: string) => {
        const template = templates.find((t) => t.id === templateId);
        if (template?.isDefault) {
            alert('Cannot delete default templates');
            return;
        }

        if (confirm('Are you sure you want to delete this template?')) {
            const customTemplates = templates.filter((t) => !t.isDefault && t.id !== templateId);
            localStorage.setItem('launchPostTemplates', JSON.stringify(customTemplates));
            setTemplates([...defaultTemplates, ...customTemplates]);
        }
    };

    return (
        <div className="space-y-4">
            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Template Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((template) => (
                    <Card
                        key={template.id}
                        className={`cursor-pointer transition-all hover:shadow-lg ${selectedTemplateId === template.id
                                ? 'ring-2 ring-homemade-orange'
                                : ''
                            }`}
                        onClick={() => onSelectTemplate(template)}
                    >
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 bg-gradient-to-br from-homemade-orange to-orange-600 rounded-lg flex items-center justify-center">
                                        {template.isDefault ? (
                                            <Sparkles className="h-5 w-5 text-white" />
                                        ) : (
                                            <FileText className="h-5 w-5 text-white" />
                                        )}
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">{template.name}</CardTitle>
                                        {template.isDefault && (
                                            <Badge variant="secondary" className="text-xs mt-1">
                                                Default
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                {!template.isDefault && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteTemplate(template.id);
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <CardDescription className="text-sm line-clamp-2">
                                {template.description}
                            </CardDescription>
                            <div className="mt-3 flex flex-wrap gap-1">
                                {template.prompt.colorPlate.primaryColors.slice(0, 3).map((color, idx) => (
                                    <div
                                        key={idx}
                                        className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                                        style={{ backgroundColor: color }}
                                        title={color}
                                    />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {filteredTemplates.length === 0 && (
                <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No templates found</p>
                </div>
            )}
        </div>
    );
}
