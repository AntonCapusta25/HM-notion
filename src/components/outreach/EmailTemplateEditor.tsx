// EmailTemplateEditor.tsx - Rich text editor for creating beautiful HTML emails
import React, { useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
    Bold,
    Italic,
    List,
    ListOrdered,
    Link as LinkIcon,
    Image as ImageIcon,
    Sparkles,
    Eye,
    Code,
    Palette
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

interface EmailTemplateEditorProps {
    initialContent?: string
    onSave: (html: string) => void
    workspaceId: string
}

const BRAND_COLORS = {
    primary: '#FF6B35',
    secondary: '#004E89',
    accent: '#F7931E',
    text: '#1A1A1A',
    background: '#FFFFFF'
}

export default function EmailTemplateEditor({ initialContent = '', onSave, workspaceId }: EmailTemplateEditorProps) {
    const [showPreview, setShowPreview] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [aiPrompt, setAiPrompt] = useState('')
    const { toast } = useToast()

    const editor = useEditor({
        extensions: [
            StarterKit,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-blue-600 underline',
                },
            }),
            Image.configure({
                HTMLAttributes: {
                    class: 'max-w-full h-auto',
                },
            }),
            TextStyle,
            Color,
        ],
        content: initialContent,
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] p-4 border rounded-lg',
            },
        },
    })

    const setLink = () => {
        const url = window.prompt('Enter URL:')
        if (url) {
            editor?.chain().focus().setLink({ href: url }).run()
        }
    }

    const addImage = () => {
        const url = window.prompt('Enter image URL:')
        if (url) {
            editor?.chain().focus().setImage({ src: url }).run()
        }
    }

    const applyColor = (color: string) => {
        editor?.chain().focus().setColor(color).run()
    }

    const generateWithAI = async () => {
        if (!aiPrompt.trim()) {
            toast({
                title: "Enter a prompt",
                description: "Please describe what kind of email you want to create",
                variant: "destructive"
            })
            return
        }

        setIsGenerating(true)
        try {
            const { data, error } = await supabase.functions.invoke('generate-email-template', {
                body: {
                    prompt: aiPrompt,
                    brandColors: BRAND_COLORS,
                    workspaceId
                }
            })

            if (error) throw error

            if (data?.html) {
                editor?.commands.setContent(data.html)
                toast({
                    title: "Template Generated!",
                    description: "AI has created your email template"
                })
            }
        } catch (error: any) {
            console.error('AI generation error:', error)
            toast({
                title: "Generation Failed",
                description: error.message || "Failed to generate template",
                variant: "destructive"
            })
        } finally {
            setIsGenerating(false)
        }
    }

    const handleSave = () => {
        const html = editor?.getHTML() || ''
        onSave(html)
    }

    if (!editor) {
        return <div>Loading editor...</div>
    }

    return (
        <div className="space-y-4">
            {/* AI Generation Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                        AI Email Designer
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label>Describe your email</Label>
                        <Textarea
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder="E.g., Create a professional welcome email for new chefs joining our platform..."
                            rows={3}
                        />
                    </div>
                    <Button
                        onClick={generateWithAI}
                        disabled={isGenerating}
                        className="w-full"
                    >
                        {isGenerating ? (
                            <>Generating...</>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4 mr-2" />
                                Generate with AI
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Editor Toolbar */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant={editor.isActive('bold') ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => editor.chain().focus().toggleBold().run()}
                        >
                            <Bold className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={editor.isActive('italic') ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                        >
                            <Italic className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={editor.isActive('bulletList') ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => editor.chain().focus().toggleBulletList().run()}
                        >
                            <List className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={editor.isActive('orderedList') ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        >
                            <ListOrdered className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={setLink}
                        >
                            <LinkIcon className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={addImage}
                        >
                            <ImageIcon className="h-4 w-4" />
                        </Button>

                        <Separator orientation="vertical" className="h-8" />

                        {/* Brand Colors */}
                        <div className="flex items-center gap-1">
                            <Palette className="h-4 w-4 text-gray-600" />
                            {Object.entries(BRAND_COLORS).map(([name, color]) => (
                                <button
                                    key={name}
                                    onClick={() => applyColor(color)}
                                    className="w-6 h-6 rounded border-2 border-gray-300 hover:border-gray-500"
                                    style={{ backgroundColor: color }}
                                    title={name}
                                />
                            ))}
                        </div>

                        <Separator orientation="vertical" className="h-8" />

                        <Button
                            variant={showPreview ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setShowPreview(!showPreview)}
                        >
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Editor / Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Editor */}
                <Card>
                    <CardHeader>
                        <CardTitle>Edit Email</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <EditorContent editor={editor} />
                    </CardContent>
                </Card>

                {/* Preview */}
                {showPreview && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Preview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div
                                className="border rounded-lg p-4 bg-white min-h-[400px]"
                                dangerouslySetInnerHTML={{ __html: editor.getHTML() }}
                            />
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => editor.commands.clearContent()}>
                    Clear
                </Button>
                <Button onClick={handleSave}>
                    Save Template
                </Button>
            </div>
        </div>
    )
}
