import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LaunchPostTemplate } from '@/types/launchPosts';
import { defaultTemplates } from '@/data/launchPostTemplates';
import { fetchTemplates, deleteTemplate } from '@/utils/launchPostsApi';
import { Sparkles, Plus, Trash2, Search, FileText, Loader2, RefreshCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TemplateManagerProps {
    onSelectTemplate: (template: LaunchPostTemplate) => void;
    selectedTemplateId?: string;
    refreshTrigger?: number; // Prop to trigger refresh when new template is saved
    onCreateTemplate?: () => void;
}

export function TemplateManager({ onSelectTemplate, selectedTemplateId, refreshTrigger, onCreateTemplate }: TemplateManagerProps) {
    const [templates, setTemplates] = useState<LaunchPostTemplate[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredTemplates, setFilteredTemplates] = useState<LaunchPostTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const loadTemplates = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Fetch custom templates from database
            const customTemplates = await fetchTemplates();
            // Merge with default templates (defaults first, then custom sorted by date)
            setTemplates([...defaultTemplates, ...customTemplates]);
        } catch (err) {
            console.error('Failed to load templates:', err);
            setError('Failed to load templates. Please try again.');
            // Fallback to just defaults
            setTemplates([...defaultTemplates]);
        } finally {
            setIsLoading(false);
        }
    };

    // Load templates on mount and when refreshTrigger changes
    useEffect(() => {
        loadTemplates();
    }, [refreshTrigger]);

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

    const handleDeleteTemplate = async (templateId: string) => {
        const template = templates.find((t) => t.id === templateId);
        if (template?.isDefault) {
            toast({
                title: "Cannot delete default template",
                variant: "destructive"
            });
            return;
        }

        if (confirm('Are you sure you want to delete this template?')) {
            try {
                await deleteTemplate(templateId);
                toast({
                    title: "Template deleted",
                    description: "The template has been permanently removed."
                });
                loadTemplates(); // Refresh list
            } catch (err) {
                console.error('Failed to delete template:', err);
                toast({
                    title: "Error",
                    description: "Failed to delete template. Please try again.",
                    variant: "destructive"
                });
            }
        }
    };

    return (
        <div className="space-y-4">
            {/* Search and Refresh */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search templates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Button variant="outline" size="icon" onClick={loadTemplates} disabled={isLoading} title="Refresh templates">
                    <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
                <Button onClick={onCreateTemplate} className="bg-homemade-orange hover:bg-homemade-orange-dark text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New
                </Button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="text-sm text-red-500 bg-red-50 p-2 rounded border border-red-200">
                    {error}
                </div>
            )}

            {/* Template Grid */}
            {isLoading && templates.length === 0 ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-2">
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
                                        <div className="w-10 h-10 bg-gradient-to-br from-homemade-orange to-orange-600 rounded-lg flex items-center justify-center shrink-0">
                                            {template.isDefault ? (
                                                <Sparkles className="h-5 w-5 text-white" />
                                            ) : (
                                                <FileText className="h-5 w-5 text-white" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <CardTitle className="text-base truncate">{template.name}</CardTitle>
                                            {template.isDefault ? (
                                                <Badge variant="secondary" className="text-xs mt-1">
                                                    Default
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-xs mt-1">
                                                    Custom
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
                                <CardDescription className="text-sm line-clamp-2 min-h-[40px]">
                                    {template.description || "No description"}
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
            )}

            {!isLoading && filteredTemplates.length === 0 && (
                <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No templates found</p>
                </div>
            )}
        </div>
    );
}
