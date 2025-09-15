// OutreachMain.tsx - Simplified outreach system without deep research
import React, { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Users, Mail, Settings, Search, Upload, BarChart3 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useOutreachStore } from '@/hooks/useOutreachStore'

// Import components - Deep research components removed
import LeadsView from './LeadsView'
import CampaignsView from './CampaignsView'
import SegmentsView from './SegmentsView'
import OutreachSettings from './OutreachSettings'
import AnalyticsView from './AnalyticsView'
import CSVImportModal from './CSVImportModal'
import NewCampaignModal from './NewCampaignModal'

interface OutreachMainProps {
  workspaceId: string
}

export default function OutreachMain({ workspaceId }: OutreachMainProps) {
  const [activeTab, setActiveTab] = useState('leads')
  const [showCSVImport, setShowCSVImport] = useState(false)
  const [showNewCampaign, setShowNewCampaign] = useState(false)
  
  const { user } = useAuth()
  const { 
    leads, 
    campaigns, 
    segments, 
    analytics,
    loading,
    error,
    initializeWorkspace,
    clearError
  } = useOutreachStore()

  // Initialize workspace data on mount
  useEffect(() => {
    if (workspaceId) {
      initializeWorkspace(workspaceId)
    }
  }, [workspaceId, initializeWorkspace])

  const stats = {
    totalLeads: leads.length,
    activeLeads: leads.filter(l => l.status === 'new' || l.status === 'contacted').length,
    convertedLeads: leads.filter(l => l.status === 'converted').length,
    activeCampaigns: campaigns.filter(c => c.status === 'running').length,
    openRate: analytics?.overall_open_rate || 0,
    responseRate: analytics?.overall_response_rate || 0
  }

  // Handle loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading outreach workspace...</p>
        </div>
      </div>
    )
  }

  // Handle error state
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error Loading Outreach Data</h3>
          <p className="text-red-600 mt-1">{error}</p>
          <button 
            onClick={() => {
              clearError()
              initializeWorkspace(workspaceId)
            }}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lead Outreach</h1>
          <p className="text-gray-600">Manage leads, campaigns, and email outreach</p>
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

      {/* Main Content Tabs - Removed Research Tab */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="leads" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Leads
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Campaigns
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

      {/* Modals - Removed NewResearchJobModal */}
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
    </div>
  )
}
