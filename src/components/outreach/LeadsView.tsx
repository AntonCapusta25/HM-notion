// LeadsView.tsx - Lead management interface
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  Globe, 
  Linkedin, 
  Twitter,
  Download,
  Upload,
  Eye,
  MoreHorizontal,
  Star,
  StarOff
} from 'lucide-react'
import { useOutreachStore } from '@/hooks/useOutreachStore'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

interface LeadsViewProps {
  workspaceId: string
}

interface Lead {
  id: string
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
  research_data?: any
  segment_id?: string
  created_at: string
  updated_at: string
  last_contacted_at?: string
}

export default function LeadsView({ workspaceId }: LeadsViewProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [segmentFilter, setSegmentFilter] = useState('all')
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [showLeadModal, setShowLeadModal] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [sortField, setSortField] = useState<keyof Lead>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const { 
    leads, 
    segments, 
    loading,
    fetchLeads,
    fetchSegments,
    updateLead,
    deleteLead,
    bulkUpdateLeads
  } = useOutreachStore()
  
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (workspaceId) {
      fetchLeads(workspaceId)
      fetchSegments(workspaceId)
    }
  }, [workspaceId])

  // Filter and sort leads
  const filteredLeads = leads
    .filter(lead => {
      const matchesSearch = !searchTerm || 
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.company && lead.company.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter
      const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter
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
      case 'new': return 'bg-blue-100 text-blue-800'
      case 'contacted': return 'bg-yellow-100 text-yellow-800'
      case 'responded': return 'bg-purple-100 text-purple-800'
      case 'qualified': return 'bg-green-100 text-green-800'
      case 'converted': return 'bg-emerald-100 text-emerald-800'
      case 'dead': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
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
          <h2 className="text-2xl font-bold text-gray-900">Leads</h2>
          <p className="text-gray-600">
            {filteredLeads.length} of {leads.length} leads
            {selectedLeads.length > 0 && ` • ${selectedLeads.length} selected`}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          
          <Button variant="outline" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          
          <Button 
            onClick={() => setShowLeadModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
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

            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger>
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

            <div className="space-y-2">
              <Label>Segment</Label>
              <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Segments</SelectItem>
                  {segments.map(segment => (
                    <SelectItem key={segment.id} value={segment.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: segment.color }}
                        />
                        {segment.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Actions</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('all')
                    setSourceFilter('all')
                    setSegmentFilter('all')
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedLeads.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  {selectedLeads.length} lead{selectedLeads.length !== 1 ? 's' : ''} selected
                </span>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleBulkStatusUpdate('contacted')}
                  >
                    Mark as Contacted
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleBulkStatusUpdate('qualified')}
                  >
                    Mark as Qualified
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleBulkStatusUpdate('dead')}
                  >
                    Mark as Dead
                  </Button>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedLeads([])}
              >
                Clear Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leads Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Segment</TableHead>
                  <TableHead>Last Contact</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedLeads.includes(lead.id)}
                        onCheckedChange={(checked) => handleSelectLead(lead.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{lead.name}</div>
                        {lead.position && (
                          <div className="text-sm text-gray-600">{lead.position}</div>
                        )}
                        <div className="flex items-center gap-2">
                          {lead.phone && (
                            <a href={`tel:${lead.phone}`} className="text-gray-400 hover:text-gray-600">
                              <Phone className="h-3 w-3" />
                            </a>
                          )}
                          {lead.website && (
                            <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600">
                              <Globe className="h-3 w-3" />
                            </a>
                          )}
                          {lead.linkedin_url && (
                            <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600">
                              <Linkedin className="h-3 w-3" />
                            </a>
                          )}
                          {lead.twitter_url && (
                            <a href={lead.twitter_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600">
                              <Twitter className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {lead.company && (
                          <div className="font-medium">{lead.company}</div>
                        )}
                        {lead.industry && (
                          <div className="text-sm text-gray-600">{lead.industry}</div>
                        )}
                        {lead.location && (
                          <div className="text-sm text-gray-500">{lead.location}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <a href={`mailto:${lead.email}`} className="text-blue-600 hover:text-blue-800">
                        {lead.email}
                      </a>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(lead.status)}>
                        {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className={`font-medium ${getScoreColor(lead.lead_score)}`}>
                        {lead.lead_score}/100
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {lead.source.replace('_', ' ').charAt(0).toUpperCase() + lead.source.replace('_', ' ').slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {lead.segment_id && (
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ 
                              backgroundColor: segments.find(s => s.id === lead.segment_id)?.color || '#gray' 
                            }}
                          />
                          <span className="text-sm">
                            {segments.find(s => s.id === lead.segment_id)?.name || 'Unknown'}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {lead.last_contacted_at ? (
                        <div className="text-sm text-gray-600">
                          {new Date(lead.last_contacted_at).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-gray-400">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingLead(lead)
                            setShowLeadModal(true)
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteLead(lead.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {filteredLeads.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500">
                {searchTerm || statusFilter !== 'all' || sourceFilter !== 'all' || segmentFilter !== 'all' 
                  ? 'No leads match your filters' 
                  : 'No leads yet'}
              </div>
              {leads.length === 0 && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setShowLeadModal(true)}
                >
                  Add Your First Lead
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
