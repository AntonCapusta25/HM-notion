// CampaignsView.tsx - Email campaign management interface
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Play, 
  Pause, 
  Edit, 
  Trash2, 
  Copy,
  Plus,
  Search,
  Filter,
  Calendar,
  Users,
  Mail,
  Eye,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { useOutreachStore } from '@/hooks/useOutreachStore'
import { useAuthStore } from '@/hooks/useAuthStore'
import { useToast } from '@/hooks/use-toast'

interface CampaignsViewProps {
  workspaceId: string
}

interface Campaign {
  id: string
  name: string
  description?: string
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed'
  subject_line: string
  email_template: string
  scheduled_at?: string
  send_immediately: boolean
  created_at: string
  updated_at: string
  settings: any
  outreach_types?: { name: string }
  lead_segments?: { name: string; color: string }
  _count?: {
    outreach_emails: number
  }
  stats?: {
    total_emails: number
    sent: number
    delivered: number
    opened: number
    clicked: number
    replied: number
    bounced: number
    failed: number
  }
}

export default function CampaignsView({ workspaceId }: CampaignsViewProps) {
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCampaignModal, setShowCampaignModal] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)

  const { 
    campaigns, 
    loading,
    fetchCampaigns,
    updateCampaign,
    deleteCampaign,
    launchCampaign,
    pauseCampaign
  } = useOutreachStore()
  
  const { user } = useAuthStore()
  const { toast } = useToast()

  useEffect(() => {
    if (workspaceId) {
      fetchCampaigns(workspaceId)
    }
  }, [workspaceId])

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = !searchTerm || 
      campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.subject_line.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter
    const matchesTab = activeTab === 'all' || 
      (activeTab === 'active' && ['running', 'scheduled'].includes(campaign.status)) ||
      (activeTab === 'draft' && campaign.status === 'draft') ||
      (activeTab === 'completed' && campaign.status === 'completed')
    
    return matchesSearch && matchesStatus && matchesTab
  })

  const handleLaunchCampaign = async (campaignId: string) => {
    try {
      await launchCampaign(campaignId)
      toast({
        title: "Campaign launched",
        description: "Your email campaign has been started successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to launch campaign",
        variant: "destructive"
      })
    }
  }

  const handlePauseCampaign = async (campaignId: string) => {
    try {
      await pauseCampaign(campaignId)
      toast({
        title: "Campaign paused",
        description: "Your email campaign has been paused",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to pause campaign",
        variant: "destructive"
      })
    }
  }

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      return
    }

    try {
      await deleteCampaign(campaignId)
      toast({
        title: "Campaign deleted",
        description: "Campaign has been permanently deleted",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete campaign",
        variant: "destructive"
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Edit className="h-4 w-4 text-gray-500" />
      case 'scheduled':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'running':
        return <Play className="h-4 w-4 text-green-500" />
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'running': return 'bg-green-100 text-green-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-emerald-100 text-emerald-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const calculateOpenRate = (campaign: Campaign) => {
    const stats = campaign.stats
    if (!stats || stats.sent === 0) return 0
    return Math.round((stats.opened / stats.sent) * 100)
  }

  const calculateClickRate = (campaign: Campaign) => {
    const stats = campaign.stats
    if (!stats || stats.sent === 0) return 0
    return Math.round((stats.clicked / stats.sent) * 100)
  }

  const calculateResponseRate = (campaign: Campaign) => {
    const stats = campaign.stats
    if (!stats || stats.sent === 0) return 0
    return Math.round((stats.replied / stats.sent) * 100)
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
          <h2 className="text-2xl font-bold text-gray-900">Email Campaigns</h2>
          <p className="text-gray-600">
            Manage and track your outreach campaigns
          </p>
        </div>
        
        <Button 
          onClick={() => setShowCampaignModal(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search campaigns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Campaigns</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="draft">Drafts</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredCampaigns.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Mail className="h-12 w-12 text-gray-400 mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No campaigns found</h4>
                <p className="text-gray-600 text-center mb-4">
                  {campaigns.length === 0 
                    ? "Create your first email campaign to start reaching out to leads"
                    : "No campaigns match your current filters"
                  }
                </p>
                {campaigns.length === 0 && (
                  <Button onClick={() => setShowCampaignModal(true)}>
                    Create Campaign
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {filteredCampaigns.map((campaign) => (
                <Card key={campaign.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{campaign.name}</h3>
                          <Badge className={getStatusColor(campaign.status)}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(campaign.status)}
                              {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                            </div>
                          </Badge>
                        </div>

                        {campaign.description && (
                          <p className="text-gray-600 mb-3">{campaign.description}</p>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                          <div>
                            <Label className="text-sm text-gray-500">Subject Line</Label>
                            <p className="font-medium truncate">{campaign.subject_line}</p>
                          </div>

                          {campaign.outreach_types && (
                            <div>
                              <Label className="text-sm text-gray-500">Type</Label>
                              <p className="font-medium">{campaign.outreach_types.name}</p>
                            </div>
                          )}

                          {campaign.lead_segments && (
                            <div>
                              <Label className="text-sm text-gray-500">Target Segment</Label>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: campaign.lead_segments.color }}
                                />
                                <span className="font-medium">{campaign.lead_segments.name}</span>
                              </div>
                            </div>
                          )}

                          <div>
                            <Label className="text-sm text-gray-500">Created</Label>
                            <p className="font-medium">
                              {new Date(campaign.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {/* Campaign Stats */}
                        {campaign.stats && campaign.stats.total_emails > 0 && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">
                                  {campaign.stats.sent}
                                </div>
                                <div className="text-gray-600">Sent</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">
                                  {calculateOpenRate(campaign)}%
                                </div>
                                <div className="text-gray-600">Opened</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-purple-600">
                                  {calculateClickRate(campaign)}%
                                </div>
                                <div className="text-gray-600">Clicked</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-orange-600">
                                  {calculateResponseRate(campaign)}%
                                </div>
                                <div className="text-gray-600">Replied</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-red-600">
                                  {campaign.stats.bounced + campaign.stats.failed}
                                </div>
                                <div className="text-gray-600">Bounced</div>
                              </div>
                            </div>

                            {/* Progress Bar */}
                            {campaign.status === 'running' && (
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>Progress</span>
                                  <span>
                                    {campaign.stats.sent} / {campaign.stats.total_emails} emails sent
                                  </span>
                                </div>
                                <Progress 
                                  value={(campaign.stats.sent / campaign.stats.total_emails) * 100} 
                                  className="w-full" 
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Scheduled Info */}
                        {campaign.scheduled_at && campaign.status === 'scheduled' && (
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-blue-600" />
                              <span className="text-blue-800 font-medium">
                                Scheduled for {new Date(campaign.scheduled_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 ml-4">
                        {campaign.status === 'draft' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleLaunchCampaign(campaign.id)}
                            className="flex items-center gap-2"
                          >
                            <Play className="h-4 w-4" />
                            Launch
                          </Button>
                        )}

                        {campaign.status === 'running' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePauseCampaign(campaign.id)}
                            className="flex items-center gap-2"
                          >
                            <Pause className="h-4 w-4" />
                            Pause
                          </Button>
                        )}

                        {campaign.status === 'paused' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleLaunchCampaign(campaign.id)}
                            className="flex items-center gap-2"
                          >
                            <Play className="h-4 w-4" />
                            Resume
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingCampaign(campaign)
                            setShowCampaignModal(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Duplicate campaign logic
                            const duplicatedCampaign = {
                              ...campaign,
                              name: `${campaign.name} (Copy)`,
                              status: 'draft' as const,
                              id: undefined
                            }
                            setEditingCampaign(duplicatedCampaign)
                            setShowCampaignModal(true)
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>

                        {['draft', 'paused', 'completed'].includes(campaign.status) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteCampaign(campaign.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
