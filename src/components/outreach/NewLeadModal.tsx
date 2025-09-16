// NewLeadModal.tsx - Fixed UUID validation
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
import { useToast } from '@/hooks/use-toast'

interface Lead {
  id?: string
  name: string
  email: string
  company?: string
  position?: string
  industry?: string
  phone?: string
  website?: string
  linkedin_url?: string
  twitter_url?: string
  location?: string
  company_size?: string
  revenue_range?: string
  lead_score: number
  status: 'new' | 'contacted' | 'responded' | 'qualified' | 'converted' | 'dead'
  source: string
  notes?: string
  segment_id?: string
  workspace_id: string
  created_by: string
}

interface NewLeadModalProps {
  open: boolean
  onClose: () => void
  workspaceId: string
  lead?: Lead | null
}

const LEAD_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'responded', label: 'Responded' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'converted', label: 'Converted' },
  { value: 'dead', label: 'Dead' }
]

const COMPANY_SIZES = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '501-1000', label: '501-1000 employees' },
  { value: '1000+', label: '1000+ employees' }
]

const REVENUE_RANGES = [
  { value: '0-1M', label: '$0-1M' },
  { value: '1M-10M', label: '$1M-10M' },
  { value: '10M-50M', label: '$10M-50M' },
  { value: '50M-100M', label: '$50M-100M' },
  { value: '100M+', label: '$100M+' }
]

export default function NewLeadModal({ open, onClose, workspaceId, lead }: NewLeadModalProps) {
  const { user } = useAuth()
  const { createLead, updateLead, segments } = useOutreachStore()
  const { toast } = useToast()
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<Partial<Lead>>({
    name: '',
    email: '',
    company: '',
    position: '',
    industry: '',
    phone: '',
    website: '',
    linkedin_url: '',
    twitter_url: '',
    location: '',
    company_size: '',
    revenue_range: '',
    lead_score: 50,
    status: 'new',
    source: 'manual',
    notes: '',
    segment_id: ''
  })

  // Populate form when editing existing lead
  useEffect(() => {
    if (lead) {
      setFormData({
        ...lead
      })
    } else {
      // Reset form for new lead
      setFormData({
        name: '',
        email: '',
        company: '',
        position: '',
        industry: '',
        phone: '',
        website: '',
        linkedin_url: '',
        twitter_url: '',
        location: '',
        company_size: '',
        revenue_range: '',
        lead_score: 50,
        status: 'new',
        source: 'manual',
        notes: '',
        segment_id: ''
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
      const leadData = {
        ...formData,
        workspace_id: workspaceId,
        created_by: user.id,
        lead_score: Number(formData.lead_score),
        // Fix UUID fields - convert empty strings to null
        segment_id: formData.segment_id && formData.segment_id.trim() !== '' ? formData.segment_id : null,
        company: formData.company?.trim() || null,
        position: formData.position?.trim() || null,
        industry: formData.industry?.trim() || null,
        phone: formData.phone?.trim() || null,
        website: formData.website?.trim() || null,
        linkedin_url: formData.linkedin_url?.trim() || null,
        twitter_url: formData.twitter_url?.trim() || null,
        location: formData.location?.trim() || null,
        company_size: formData.company_size?.trim() || null,
        revenue_range: formData.revenue_range?.trim() || null,
        notes: formData.notes?.trim() || null
      }

      if (lead) {
        // Update existing lead
        await updateLead(lead.id!, leadData)
        toast({
          title: "Lead Updated",
          description: "Lead has been updated successfully."
        })
      } else {
        // Create new lead
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

  const handleInputChange = (field: keyof Lead, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? 'Edit Lead' : 'Add New Lead'}</DialogTitle>
          <DialogDescription>
            {lead ? 'Update lead information below.' : 'Enter the lead information below.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="john@company.com"
                required
              />
            </div>
          </div>

          {/* Company Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={formData.company || ''}
                onChange={(e) => handleInputChange('company', e.target.value)}
                placeholder="Acme Inc"
              />
            </div>
            <div>
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={formData.position || ''}
                onChange={(e) => handleInputChange('position', e.target.value)}
                placeholder="CEO"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={formData.industry || ''}
                onChange={(e) => handleInputChange('industry', e.target.value)}
                placeholder="Technology"
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location || ''}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="New York, NY"
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website || ''}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://company.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="linkedin">LinkedIn URL</Label>
              <Input
                id="linkedin"
                value={formData.linkedin_url || ''}
                onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
                placeholder="https://linkedin.com/in/johndoe"
              />
            </div>
            <div>
              <Label htmlFor="twitter">Twitter URL</Label>
              <Input
                id="twitter"
                value={formData.twitter_url || ''}
                onChange={(e) => handleInputChange('twitter_url', e.target.value)}
                placeholder="https://twitter.com/johndoe"
              />
            </div>
          </div>

          {/* Company Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company_size">Company Size</Label>
              <Select 
                value={formData.company_size || ''} 
                onValueChange={(value) => handleInputChange('company_size', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No selection</SelectItem>
                  {COMPANY_SIZES.map(size => (
                    <SelectItem key={size.value} value={size.value}>
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="revenue_range">Revenue Range</Label>
              <Select 
                value={formData.revenue_range || ''} 
                onValueChange={(value) => handleInputChange('revenue_range', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No selection</SelectItem>
                  {REVENUE_RANGES.map(range => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lead Details */}
          <div className="grid grid-cols-3 gap-4">
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
            <div>
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                value={formData.source || 'manual'}
                onChange={(e) => handleInputChange('source', e.target.value)}
                placeholder="manual, website, referral"
              />
            </div>
            <div>
              <Label htmlFor="lead_score">Lead Score (0-100)</Label>
              <Input
                id="lead_score"
                type="number"
                min="0"
                max="100"
                value={formData.lead_score || 50}
                onChange={(e) => handleInputChange('lead_score', parseInt(e.target.value))}
              />
            </div>
          </div>

          {/* Segment Assignment */}
          {segments.length > 0 && (
            <div>
              <Label htmlFor="segment">Segment</Label>
              <Select 
                value={formData.segment_id || ''} 
                onValueChange={(value) => handleInputChange('segment_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select segment (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No segment</SelectItem>
                  {segments.map(segment => (
                    <SelectItem key={segment.id} value={segment.id}>
                      {segment.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
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
