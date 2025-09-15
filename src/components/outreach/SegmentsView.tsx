// SegmentsView.tsx - Lead segment management interface
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Tag,
  Palette,
  Search,
  Filter
} from 'lucide-react'
import { useOutreachStore } from '@/hooks/useOutreachStore'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

interface SegmentsViewProps {
  workspaceId: string
}

interface LeadSegment {
  id: string
  name: string
  description?: string
  color: string
  created_by: string
  workspace_id: string
  created_at: string
  updated_at: string
  _count?: {
    leads: number
  }
}

const PRESET_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#84CC16', '#6366F1',
  '#06B6D4', '#EAB308', '#DC2626', '#7C3AED', '#DB2777'
]

export default function SegmentsView({ workspaceId }: SegmentsViewProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showSegmentModal, setShowSegmentModal] = useState(false)
  const [editingSegment, setEditingSegment] = useState<LeadSegment | null>(null)
  const [segmentForm, setSegmentForm] = useState({
    name: '',
    description: '',
    color: PRESET_COLORS[0]
  })

  const { 
    segments, 
    leads,
    loading,
    fetchSegments,
    fetchLeads,
    createSegment,
    updateSegment,
    deleteSegment
  } = useOutreachStore()
  
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (workspaceId) {
      fetchSegments(workspaceId)
      fetchLeads(workspaceId)
    }
  }, [workspaceId])

  const filteredSegments = segments.filter(segment =>
    !searchTerm || 
    segment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (segment.description && segment.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const getSegmentLeadCount = (segmentId: string) => {
    return leads.filter(lead => lead.segment_id === segmentId).length
  }

  const handleCreateSegment = async () => {
    if (!segmentForm.name.trim()) {
      toast({
        title: "Error",
        description: "Please provide a segment name",
        variant: "destructive"
      })
      return
    }

    try {
      await createSegment({
        name: segmentForm.name,
        description: segmentForm.description || undefined,
        color: segmentForm.color,
        workspace_id: workspaceId,
        created_by: user!.id
      })

      setSegmentForm({ name: '', description: '', color: PRESET_COLORS[0] })
      setShowSegmentModal(false)
      
      toast({
        title: "Success",
        description: "Segment created successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create segment",
        variant: "destructive"
      })
    }
  }

  const handleUpdateSegment = async () => {
    if (!editingSegment || !segmentForm.name.trim()) return

    try {
      await updateSegment(editingSegment.id, {
        name: segmentForm.name,
        description: segmentForm.description || undefined,
        color: segmentForm.color
      })

      setEditingSegment(null)
      setSegmentForm({ name: '', description: '', color: PRESET_COLORS[0] })
      setShowSegmentModal(false)
      
      toast({
        title: "Success",
        description: "Segment updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update segment",
        variant: "destructive"
      })
    }
  }

  const handleDeleteSegment = async (segmentId: string) => {
    const leadCount = getSegmentLeadCount(segmentId)
    
    if (leadCount > 0) {
      if (!confirm(`This segment contains ${leadCount} leads. Deleting it will remove the segment assignment from these leads. Are you sure you want to continue?`)) {
        return
      }
    } else {
      if (!confirm('Are you sure you want to delete this segment?')) {
        return
      }
    }

    try {
      await deleteSegment(segmentId)
      
      toast({
        title: "Success",
        description: "Segment deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete segment",
        variant: "destructive"
      })
    }
  }

  const openCreateModal = () => {
    setEditingSegment(null)
    setSegmentForm({ name: '', description: '', color: PRESET_COLORS[0] })
    setShowSegmentModal(true)
  }

  const openEditModal = (segment: LeadSegment) => {
    setEditingSegment(segment)
    setSegmentForm({
      name: segment.name,
      description: segment.description || '',
      color: segment.color
    })
    setShowSegmentModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Lead Segments</h2>
          <p className="text-gray-600">
            Organize your leads into targeted segments for better campaign management
          </p>
        </div>
        
        <Button 
          onClick={openCreateModal}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Segment
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search segments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Segments Grid */}
      {filteredSegments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Tag className="h-12 w-12 text-gray-400 mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              {segments.length === 0 ? 'No segments yet' : 'No segments match your search'}
            </h4>
            <p className="text-gray-600 text-center mb-4">
              {segments.length === 0 
                ? "Create segments to organize your leads by industry, company size, or any other criteria"
                : "Try adjusting your search terms"
              }
            </p>
            {segments.length === 0 && (
              <Button onClick={openCreateModal}>
                Create Your First Segment
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSegments.map((segment) => (
            <Card key={segment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: segment.color }}
                    />
                    <div>
                      <h3 className="font-semibold text-lg">{segment.name}</h3>
                      {segment.description && (
                        <p className="text-gray-600 text-sm mt-1">{segment.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(segment)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSegment(segment.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Leads</span>
                    </div>
                    <Badge variant="outline">
                      {getSegmentLeadCount(segment.id)}
                    </Badge>
                  </div>

                  <div className="text-xs text-gray-500">
                    Created {new Date(segment.created_at).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Segment Modal */}
      <Dialog open={showSegmentModal} onOpenChange={setShowSegmentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSegment ? 'Edit Segment' : 'Create New Segment'}
            </DialogTitle>
            <DialogDescription>
              {editingSegment 
                ? 'Update your segment details below'
                : 'Create a new segment to organize your leads'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Segment Name</Label>
              <Input
                id="name"
                value={segmentForm.name}
                onChange={(e) => setSegmentForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Enterprise Prospects, SaaS Companies"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={segmentForm.description}
                onChange={(e) => setSegmentForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this segment represents..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded-full border-2 border-gray-300" 
                  style={{ backgroundColor: segmentForm.color }}
                />
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSegmentForm(prev => ({ ...prev, color }))}
                      className={`w-6 h-6 rounded-full border-2 ${
                        segmentForm.color === color ? 'border-gray-900' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowSegmentModal(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={editingSegment ? handleUpdateSegment : handleCreateSegment}
              >
                {editingSegment ? 'Update Segment' : 'Create Segment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
