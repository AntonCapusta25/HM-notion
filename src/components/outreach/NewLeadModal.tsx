// NewLeadModal.tsx - Simplified for email outreach
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '../../contexts/AuthContext'
import { useOutreachStore } from '@/hooks/useOutreachStore'
import { useCollabStore } from '@/hooks/useCollabStore'
import { useToast } from '@/hooks/use-toast'
import { Lead, CollabLead } from '@/types'

interface NewLeadModalProps {
  open: boolean
  onClose: () => void
  workspaceId: string
  lead?: Lead | CollabLead | null
  outreachType?: 'collab' | 'client'
}

const LEAD_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'responded', label: 'Responded' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'converted', label: 'Converted' },
  { value: 'dead', label: 'Dead' }
]

export default function NewLeadModal({ open, onClose, workspaceId, lead, outreachType = 'client' }: NewLeadModalProps) {
  const { user } = useAuth()

  // Use appropriate store based on outreach type
  const clientStore = useOutreachStore()
  const collabStore = useCollabStore()
  const store = outreachType === 'collab' ? collabStore : clientStore

  const { createLead, updateLead, segments } = store
  const { toast } = useToast()

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form data with correct type
  const [formData, setFormData] = useState<Partial<Lead & CollabLead>>({
    name: '',
    email: '',
    phone: '',
    status: 'new',
    notes: '',
    segment_id: '',
    // Just initialize common fields, specific ones handled conditionally
  })

  // Populate form when editing existing lead
  useEffect(() => {
    if (lead) {
      // Create a clean copy of the lead data for the form
      const initialData: any = { ...lead }
      setFormData(initialData)
    } else {
      // Reset form for new lead
      setFormData({
        name: '',
        email: '',
        phone: '',
        status: 'new',
        notes: '',
        segment_id: '',
        // Initialize lead_score only for client outreach if needed, but not strictly required here as it's partial
      })
    }
  }, [lead, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.email) {
      toast({
        title: "Validation Error",
        description: "Name and email are required fields.",
        variant: "destructive"
      })
      return
    }

    if (!user?.id) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create leads.",
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
      const baseData = {
        name: formData.name,
        email: formData.email,
        workspace_id: workspaceId,
        created_by: user.id,
        segment_id: formData.segment_id && formData.segment_id.trim() !== '' ? formData.segment_id : null,
        phone: formData.phone?.trim() || null,
        notes: formData.notes?.trim() || null,
        status: formData.status
      }

      // Add specific fields based on outreach type
      const leadData: any = { ...baseData }

      if (outreachType === 'client') {
        leadData.source = 'manual'
        leadData.lead_score = (formData as any).lead_score || 50
      }

      if (lead) {
        // @ts-ignore - updateLead expects specific type but we're passing correct data structure
        await updateLead(lead.id!, leadData)
        toast({
          title: "Lead Updated",
          description: "Lead has been updated successfully."
        })
      } else {
        // @ts-ignore
        await createLead(leadData)
        toast({
          title: "Lead Created",
          description: "New lead has been created successfully."
        })
      }

      onClose()
    } catch (error: any) {
      console.error('Lead save error:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to save lead.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{lead ? 'Edit Lead' : 'Add New Lead'}</DialogTitle>
          <DialogDescription>
            {lead ? 'Update lead information below.' : 'Enter the lead information below.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="john@example.com"
              required
            />
          </div>

          {/* Phone (Optional) */}
          <div>
            <Label htmlFor="phone">Phone (Optional)</Label>
            <Input
              id="phone"
              value={formData.phone || ''}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status || 'new'}
              onValueChange={(value) => handleInputChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Segment (Optional) - Enhanced with color indicators */}
          <div>
            <Label htmlFor="segment">Segment (Optional)</Label>
            <Select
              value={formData.segment_id || 'none'}
              onValueChange={(value) => handleInputChange('segment_id', value === 'none' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select segment (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-gray-500">No Segment</span>
                </SelectItem>
                {segments.map(segment => (
                  <SelectItem key={segment.id} value={segment.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: segment.color }}
                      />
                      <span>{segment.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {segments.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Create segments in the Segments tab to organize your leads
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional notes about this lead..."
              rows={3}
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (lead ? 'Update Lead' : 'Create Lead')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
