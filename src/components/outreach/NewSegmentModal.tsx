// NewSegmentModal.tsx - Fixed UUID validation
import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '../../contexts/AuthContext'
import { useOutreachStore } from '@/hooks/useOutreachStore'
import { useToast } from '@/hooks/use-toast'

interface LeadSegment {
  id?: string
  name: string
  description?: string
  color: string
  workspace_id: string
  created_by: string
}

interface NewSegmentModalProps {
  open: boolean
  onClose: () => void
  workspaceId: string
  segment?: LeadSegment | null
}

const PREDEFINED_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#F43F5E', // Rose
]

export default function NewSegmentModal({ open, onClose, workspaceId, segment }: NewSegmentModalProps) {
  const { user } = useAuth()
  const { createSegment, updateSegment } = useOutreachStore()
  const { toast } = useToast()
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<Partial<LeadSegment>>({
    name: '',
    description: '',
    color: PREDEFINED_COLORS[0]
  })

  // Populate form when editing existing segment
  useEffect(() => {
    if (segment) {
      setFormData({
        name: segment.name,
        description: segment.description || '',
        color: segment.color
      })
    } else {
      // Reset form for new segment
      setFormData({
        name: '',
        description: '',
        color: PREDEFINED_COLORS[0]
      })
    }
  }, [segment, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name?.trim()) {
      toast({
        title: "Validation Error",
        description: "Segment name is required.",
        variant: "destructive"
      })
      return
    }

    if (!user?.id) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create segments.",
        variant: "destructive"
      })
      return
    }

    if (!workspaceId) {
      toast({
        title: "Workspace Error",
        description: "Invalid workspace ID.",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)

    try {
      const segmentData = {
        name: formData.name!.trim(),
        description: formData.description?.trim() || null, // Convert empty string to null
        color: formData.color || PREDEFINED_COLORS[0],
        workspace_id: workspaceId,
        created_by: user.id
      }

      if (segment) {
        // Update existing segment
        await updateSegment(segment.id!, segmentData)
        toast({
          title: "Segment Updated",
          description: "Segment has been updated successfully."
        })
      } else {
        // Create new segment
        await createSegment(segmentData)
        toast({
          title: "Segment Created",
          description: "New segment has been created successfully."
        })
      }

      onClose()
    } catch (error: any) {
      console.error('Segment save error:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to save segment.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof LeadSegment, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{segment ? 'Edit Segment' : 'Create New Segment'}</DialogTitle>
          <DialogDescription>
            {segment ? 'Update segment information below.' : 'Create a new lead segment to organize your leads.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Segment Name */}
          <div>
            <Label htmlFor="name">Segment Name *</Label>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enterprise Leads"
              required
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Description of this segment..."
              rows={3}
            />
          </div>

          {/* Color Selection */}
          <div>
            <Label>Segment Color</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {PREDEFINED_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    formData.color === color 
                      ? 'border-gray-900 scale-110' 
                      : 'border-gray-300 hover:border-gray-500'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleInputChange('color', color)}
                  title={color}
                />
              ))}
            </div>
            
            {/* Custom Color Input */}
            <div className="mt-3">
              <Label htmlFor="custom-color">Or enter custom color:</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="custom-color"
                  type="color"
                  value={formData.color || PREDEFINED_COLORS[0]}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  className="w-16 h-10 p-1 border rounded"
                />
                <Input
                  value={formData.color || ''}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  placeholder="#3B82F6"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="p-3 border rounded-lg bg-gray-50">
            <Label className="text-sm text-gray-600">Preview:</Label>
            <div className="flex items-center gap-2 mt-1">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: formData.color }}
              />
              <span className="font-medium">
                {formData.name || 'Segment Name'}
              </span>
            </div>
            {formData.description && (
              <p className="text-sm text-gray-600 mt-1">{formData.description}</p>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (segment ? 'Update Segment' : 'Create Segment')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
