// NewResearchJobModal.tsx - Complete Modal for creating AI research jobs
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
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Brain, 
  Zap, 
  Target, 
  Play, 
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react'
import { useOutreachStore } from '@/hooks/useOutreachStore'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

interface NewResearchJobModalProps {
  open: boolean
  onClose: () => void
  workspaceId: string
}

const RESEARCH_TEMPLATES = [
  {
    id: 'saas-founders',
    name: 'SaaS Founders & CEOs',
    description: 'Find founders and CEOs of SaaS companies for partnership outreach',
    industry: 'Technology',
    prompt: 'Find founders and CEOs of SaaS companies in {location} with {companySize} employees, focusing on {industry} sector',
    fields: ['location', 'companySize', 'industry']
  },
  {
    id: 'marketing-directors',
    name: 'Marketing Directors',
    description: 'Target marketing decision-makers for marketing tool outreach',
    industry: 'Marketing',
    prompt: 'Find Marketing Directors and CMOs at companies in {industry} industry with {revenueRange} revenue',
    fields: ['industry', 'revenueRange']
  },
  {
    id: 'startup-investors',
    name: 'Startup Investors',
    description: 'Find VCs and angel investors for fundraising outreach',
    industry: 'Investment',
    prompt: 'Find venture capitalists and angel investors who invest in {sector} startups at {stage} stage',
    fields: ['sector', 'stage']
  },
  {
    id: 'custom',
    name: 'Custom Research',
    description: 'Define your own research criteria and parameters',
    industry: 'Custom',
    prompt: 'Custom research based on user-defined criteria',
    fields: []
  }
]

export default function NewResearchJobModal({ open, onClose, workspaceId }: NewResearchJobModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
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

  const { 
    segments,
    loading,
    fetchSegments,
    createResearchJob
  } = useOutreachStore()
  
  const { user } = useAuthStore()
  const { toast } = useToast()

  useEffect(() => {
    if (workspaceId && open) {
      fetchSegments(workspaceId)
    }
  }, [workspaceId, open])

  useEffect(() => {
    if (!open) {
      // Reset form when modal closes
      setSelectedTemplate(null)
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
      setResearchSettings({
        model: 'o4-mini-deep-research',
        maxToolCalls: 50,
        includeFinancialData: true,
        includeSocialMedia: true,
        verifyEmails: true,
        deepCompanyAnalysis: false
      })
    }
  }, [open])

  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template)
    setResearchForm(prev => ({
      ...prev,
      name: `${template.name} Research - ${new Date().toLocaleDateString()}`,
      industry: template.industry !== 'Custom' ? template.industry : ''
    }))
  }

  const getEstimatedCost = () => {
    const baseModel = researchSettings.model === 'o3-deep-research' ? 15 : 8
    const complexityMultiplier = researchSettings.deepCompanyAnalysis ? 1.5 : 1
    const leadMultiplier = researchForm.maxLeads / 50
    
    return Math.round(baseModel * complexityMultiplier * leadMultiplier)
  }

  const validateForm = () => {
    if (!researchForm.name.trim()) {
      toast({
        title: "Error",
        description: "Please provide a research job name",
        variant: "destructive"
      })
      return false
    }

    if (selectedTemplate?.id === 'custom' && !researchForm.customPrompt.trim()) {
      toast({
        title: "Error",
        description: "Please provide a custom research prompt",
        variant: "destructive"
      })
      return false
    }

    if (selectedTemplate?.id !== 'custom' && !researchForm.industry.trim()) {
      toast({
        title: "Error",
        description: "Please specify the industry to research",
        variant: "destructive"
      })
      return false
    }

    return true
  }

  const handleStartResearch = async () => {
    if (!validateForm()) return

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

      onClose()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start research job. Please try again.",
        variant: "destructive"
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Start AI Research Job
          </DialogTitle>
          <DialogDescription>
            Use OpenAI's Deep Research models to find and analyze potential leads with comprehensive business intelligence
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Selection */}
          <div className="space-y-3">
            <Label>Research Template</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {RESEARCH_TEMPLATES.map((template) => (
                <Card 
                  key={template.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedTemplate?.id === template.id 
                      ? 'border-blue-500 bg-blue-50 shadow-md' 
                      : 'hover:border-gray-300'
                  }`}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{template.name}</h4>
                        <p className="text-sm text-gray-600 mt-1 mb-2">{template.description}</p>
                        <Badge variant="outline">
                          {template.industry}
                        </Badge>
                      </div>
                      {selectedTemplate?.id === template.id && (
                        <CheckCircle className="h-5 w-5 text-blue-500 mt-1" />
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
              <div className="space-y-4">
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

                <div className="space-y-2">
                  <Label htmlFor="targetSegment">Target Segment (Optional)</Label>
                  <Select 
                    value={researchForm.targetSegmentId}
                    onValueChange={(value) => setResearchForm(prev => ({ ...prev, targetSegmentId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select segment to assign leads to" />
                    </SelectTrigger>
                    <SelectContent>
                      {segments.map((segment) => (
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
              </div>

              {/* Search Criteria */}
              {selectedTemplate.id !== 'custom' ? (
                <div className="space-y-4">
                  <h4 className="font-medium">Search Criteria</h4>
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

                  <div className="space-y-2">
                    <Label htmlFor="excludeKeywords">Exclude Keywords (Optional)</Label>
                    <Input
                      id="excludeKeywords"
                      value={researchForm.excludeKeywords}
                      onChange={(e) => setResearchForm(prev => ({ ...prev, excludeKeywords: e.target.value }))}
                      placeholder="competitor, freelance (comma-separated)"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="font-medium">Custom Research Prompt</h4>
                  <div className="space-y-2">
                    <Label htmlFor="customPrompt">Describe Your Research Requirements</Label>
                    <Textarea
                      id="customPrompt"
                      value={researchForm.customPrompt}
                      onChange={(e) => setResearchForm(prev => ({ ...prev, customPrompt: e.target.value }))}
                      placeholder="Describe exactly what type of leads you want to find, including industry, job titles, company characteristics, location, etc..."
                      rows={4}
                    />
                    <p className="text-sm text-gray-600">
                      Be as specific as possible about your target criteria for best results
                    </p>
                  </div>
                </div>
              )}

              <Separator />

              {/* Research Settings */}
              <div className="space-y-4">
                <h4 className="font-medium">Research Settings</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            <div>
                              <div>o4-mini-deep-research</div>
                              <div className="text-xs text-gray-500">Faster, Cost-effective</div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="o3-deep-research">
                          <div className="flex items-center gap-2">
                            <Brain className="h-4 w-4" />
                            <div>
                              <div>o3-deep-research</div>
                              <div className="text-xs text-gray-500">More Thorough, Higher Quality</div>
                            </div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Max Tool Calls</Label>
                    <Select 
                      value={researchSettings.maxToolCalls.toString()}
                      onValueChange={(value) => 
                        setResearchSettings(prev => ({ ...prev, maxToolCalls: parseInt(value) }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25 (Basic)</SelectItem>
                        <SelectItem value="50">50 (Standard)</SelectItem>
                        <SelectItem value="75">75 (Thorough)</SelectItem>
                        <SelectItem value="100">100 (Comprehensive)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Include Financial Data</Label>
                        <p className="text-sm text-gray-600">Revenue, funding, financial information</p>
                      </div>
                      <Switch
                        checked={researchSettings.includeFinancialData}
                        onCheckedChange={(checked) => 
                          setResearchSettings(prev => ({ ...prev, includeFinancialData: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Include Social Media</Label>
                        <p className="text-sm text-gray-600">LinkedIn, Twitter, and other profiles</p>
                      </div>
                      <Switch
                        checked={researchSettings.includeSocialMedia}
                        onCheckedChange={(checked) => 
                          setResearchSettings(prev => ({ ...prev, includeSocialMedia: checked }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Verify Email Addresses</Label>
                        <p className="text-sm text-gray-600">Validate emails for deliverability</p>
                      </div>
                      <Switch
                        checked={researchSettings.verifyEmails}
                        onCheckedChange={(checked) => 
                          setResearchSettings(prev => ({ ...prev, verifyEmails: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Deep Company Analysis</Label>
                        <p className="text-sm text-gray-600">Recent news, press releases, insights</p>
                      </div>
                      <Switch
                        checked={researchSettings.deepCompanyAnalysis}
                        onCheckedChange={(checked) => 
                          setResearchSettings(prev => ({ ...prev, deepCompanyAnalysis: checked }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Cost Estimate & Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Research Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Template:</span>
                      <span className="text-sm font-medium">{selectedTemplate.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Max Leads:</span>
                      <span className="text-sm font-medium">{researchForm.maxLeads}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">AI Model:</span>
                      <span className="text-sm font-medium">
                        {researchSettings.model.includes('o3') ? 'o3-deep-research' : 'o4-mini-deep-research'}
                      </span>
                    </div>
                    {researchForm.targetSegmentId && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Target Segment:</span>
                        <span className="text-sm font-medium">
                          {segments.find(s => s.id === researchForm.targetSegmentId)?.name || 'Selected'}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Cost Estimate
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Estimated Cost:</span>
                      <Badge variant="outline" className="text-lg px-3 py-1">
                        ${getEstimatedCost()}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>• Actual cost may vary based on complexity</p>
                      <p>• Research typically takes 10-30 minutes</p>
                      <p>• Results will be automatically imported</p>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-blue-800">Research Process</p>
                          <p className="text-blue-700">
                            Our AI will search the web, analyze companies, verify contact information, 
                            and compile detailed lead profiles with business intelligence.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          
          {selectedTemplate && (
            <Button 
              onClick={handleStartResearch}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Start Research (${getEstimatedCost()})
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
