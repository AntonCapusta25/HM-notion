// LeadsView.tsx - Lead management interface
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload
} from 'lucide-react'
import { useOutreachStore } from '@/hooks/useOutreachStore'
import { useCollabStore } from '@/hooks/useCollabStore'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import NewLeadModal from './NewLeadModal'
import { Lead, CollabLead } from '@/types'

interface LeadsViewProps {
  workspaceId: string
  outreachType?: 'collab' | 'client'
}

export default function LeadsView({ workspaceId, outreachType = 'client' }: LeadsViewProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [segmentFilter, setSegmentFilter] = useState('all')
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [showLeadModal, setShowLeadModal] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | CollabLead | null>(null)
  const [sortField, setSortField] = useState<keyof Lead>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Use appropriate store based on outreach type
  const clientStore = useOutreachStore()
  const collabStore = useCollabStore()
  const store = outreachType === 'collab' ? collabStore : clientStore

  // Cast leads to the union type since we know it's safe based on logic, but TS needs help with the union of stores
  const leads = store.leads as (Lead | CollabLead)[]
  const segments = store.segments
  const loading = store.loading
  const fetchLeads = store.fetchLeads
  const fetchSegments = store.fetchSegments
  const deleteLead = store.deleteLead
  // @ts-ignore - bulkUpdateLeads exists on both but union type might be tricky if not perfectly aligned
  const bulkUpdateLeads = store.bulkUpdateLeads

  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (workspaceId) {
      fetchLeads(workspaceId)
      fetchSegments(workspaceId)
    }
  }, [workspaceId])

  // Filter leads
  const filteredLeads = leads.filter(lead => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ('company' in lead && lead.company?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      ('restaurant_name' in lead && lead.restaurant_name?.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter

    // Check source only if it exists on the lead type (client leads)
    const matchesSource = sourceFilter === 'all' ||
      ('source' in lead && lead.source === sourceFilter) ||
      (sourceFilter === 'all' && !('source' in lead))

    const matchesSegment = segmentFilter === 'all' || lead.segment_id === segmentFilter

    return matchesSearch && matchesStatus && matchesSource && matchesSegment
  })
    .sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]

      if (aValue === undefined || aValue === null) return 1
      if (bValue === undefined || bValue === null) return -1

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

  const handleSelectLead = (leadId: string, checked: boolean) => {
    if (checked) {
      setSelectedLeads(prev => [...prev, leadId])
    } else {
      setSelectedLeads(prev => prev.filter(id => id !== leadId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(filteredLeads.map(lead => lead.id))
    } else {
      setSelectedLeads([])
    }
  }

  const handleBulkStatusUpdate = async (status: string) => {
    if (selectedLeads.length === 0) return

    try {
      await bulkUpdateLeads(selectedLeads, { status: status as any })
      setSelectedLeads([])
      toast({
        title: "Success",
        description: `Updated ${selectedLeads.length} leads to ${status}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update leads",
        variant: "destructive"
      })
    }
  }

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return

    try {
      await deleteLead(leadId)
      toast({
        title: "Success",
        description: "Lead deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete lead",
        variant: "destructive"
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-800'
      case 'contacted': return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-200 dark:border-yellow-800'
      case 'responded': return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-800'
      case 'qualified': return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-200 dark:border-green-800'
      case 'converted': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-800'
      case 'dead': return 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
      default: return 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
    if (score >= 40) return 'text-orange-600 dark:text-orange-400'
    return 'text-red-600 dark:text-red-400'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 tracking-tight">Leads</h2>
          <p className="text-gray-500 text-sm mt-1">
            {filteredLeads.length} total
            {selectedLeads.length > 0 && ` • ${selectedLeads.length} selected`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="h-9 border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors flex items-center gap-2">
            <Download className="h-4 w-4" />
            <span className="text-sm font-medium">Export</span>
          </Button>

          <Button variant="outline" className="h-9 border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <span className="text-sm font-medium">Import</span>
          </Button>

          <Button
            onClick={() => setShowLeadModal(true)}
            className="h-9 bg-gray-900 hover:bg-gray-800 text-white transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm font-medium">Add Lead</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-1 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4">
          <div className="md:col-span-4 space-y-1.5">
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 bg-gray-50 border-gray-200 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 bg-gray-50 border-gray-200 focus:bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="responded">Responded</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="dead">Dead</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Source</Label>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="h-9 bg-gray-50 border-gray-200 focus:bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="csv_import">CSV Import</SelectItem>
                <SelectItem value="deep_research">AI Research</SelectItem>
                <SelectItem value="api">API</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Segment</Label>
            <Select value={segmentFilter} onValueChange={setSegmentFilter}>
              <SelectTrigger className="h-9 bg-gray-50 border-gray-200 focus:bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Segments</SelectItem>
                {segments.map(segment => (
                  <SelectItem key={segment.id} value={segment.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: segment.color }}
                      />
                      {segment.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
                setSourceFilter('all')
                setSegmentFilter('all')
              }}
              className="w-full h-9 text-gray-500 hover:text-gray-900 text-sm"
            >
              Reset Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedLeads.length > 0 && (
        <div className="bg-gray-900 text-white rounded-lg px-4 py-3 shadow-lg flex items-center justify-between animate-in slide-in-from-bottom-2 fade-in duration-300">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {selectedLeads.length} lead{selectedLeads.length !== 1 ? 's' : ''} selected
            </span>
            <div className="h-4 w-px bg-gray-700" />
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBulkStatusUpdate('contacted')}
                className="text-gray-300 hover:text-white hover:bg-gray-800 h-8 text-xs"
              >
                Mark Contacted
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBulkStatusUpdate('qualified')}
                className="text-gray-300 hover:text-white hover:bg-gray-800 h-8 text-xs"
              >
                Mark Qualified
              </Button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedLeads([])}
            className="text-gray-400 hover:text-white hover:bg-gray-800 h-8 text-xs"
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Leads Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50 dark:bg-white/5 hover:bg-gray-50/50 border-gray-100 dark:border-white/5">
                <TableHead className="w-12 py-3">
                  <Checkbox
                    checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                    onCheckedChange={handleSelectAll}
                    className="border-gray-300 dark:border-gray-600 data-[state=checked]:bg-gray-900 dark:data-[state=checked]:bg-white data-[state=checked]:border-gray-900 dark:data-[state=checked]:border-white"
                  />
                </TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider py-3">Name</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider py-3">contact</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider py-3">Phone</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider py-3">Status</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider py-3">Segment</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider py-3">Last Contact</TableHead>
                <TableHead className="w-12 py-3"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => (
                <TableRow key={lead.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors border-gray-100 dark:border-white/5 group">
                  <TableCell className="py-3">
                    <Checkbox
                      checked={selectedLeads.includes(lead.id)}
                      onCheckedChange={(checked) => handleSelectLead(lead.id, checked as boolean)}
                      className="border-gray-300 dark:border-gray-600 data-[state=checked]:bg-gray-900 dark:data-[state=checked]:bg-white data-[state=checked]:border-gray-900 dark:data-[state=checked]:border-white"
                    />
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{lead.name}</div>
                  </TableCell>
                  <TableCell className="py-3">
                    <a href={`mailto:${lead.email}`} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
                      {lead.email}
                    </a>
                  </TableCell>
                  <TableCell className="py-3">
                    {lead.phone ? (
                      <a href={`tel:${lead.phone}`} className="text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
                        {lead.phone}
                      </a>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600">-</span>
                    )}
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge variant="outline" className={`${getStatusColor(lead.status)} border bg-opacity-50 font-medium`}>
                      {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3">
                    {lead.segment_id && (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full ring-1 ring-offset-1 ring-gray-100 dark:ring-white/10"
                          style={{
                            backgroundColor: segments.find(s => s.id === lead.segment_id)?.color || '#9ca3af'
                          }}
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {segments.find(s => s.id === lead.segment_id)?.name || 'Unknown'}
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="py-3">
                    {lead.last_contacted_at ? (
                      <div className="text-sm text-gray-500 dark:text-gray-300">
                        {new Date(lead.last_contacted_at).toLocaleDateString()}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-400 font-medium px-2 py-0.5 bg-gray-50 dark:bg-white/5 rounded-full">New</span>
                    )}
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10"
                        onClick={() => {
                          setEditingLead(lead)
                          setShowLeadModal(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => handleDeleteLead(lead.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredLeads.length === 0 && (
          <div className="text-center py-16 bg-gray-50/30">
            <div className="max-w-xs mx-auto text-center">
              <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                {searchTerm || statusFilter !== 'all' || sourceFilter !== 'all' || segmentFilter !== 'all'
                  ? 'No matching leads'
                  : 'No leads yet'}
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                {searchTerm || statusFilter !== 'all' || sourceFilter !== 'all' || segmentFilter !== 'all'
                  ? 'Try adjusting your filters or search terms'
                  : 'Get started by adding your first lead to the system'}
              </p>
              {leads.length === 0 && (
                <Button
                  onClick={() => setShowLeadModal(true)}
                  className="bg-gray-900 text-white hover:bg-gray-800"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Lead
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Lead Modal */}
      <NewLeadModal
        open={showLeadModal}
        onClose={() => {
          setShowLeadModal(false)
          setEditingLead(null)
        }}
        workspaceId={workspaceId}
        lead={editingLead}
        outreachType={outreachType}
      />
    </div>
  )
}
