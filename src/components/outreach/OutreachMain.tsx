// OutreachMain.tsx - Dual-purpose outreach system
import React, { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Users, Mail, Settings, Search, Upload, BarChart3, ChefHat, Briefcase } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useOutreachStore } from '@/hooks/useOutreachStore'
import { useCollabStore } from '@/hooks/useCollabStore'

// Import components
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
  const [topLevelTab, setTopLevelTab] = useState('collabs')
  const [activeTab, setActiveTab] = useState('leads')
  const [showCSVImport, setShowCSVImport] = useState(false)
  const [showNewCampaign, setShowNewCampaign] = useState(false)

  const { user } = useAuth()
  const clientStore = useOutreachStore()
  const collabStore = useCollabStore()

  // Initialize both stores on mount
  useEffect(() => {
    if (workspaceId) {
      clientStore.initializeWorkspace(workspaceId)
      collabStore.initializeWorkspace(workspaceId)
    }
  }, [workspaceId])

  // Get current store based on active tab
  const currentStore = topLevelTab === 'collabs' ? collabStore : clientStore
  const { leads, campaigns, segments, analytics, loading, error } = currentStore

  const stats = {
    totalLeads: leads.length,
    activeLeads: leads.filter(l => l.status === 'new' || l.status === 'contacted').length,
    convertedLeads: leads.filter(l => l.status === 'converted').length,
    activeCampaigns: campaigns.filter(c => c.status === 'running').length,
    openRate: analytics?.overall_open_rate || 0,
    responseRate: analytics?.overall_response_rate || 0
  }

  // Handle loading state
  if (loading && leads.length === 0) {
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
              currentStore.clearError()
              currentStore.initializeWorkspace(workspaceId)
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
    <div className="w-full h-full bg-gray-50/50 dark:bg-background min-h-screen transition-colors duration-300">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Minimalist Header */}
        <div className="flex items-center justify-between pb-6 border-b border-gray-200 dark:border-white/10">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">Lead Outreach</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-lg">
              {topLevelTab === 'collabs'
                ? 'Manage internal team outreach to chefs'
                : 'Oversee client platform users'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowCSVImport(true)}
              className="flex items-center gap-2 h-10 px-4 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-white/10 shadow-sm transition-all"
            >
              <Upload className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              Import CSV
            </Button>

            <Button
              onClick={() => setShowNewCampaign(true)}
              className="flex items-center gap-2 h-10 px-4 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-gray-900 shadow-sm transition-all"
            >
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          </div>
        </div>

        {/* Top-Level Tabs: Collabs vs Clients - Apple-style Segmented Control */}
        <div className="space-y-6">
          <Tabs value={topLevelTab} onValueChange={setTopLevelTab} className="w-full">
            <div className="w-full flex justify-center mb-8">
              <TabsList className="bg-gray-100/80 dark:bg-white/5 p-1.5 rounded-full h-12 w-[500px] shadow-inner backdrop-blur-sm">
                <TabsTrigger
                  value="collabs"
                  className="flex-1 rounded-full text-base font-medium transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm text-gray-500 dark:text-gray-400"
                >
                  <div className="flex items-center justify-center gap-2">
                    <ChefHat className="h-4 w-4" />
                    Collabs
                  </div>
                </TabsTrigger>
                <TabsTrigger
                  value="clients"
                  className="flex-1 rounded-full text-base font-medium transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm text-gray-500 dark:text-gray-400"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Clients
                  </div>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Collabs Tab Content */}
            <TabsContent value="collabs" className="space-y-8 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
              {/* Stats Grid - Minimalist Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { icon: Users, label: 'Total Leads', value: stats.totalLeads, color: 'text-gray-900' },
                  { icon: Search, label: 'Active', value: stats.activeLeads, color: 'text-gray-900' },
                  { icon: Mail, label: 'Campaigns', value: stats.activeCampaigns, color: 'text-gray-900' },
                  { icon: BarChart3, label: 'Open Rate', value: `${stats.openRate.toFixed(1)}%`, color: 'text-gray-900' },
                  { icon: Mail, label: 'Response', value: `${stats.responseRate.toFixed(1)}%`, color: 'text-gray-900' },
                  { icon: BarChart3, label: 'Converted', value: stats.convertedLeads, color: 'text-gray-900' },
                ].map((stat, i) => (
                  <Card key={i} className="border border-gray-100 shadow-sm hover:shadow-md transition-all bg-white">
                    <CardContent className="p-5">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{stat.label}</span>
                          <stat.icon className="h-4 w-4 text-gray-400" />
                        </div>
                        <div className="text-2xl font-semibold text-gray-900 tracking-tight">
                          {stat.value}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Sub-tabs for Collabs */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <div className="border-b border-gray-100 px-6 py-2">
                    <TabsList className="bg-transparent h-12 w-full justify-start gap-6 p-0">
                      {[
                        { value: 'leads', label: 'Chefs', icon: Users },
                        { value: 'campaigns', label: 'Campaigns', icon: Mail },
                        { value: 'segments', label: 'Segments', icon: Users },
                        { value: 'analytics', label: 'Analytics', icon: BarChart3 },
                        { value: 'settings', label: 'Settings', icon: Settings },
                      ].map((tab) => (
                        <TabsTrigger
                          key={tab.value}
                          value={tab.value}
                          className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-gray-900 text-gray-500 border-b-2 border-transparent data-[state=active]:border-gray-900 rounded-none px-0 pb-3 pt-3 font-medium transition-all"
                        >
                          <div className="flex items-center gap-2">
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                          </div>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  <div className="p-6 bg-gray-50/30 min-h-[500px]">
                    <TabsContent value="leads" className="mt-0 focus-visible:outline-none">
                      <LeadsView workspaceId={workspaceId} outreachType="collab" />
                    </TabsContent>
                    <TabsContent value="campaigns" className="mt-0 focus-visible:outline-none">
                      <CampaignsView workspaceId={workspaceId} outreachType="collab" />
                    </TabsContent>
                    <TabsContent value="segments" className="mt-0 focus-visible:outline-none">
                      <SegmentsView workspaceId={workspaceId} />
                    </TabsContent>
                    <TabsContent value="analytics" className="mt-0 focus-visible:outline-none">
                      <AnalyticsView workspaceId={workspaceId} />
                    </TabsContent>
                    <TabsContent value="settings" className="mt-0 focus-visible:outline-none">
                      <OutreachSettings workspaceId={workspaceId} outreachType="collab" />
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </TabsContent>

            {/* Clients Tab Content */}
            <TabsContent value="clients" className="space-y-8 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
              {/* Stats Grid - Same minimalist style */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { icon: Users, label: 'Total Users', value: stats.totalLeads },
                  { icon: Search, label: 'Active', value: stats.activeLeads },
                  { icon: Mail, label: 'Running', value: stats.activeCampaigns },
                  { icon: BarChart3, label: 'Open Rate', value: `${stats.openRate.toFixed(1)}%` },
                  { icon: Mail, label: 'Response', value: `${stats.responseRate.toFixed(1)}%` },
                  { icon: BarChart3, label: 'Success', value: stats.convertedLeads },
                ].map((stat, i) => (
                  <Card key={i} className="border border-gray-100 shadow-sm hover:shadow-md transition-all bg-white">
                    <CardContent className="p-5">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{stat.label}</span>
                          <stat.icon className="h-4 w-4 text-gray-400" />
                        </div>
                        <div className="text-2xl font-semibold text-gray-900 tracking-tight">
                          {stat.value}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Sub-tabs for Clients */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <div className="border-b border-gray-100 px-6 py-2">
                    <TabsList className="bg-transparent h-12 w-full justify-start gap-6 p-0">
                      {[
                        { value: 'leads', label: 'Leads', icon: Users },
                        { value: 'campaigns', label: 'Campaigns', icon: Mail },
                        { value: 'segments', label: 'Segments', icon: Users },
                        { value: 'analytics', label: 'Analytics', icon: BarChart3 },
                        { value: 'settings', label: 'Settings', icon: Settings },
                      ].map((tab) => (
                        <TabsTrigger
                          key={tab.value}
                          value={tab.value}
                          className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-gray-900 text-gray-500 border-b-2 border-transparent data-[state=active]:border-gray-900 rounded-none px-0 pb-3 pt-3 font-medium transition-all"
                        >
                          <div className="flex items-center gap-2">
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                          </div>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  <div className="p-6 bg-gray-50/30 min-h-[500px]">
                    <TabsContent value="leads" className="mt-0 focus-visible:outline-none">
                      <LeadsView workspaceId={workspaceId} outreachType="client" />
                    </TabsContent>
                    <TabsContent value="campaigns" className="mt-0 focus-visible:outline-none">
                      <CampaignsView workspaceId={workspaceId} outreachType="client" />
                    </TabsContent>
                    <TabsContent value="segments" className="mt-0 focus-visible:outline-none">
                      <SegmentsView workspaceId={workspaceId} />
                    </TabsContent>
                    <TabsContent value="analytics" className="mt-0 focus-visible:outline-none">
                      <AnalyticsView workspaceId={workspaceId} />
                    </TabsContent>
                    <TabsContent value="settings" className="mt-0 focus-visible:outline-none">
                      <OutreachSettings workspaceId={workspaceId} outreachType="client" />
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </TabsContent>
          </Tabs>
        </div>

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
      </div>
    </div>
  )
}
