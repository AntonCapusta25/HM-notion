// DeepResearchView.tsx - AI-powered lead research interface
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { 
  Brain, 
  Play, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Users, 
  Search,
  Download,
  Eye,
  RefreshCw,
  AlertCircle,
  Zap,
  Plus
} from 'lucide-react'
import { useOutreachStore } from '@/hooks/useOutreachStore'
import { useToast } from '@/hooks/use-toast'

interface DeepResearchViewProps {
  workspaceId: string
}

interface ResearchTemplate {
  id: string
  name: string
  description: string
  industry: string
  promptTemplate: string
  criteriaSchema: any
}

interface ResearchJob {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  searchCriteria: any
  totalLeadsFound: number
  leadsImported: number
  createdAt: string
  completedAt?: string
  errorMessage?: string
  researchOutput?: string
  settings: any
}

const RESEARCH_TEMPLATES: ResearchTemplate[] = [
  {
    id: 'saas-founders',
    name: 'SaaS Founders & CEOs',
    description: 'Find founders and CEOs of SaaS companies for partnership outreach',
    industry: 'Technology',
    promptTemplate: 'Find founders and CEOs of SaaS companies in {location} with {companySize} employees, focusing on {industry} sector',
    criteriaSchema: {
      industry: { type: 'select', options: ['B2B SaaS', 'E-commerce', 'Fintech', 'Healthtech', 'Edtech'] },
      location: { type: 'text', placeholder: 'e.g., San Francisco, New York' },
      companySize: { type: 'select', options: ['1-10', '11-50', '51-200', '201-500', '500+'] }
    }
  },
  {
    id: 'marketing-directors',
    name: 'Marketing Directors',
    description: 'Target marketing decision-makers for marketing tool outreach',
    industry: 'Marketing',
    promptTemplate: 'Find Marketing Directors and CMOs at companies in {industry} industry with {revenueRange} revenue',
    criteriaSchema: {
      industry: { type: 'text', placeholder: 'e.g., E-commerce, SaaS, Manufacturing' },
      revenueRange: { type: 'select', options: ['$1M-10M', '$10M-50M', '$50M-100M', '$100M+'] }
    }
  },
  {
    id: 'startup-investors',
    name: 'Startup Investors',
    description: 'Find VCs and angel investors for fundraising outreach',
    industry: 'Investment',
    promptTemplate: 'Find venture capitalists and angel investors who invest in {sector} startups at {stage} stage',
    criteriaSchema: {
      sector: { type: 'text', placeholder: 'e.g., AI, Blockchain, Healthcare' },
      stage: { type: 'select', options: ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Growth'] }
    }
  },
  {
    id: 'custom',
    name: 'Custom Research',
    description: 'Define your own research criteria and parameters',
    industry: 'Custom',
    promptTemplate: 'Custom research based on user-defined criteria',
    criteriaSchema: {}
  }
]

export default function DeepResearchView({ workspaceId }: DeepResearchViewProps) {
  const [activeTab, setActiveTab] = useState('new')
  const [selectedTemplate, setSelectedTemplate] = useState<ResearchTemplate | null>(null)
  const [researchForm, setResearchForm] = useState({
    name: '',
    industry: '',
    location: '',
    companySize: '',
    revenueRange: '',
    jobTitles: '',
    keywords: '',
    excludeKeywords: '',
    maxLeads: 50,
    targetSegmentId: '',
    customPrompt: ''
  })
  const [researchSettings, setResearchSettings] = useState({
    model: 'o4-mini-deep-research' as 'o3-deep-research' | 'o4-mini-deep-research',
    maxToolCalls: 50,
    includeFinancialData: true,
    includeSocialMedia: true,
    verifyEmails: true,
    deepCompanyAnalysis: false
  })
  const [loading, setLoading] = useState(false)

  const { 
    researchJobs, 
    segments,
    fetchResearchJobs,
    fetchSegments,
    createResearchJob 
  } = useOutreachStore()
  const { toast } = useToast()

  useEffect(() => {
    fetchResearchJobs(workspaceId)
    fetchSegments(workspaceId)
  }, [workspaceId])

  const handleTemplateSelect = (template: ResearchTemplate) => {
    setSelectedTemplate(template)
    setResearchForm(prev => ({
      ...prev,
      name: `${template.name} Research - ${new Date().toLocaleDateString()}`,
      industry: template.industry !== 'Custom' ? template.industry : ''
    }))
  }

  const handleStartResearch = async () => {
    if (!researchForm.name.trim()) {
      toast({
        title: "Error",
        description: "Please provide a name for your research job",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const searchCriteria = {
        industry: researchForm.industry,
        location: researchForm.location,
        companySize: researchForm.companySize,
        revenueRange: researchForm.revenueRange,
        jobTitles: researchForm.jobTitles.split(',').map(t => t.trim()).filter(Boolean),
        keywords: researchForm.keywords.split(',').map(k => k.trim()).filter(Boolean),
        excludeKeywords: researchForm.excludeKeywords.split(',').map(k => k.trim()).filter(Boolean),
        maxLeads: researchForm.maxLeads,
        customPrompt: selectedTemplate?.id === 'custom' ? researchForm.customPrompt : undefined
      }

      await createResearchJob({
        name: researchForm.name,
        searchCriteria,
        targetSegmentId: researchForm.targetSegmentId || undefined,
        workspaceId,
        settings: researchSettings
      })

      toast({
        title: "Research Started",
        description: "Deep research job has been initiated. This may take 10-30 minutes to complete.",
      })

      // Reset form
      setResearchForm({
        name: '',
        industry: '',
        location: '',
        companySize: '',
        revenueRange: '',
        jobTitles: '',
        keywords: '',
        excludeKeywords: '',
        maxLeads: 50,
        targetSegmentId: '',
        customPrompt: ''
      })
      setSelectedTemplate(null)
      setActiveTab('jobs')

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start research job. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'running': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    const duration = Math.round((end.getTime() - start.getTime()) / 1000 / 60) // minutes
    return `${duration} min`
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="new">New Research</TabsTrigger>
          <TabsTrigger value="jobs">Research Jobs</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI-Powered Lead Research
              </CardTitle>
              <CardDescription>
                Use OpenAI's Deep Research models to find and analyze potential leads with comprehensive business intelligence
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Template Selection */}
              <div className="space-y-3">
                <Label>Research Template</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {RESEARCH_TEMPLATES.map((template) => (
                    <Card 
                      key={template.id}
                      className={`cursor-pointer transition-colors ${
                        selectedTemplate?.id === template.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'hover:border-gray-300'
                      }`}
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{template.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                            <Badge variant="outline" className="mt-2">
                              {template.industry}
                            </Badge>
                          </div>
                          {selectedTemplate?.id === template.id && (
                            <CheckCircle className="h-5 w-5 text-blue-500" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {selectedTemplate && (
                <>
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Research Job Name</Label>
                      <Input
                        id="name"
                        value={researchForm.name}
                        onChange={(e) => setResearchForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., SaaS Founders Q1 2024"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maxLeads">Max Leads to Find</Label>
                      <Select 
                        value={researchForm.maxLeads.toString()}
                        onValueChange={(value) => setResearchForm(prev => ({ ...prev, maxLeads: parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="25">25 leads</SelectItem>
                          <SelectItem value="50">50 leads</SelectItem>
                          <SelectItem value="100">100 leads</SelectItem>
                          <SelectItem value="200">200 leads</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Search Criteria */}
                  {selectedTemplate.id !== 'custom' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="industry">Industry</Label>
                        <Input
                          id="industry"
                          value={researchForm.industry}
                          onChange={(e) => setResearchForm(prev => ({ ...prev, industry: e.target.value }))}
                          placeholder="e.g., SaaS, E-commerce, Fintech"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={researchForm.location}
                          onChange={(e) => setResearchForm(prev => ({ ...prev, location: e.target.value }))}
                          placeholder="e.g., San Francisco, New York, Remote"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="companySize">Company Size</Label>
                        <Select 
                          value={researchForm.companySize}
                          onValueChange={(value) => setResearchForm(prev => ({ ...prev, companySize: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select company size" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="startup">Startup (1-10)</SelectItem>
                            <SelectItem value="small">Small (11-50)</SelectItem>
                            <SelectItem value="medium">Medium (51-200)</SelectItem>
                            <SelectItem value="large">Large (201-1000)</SelectItem>
                            <SelectItem value="enterprise">Enterprise (1000+)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="revenueRange">Revenue Range</Label>
                        <Select 
                          value={researchForm.revenueRange}
                          onValueChange={(value) => setResearchForm(prev => ({ ...prev, revenueRange: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select revenue range" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="$0-1M">$0-1M</SelectItem>
                            <SelectItem value="$1M-10M">$1M-10M</SelectItem>
                            <SelectItem value="$10M-50M">$10M-50M</SelectItem>
                            <SelectItem value="$50M-100M">$50M-100M</SelectItem>
                            <SelectItem value="$100M+">$100M+</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="jobTitles">Target Job Titles</Label>
                        <Input
                          id="jobTitles"
                          value={researchForm.jobTitles}
                          onChange={(e) => setResearchForm(prev => ({ ...prev, jobTitles: e.target.value }))}
                          placeholder="CEO, CTO, Marketing Director (comma-separated)"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="keywords">Keywords</Label>
                        <Input
                          id="keywords"
                          value={researchForm.keywords}
                          onChange={(e) => setResearchForm(prev => ({ ...prev, keywords: e.target.value }))}
                          placeholder="AI, automation, growth (comma-separated)"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="customPrompt">Custom Research Prompt</Label>
                      <Textarea
                        id="customPrompt"
                        value={researchForm.customPrompt}
                        onChange={(e) => setResearchForm(prev => ({ ...prev, customPrompt: e.target.value }))}
                        placeholder="Describe exactly what type of leads you want to find..."
                        rows={4}
                      />
                    </div>
                  )}

                  {/* Advanced Settings */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Research Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>AI Model</Label>
                          <Select 
                            value={researchSettings.model}
                            onValueChange={(value: 'o3-deep-research' | 'o4-mini-deep-research') => 
                              setResearchSettings(prev => ({ ...prev, model: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="o4-mini-deep-research">
                                <div className="flex items-center gap-2">
                                  <Zap className="h-4 w-4" />
                                  o4-mini (Faster, Cost-effective)
                                </div>
                              </SelectItem>
                              <SelectItem value="o3-deep-research">
                                <div className="flex items-center gap-2">
                                  <Brain className="h-4 w-4" />
                                  o3 (More Thorough, Higher Quality)
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Target Segment</Label>
                          <Select 
                            value={researchForm.targetSegmentId}
                            onValueChange={(value) => setResearchForm(prev => ({ ...prev, targetSegmentId: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select segment (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              {segments.map((segment) => (
                                <SelectItem key={segment.id} value={segment.id}>
                                  {segment.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label>Include Financial Data</Label>
                            <Switch
                              checked={researchSettings.includeFinancialData}
                              onCheckedChange={(checked) => 
                                setResearchSettings(prev => ({ ...prev, includeFinancialData: checked }))
                              }
                            />
                          </div>
                          <p className="text-sm text-gray-600">
                            Include revenue, funding, and financial information
                          </p>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label>Include Social Media</Label>
                            <Switch
                              checked={researchSettings.includeSocialMedia}
                              onCheckedChange={(checked) => 
                                setResearchSettings(prev => ({ ...prev, includeSocialMedia: checked }))
                              }
                            />
                          </div>
                          <p className="text-sm text-gray-600">
                            Find LinkedIn, Twitter, and other social profiles
                          </p>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label>Verify Email Addresses</Label>
                            <Switch
                              checked={researchSettings.verifyEmails}
                              onCheckedChange={(checked) => 
                                setResearchSettings(prev => ({ ...prev, verifyEmails: checked }))
                              }
                            />
                          </div>
                          <p className="text-sm text-gray-600">
                            Validate email addresses for deliverability
                          </p>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label>Deep Company Analysis</Label>
                            <Switch
                              checked={researchSettings.deepCompanyAnalysis}
                              onCheckedChange={(checked) => 
                                setResearchSettings(prev => ({ ...prev, deepCompanyAnalysis: checked }))
                              }
                            />
                          </div>
                          <p className="text-sm text-gray-600">
                            Include recent news, press releases, and company insights
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <AlertCircle className="h-4 w-4" />
                      Estimated cost: ${researchSettings.model === 'o3-deep-research' ? '10-25' : '5-15'} per job
                    </div>
                    
                    <Button 
                      onClick={handleStartResearch}
                      disabled={loading || !researchForm.name.trim()}
                      className="flex items-center gap-2"
                    >
                      {loading ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      Start Research
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Research Jobs</h3>
            <Button 
              variant="outline" 
              onClick={() => fetchResearchJobs(workspaceId)}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          {researchJobs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Brain className="h-12 w-12 text-gray-400 mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No Research Jobs Yet</h4>
                <p className="text-gray-600 text-center mb-4">
                  Start your first AI-powered lead research job to find high-quality prospects
                </p>
                <Button onClick={() => setActiveTab('new')}>
                  Start Research
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {researchJobs.map((job: ResearchJob) => (
                <Card key={job.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold">{job.name}</h4>
                          <Badge className={getStatusColor(job.status)}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(job.status)}
                              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                            </div>
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                          <div>
                            <span className="font-medium">Created:</span> {new Date(job.createdAt).toLocaleDateString()}
                          </div>
                          <div>
                            <span className="font-medium">Duration:</span> {formatDuration(job.createdAt, job.completedAt)}
                          </div>
                          <div>
                            <span className="font-medium">Leads Found:</span> {job.totalLeadsFound}
                          </div>
                          <div>
                            <span className="font-medium">Imported:</span> {job.leadsImported}
                          </div>
                        </div>

                        {job.status === 'running' && (
                          <div className="mb-4">
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span>Research in progress...</span>
                              <span>Estimated: 10-30 minutes</span>
                            </div>
                            <Progress value={33} className="h-2" />
                          </div>
                        )}

                        {job.status === 'failed' && job.errorMessage && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                            <div className="flex items-center gap-2 text-red-800">
                              <XCircle className="h-4 w-4" />
                              <span className="font-medium">Error:</span>
                            </div>
                            <p className="text-red-700 text-sm mt-1">{job.errorMessage}</p>
                          </div>
                        )}

                        {job.searchCriteria && (
                          <div className="flex flex-wrap gap-2">
                            {job.searchCriteria.industry && (
                              <Badge variant="outline">Industry: {job.searchCriteria.industry}</Badge>
                            )}
                            {job.searchCriteria.location && (
                              <Badge variant="outline">Location: {job.searchCriteria.location}</Badge>
                            )}
                            {job.searchCriteria.companySize && (
                              <Badge variant="outline">Size: {job.searchCriteria.companySize}</Badge>
                            )}
                            {job.settings?.model && (
                              <Badge variant="outline">Model: {job.settings.model}</Badge>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {job.status === 'completed' && job.researchOutput && (
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View Report
                          </Button>
                        )}
                        
                        {job.status === 'completed' && job.totalLeadsFound > 0 && (
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Export
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

        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Research Templates</h3>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {RESEARCH_TEMPLATES.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">{template.name}</h4>
                      <Badge variant="outline" className="mt-1">
                        {template.industry}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleTemplateSelect(template)
                        setActiveTab('new')
                      }}
                    >
                      Use
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600">{template.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
