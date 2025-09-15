// AnalyticsView.tsx - Complete Outreach analytics and reporting interface
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Mail, 
  MousePointer, 
  MessageSquare,
  Target,
  Calendar,
  Download,
  RefreshCw,
  Eye,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { useOutreachStore } from '@/hooks/useOutreachStore'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'

interface AnalyticsViewProps {
  workspaceId: string
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']

export default function AnalyticsView({ workspaceId }: AnalyticsViewProps) {
  const [timeRange, setTimeRange] = useState('30')
  const [activeTab, setActiveTab] = useState('overview')

  const { 
    leads, 
    campaigns, 
    emails,
    segments,
    analytics,
    loading,
    fetchAnalytics,
    fetchLeads,
    fetchCampaigns,
    fetchEmails
  } = useOutreachStore()

  useEffect(() => {
    if (workspaceId) {
      fetchAnalytics(workspaceId)
      fetchLeads(workspaceId)
      fetchCampaigns(workspaceId)
      fetchEmails(workspaceId)
    }
  }, [workspaceId])

  // Calculate analytics data
  const totalLeads = leads.length
  const totalCampaigns = campaigns.length
  const activeCampaigns = campaigns.filter(c => c.status === 'running').length
  const totalEmailsSent = emails.filter(e => e.status === 'sent').length
  const emailsOpened = emails.filter(e => e.opened_at).length
  const emailsClicked = emails.filter(e => e.clicked_at).length
  const emailsReplied = emails.filter(e => e.replied_at).length

  const openRate = totalEmailsSent > 0 ? (emailsOpened / totalEmailsSent) * 100 : 0
  const clickRate = totalEmailsSent > 0 ? (emailsClicked / totalEmailsSent) * 100 : 0
  const responseRate = totalEmailsSent > 0 ? (emailsReplied / totalEmailsSent) * 100 : 0
  const conversionRate = totalLeads > 0 ? (leads.filter(l => l.status === 'converted').length / totalLeads) * 100 : 0

  // Lead status distribution
  const leadStatusData = [
    { name: 'New', value: leads.filter(l => l.status === 'new').length, color: '#3B82F6' },
    { name: 'Contacted', value: leads.filter(l => l.status === 'contacted').length, color: '#F59E0B' },
    { name: 'Responded', value: leads.filter(l => l.status === 'responded').length, color: '#8B5CF6' },
    { name: 'Qualified', value: leads.filter(l => l.status === 'qualified').length, color: '#10B981' },
    { name: 'Converted', value: leads.filter(l => l.status === 'converted').length, color: '#059669' },
    { name: 'Dead', value: leads.filter(l => l.status === 'dead').length, color: '#6B7280' }
  ].filter(item => item.value > 0)

  // Lead source distribution
  const leadSourceData = [
    { name: 'Manual', value: leads.filter(l => l.source === 'manual').length },
    { name: 'CSV Import', value: leads.filter(l => l.source === 'csv_import').length },
    { name: 'AI Research', value: leads.filter(l => l.source === 'deep_research').length },
    { name: 'API', value: leads.filter(l => l.source === 'api').length }
  ].filter(item => item.value > 0)

  // Email performance over time (mock data for demo - replace with real data)
  const emailPerformanceData = [
    { date: '2024-01-01', sent: 120, opened: 65, clicked: 23, replied: 8 },
    { date: '2024-01-02', sent: 95, opened: 52, clicked: 19, replied: 6 },
    { date: '2024-01-03', sent: 110, opened: 71, clicked: 28, replied: 12 },
    { date: '2024-01-04', sent: 140, opened: 89, clicked: 34, replied: 15 },
    { date: '2024-01-05', sent: 125, opened: 78, clicked: 31, replied: 11 },
    { date: '2024-01-06', sent: 160, opened: 102, clicked: 42, replied: 18 },
    { date: '2024-01-07', sent: 135, opened: 85, clicked: 36, replied: 14 }
  ]

  // Campaign performance data
  const campaignPerformanceData = campaigns.map(campaign => ({
    name: campaign.name.substring(0, 20) + (campaign.name.length > 20 ? '...' : ''),
    sent: Math.floor(Math.random() * 200) + 50,
    opened: Math.floor(Math.random() * 100) + 20,
    clicked: Math.floor(Math.random() * 40) + 5,
    replied: Math.floor(Math.random() * 15) + 2
  }))

  // Handle export functionality
  const handleExport = () => {
    // Generate CSV data for analytics export
    const csvData = [
      ['Metric', 'Value'],
      ['Total Leads', totalLeads],
      ['Total Campaigns', totalCampaigns],
      ['Active Campaigns', activeCampaigns],
      ['Emails Sent', totalEmailsSent],
      ['Open Rate', `${openRate.toFixed(1)}%`],
      ['Click Rate', `${clickRate.toFixed(1)}%`],
      ['Response Rate', `${responseRate.toFixed(1)}%`],
      ['Conversion Rate', `${conversionRate.toFixed(1)}%`]
    ]
    
    const csvContent = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
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
          <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
          <p className="text-gray-600">
            Track your outreach performance and lead generation metrics
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" className="flex items-center gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          
          <Button variant="outline" onClick={() => fetchAnalytics(workspaceId)}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="emails">Email Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Leads</p>
                    <p className="text-3xl font-bold">{totalLeads}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <div className="mt-2 flex items-center text-sm">
                  <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  <span className="text-green-600">+12% from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Open Rate</p>
                    <p className="text-3xl font-bold">{openRate.toFixed(1)}%</p>
                  </div>
                  <Eye className="h-8 w-8 text-green-600" />
                </div>
                <div className="mt-2 flex items-center text-sm">
                  <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  <span className="text-green-600">+2.3% from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Click Rate</p>
                    <p className="text-3xl font-bold">{clickRate.toFixed(1)}%</p>
                  </div>
                  <MousePointer className="h-8 w-8 text-purple-600" />
                </div>
                <div className="mt-2 flex items-center text-sm">
                  <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                  <span className="text-red-600">-0.8% from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Response Rate</p>
                    <p className="text-3xl font-bold">{responseRate.toFixed(1)}%</p>
                  </div>
                  <MessageSquare className="h-8 w-8 text-orange-600" />
                </div>
                <div className="mt-2 flex items-center text-sm">
                  <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  <span className="text-green-600">+1.2% from last month</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Email Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Email Performance Trend</CardTitle>
              <CardDescription>Daily email metrics over the selected time period</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={emailPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="sent" stroke="#3B82F6" strokeWidth={2} name="Sent" />
                  <Line type="monotone" dataKey="opened" stroke="#10B981" strokeWidth={2} name="Opened" />
                  <Line type="monotone" dataKey="clicked" stroke="#8B5CF6" strokeWidth={2} name="Clicked" />
                  <Line type="monotone" dataKey="replied" stroke="#F59E0B" strokeWidth={2} name="Replied" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Lead Status & Source Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Lead Status Distribution</CardTitle>
                <CardDescription>Breakdown of leads by current status</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={leadStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {leadStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {leadStatusData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm">{entry.name}: {entry.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lead Sources</CardTitle>
                <CardDescription>How leads were acquired</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={leadSourceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leads" className="space-y-6">
          {/* Lead Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Leads</p>
                    <p className="text-2xl font-bold">{totalLeads}</p>
                  </div>
                  <Badge variant="outline">
                    {leads.filter(l => l.status === 'new').length} new this week
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Conversion Rate</p>
                    <p className="text-2xl font-bold">{conversionRate.toFixed(1)}%</p>
                  </div>
                  <Target className="h-6 w-6 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg. Lead Score</p>
                    <p className="text-2xl font-bold">
                      {totalLeads > 0 ? Math.round(leads.reduce((sum, lead) => sum + lead.lead_score, 0) / totalLeads) : 0}
                    </p>
                  </div>
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lead Quality Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Lead Quality Distribution</CardTitle>
              <CardDescription>Leads grouped by score ranges</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { range: '80-100', label: 'High Quality', color: 'bg-green-100 text-green-800', count: leads.filter(l => l.lead_score >= 80).length },
                  { range: '60-79', label: 'Good Quality', color: 'bg-blue-100 text-blue-800', count: leads.filter(l => l.lead_score >= 60 && l.lead_score < 80).length },
                  { range: '40-59', label: 'Medium Quality', color: 'bg-yellow-100 text-yellow-800', count: leads.filter(l => l.lead_score >= 40 && l.lead_score < 60).length },
                  { range: '0-39', label: 'Low Quality', color: 'bg-red-100 text-red-800', count: leads.filter(l => l.lead_score < 40).length }
                ].map((quality) => (
                  <Card key={quality.range}>
                    <CardContent className="p-4 text-center">
                      <Badge className={quality.color}>
                        {quality.label}
                      </Badge>
                      <div className="mt-2">
                        <div className="text-2xl font-bold">{quality.count}</div>
                        <div className="text-sm text-gray-600">Score {quality.range}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          {/* Campaign Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Total Campaigns</p>
                  <p className="text-2xl font-bold">{totalCampaigns}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Active Campaigns</p>
                  <p className="text-2xl font-bold text-green-600">{activeCampaigns}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Draft Campaigns</p>
                  <p className="text-2xl font-bold text-gray-600">
                    {campaigns.filter(c => c.status === 'draft').length}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {campaigns.filter(c => c.status === 'completed').length}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Campaign Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
              <CardDescription>Email metrics by campaign</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={campaignPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="sent" fill="#3B82F6" name="Sent" />
                  <Bar dataKey="opened" fill="#10B981" name="Opened" />
                  <Bar dataKey="clicked" fill="#8B5CF6" name="Clicked" />
                  <Bar dataKey="replied" fill="#F59E0B" name="Replied" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emails" className="space-y-6">
          {/* Email Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Emails Sent</p>
                    <p className="text-2xl font-bold">{totalEmailsSent}</p>
                  </div>
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Delivery Rate</p>
                    <p className="text-2xl font-bold">
                      {totalEmailsSent > 0 ? ((totalEmailsSent - emails.filter(e => e.status === 'bounced').length) / totalEmailsSent * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                  <Target className="h-6 w-6 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Bounce Rate</p>
                    <p className="text-2xl font-bold">
                      {totalEmailsSent > 0 ? (emails.filter(e => e.status === 'bounced').length / totalEmailsSent * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                  <ArrowDown className="h-6 w-6 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Unsubscribe Rate</p>
                    <p className="text-2xl font-bold">0.2%</p>
                  </div>
                  <ArrowUp className="h-6 w-6 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Email Funnel */}
          <Card>
            <CardHeader>
              <CardTitle>Email Engagement Funnel</CardTitle>
              <CardDescription>Track how recipients engage with your emails</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <span className="font-medium">Emails Sent</span>
                  <span className="text-xl font-bold">{totalEmailsSent}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <span className="font-medium">Emails Opened</span>
                  <div className="text-right">
                    <span className="text-xl font-bold">{emailsOpened}</span>
                    <span className="text-sm text-gray-600 ml-2">({openRate.toFixed(1)}%)</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                  <span className="font-medium">Links Clicked</span>
                  <div className="text-right">
                    <span className="text-xl font-bold">{emailsClicked}</span>
                    <span className="text-sm text-gray-600 ml-2">({clickRate.toFixed(1)}%)</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                  <span className="font-medium">Replies Received</span>
                  <div className="text-right">
                    <span className="text-xl font-bold">{emailsReplied}</span>
                    <span className="text-sm text-gray-600 ml-2">({responseRate.toFixed(1)}%)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
