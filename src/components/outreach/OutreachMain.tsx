// OutreachMain.tsx - Main outreach system component with corrected imports
import React, { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Users, Mail, Settings, Search, Upload, Brain, BarChart3, Download } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext';
import { useOutreachStore } from '@/hooks/useOutreachStore'

// Fixed import paths - components are in the same directory, not in a subfolder
import LeadsView from './LeadsView'
import CampaignsView from './CampaignsView'
import DeepResearchView from './DeepResearchView'
import SegmentsView from './SegmentsView'
import OutreachSettings from './OutreachSettings'
import AnalyticsView from './AnalyticsView'
import CSVImportModal from './CSVImportModal'
import NewCampaignModal from './NewCampaignModal'
import NewResearchJobModal from './NewResearchJobModal'

interface OutreachMainProps {
  workspaceId: string
}

export default function OutreachMain({ workspaceId }: OutreachMainProps) {
  const [activeTab, setActiveTab] = useState('leads')
  const [showCSVImport, setShowCSVImport] = useState(false)
  const [showNewCampaign, setShowNewCampaign] = useState(false)
  const [showNewResearch, setShowNewResearch] = useState(false)
  
  const { user } = useAuth()
  const { 
    leads, 
    campaigns, 
    segments, 
    researchJobs,
    analytics,
    loading,
    fetchLeads,
    fetchCampaigns,
    fetchSegments,
    fetchResearchJobs,
    fetchAnalytics
  } = useOutreachStore()

  useEffect(() => {
    if (workspaceId) {
      fetchLeads(workspaceId)
      fetchCampaigns(workspaceId)
      fetchSegments(workspaceId)
      fetchResearchJobs(workspaceId)
      fetchAnalytics(workspaceId)
    }
  }, [workspaceId])

  const stats = {
    totalLeads: leads.length,
    activeLeads: leads.filter(l => l.status === 'new' || l.status === 'contacted').length,
    convertedLeads: leads.filter(l => l.status === 'converted').length,
    activeCampaigns: campaigns.filter(c => c.status === 'running').length,
    openRate: analytics?.overall_open_rate || 0,
    responseRate: analytics?.overall_response_rate || 0
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Outreach System</h1>
          <p className="text-gray-600">Manage leads, campaigns, and outreach automation</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowCSVImport(true)}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setShowNewResearch(true)}
            className="flex items-center gap-2"
          >
            <Brain className="h-4 w-4" />
            AI Research
          </Button>
          
          <Button
            onClick={() => setShowNewCampaign(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Leads</p>
                <p className="text-2xl font-bold">{stats.totalLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold">{stats.activeLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Campaigns</p>
                <p className="text-2xl font-bold">{stats.activeCampaigns}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">Open Rate</p>
              <p className="text-2xl font-bold">{stats.openRate.toFixed(1)}%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">Response Rate</p>
              <p className="text-2xl font-bold">{stats.responseRate.toFixed(1)}%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Converted</p>
                <p className="text-2xl font-bold">{stats.convertedLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="leads" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Leads
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="research" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Research
          </TabsTrigger>
          <TabsTrigger value="segments" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Segments
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="mt-6">
          <LeadsView workspaceId={workspaceId} />
        </TabsContent>

        <TabsContent value="campaigns" className="mt-6">
          <CampaignsView workspaceId={workspaceId} />
        </TabsContent>

        <TabsContent value="research" className="mt-6">
          <DeepResearchView workspaceId={workspaceId} />
        </TabsContent>

        <TabsContent value="segments" className="mt-6">
          <SegmentsView workspaceId={workspaceId} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <AnalyticsView workspaceId={workspaceId} />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <OutreachSettings workspaceId={workspaceId} />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <CSVImportModal 
        open={showCSVImport}
        onClose={() => setShowCSVImport(false)}
        workspaceId={workspaceId}
      />

      <NewCampaignModal
        open={showNewCampaign}
        onClose={() => setShowNewCampaign(false)}
        workspaceId={workspaceId}
      />

      <NewResearchJobModal
        open={showNewResearch}
        onClose={() => setShowNewResearch(false)}
        workspaceId={workspaceId}
      />
    </div>
  )
}
