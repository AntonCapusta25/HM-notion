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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { 
  Mail, 
  Users, 
  Calendar, 
  Paperclip, 
  Eye, 
  Save, 
  Send,
  X,
  Plus,
  Upload,
  FileText,
  Image,
  Settings
} from 'lucide-react'
import { useOutreachStore } from '@/hooks/useOutreachStore'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

interface NewCampaignModalProps {
  open: boolean
  onClose: () => void
  workspaceId: string
  editingCampaign?: any
}

const EMAIL_TEMPLATES = {
  cold_outreach: `Hi {{name}},\n\nI hope this email finds you well. I came across your company and was impressed by your work in {{industry}}.\n\n{{custom_message}}\n\nI'd love to learn more about your current challenges and see if we can help.\n\nBest regards,\n{{sender_name}}`,
  follow_up: `Hi {{name}},\n\nI wanted to follow up on my previous email about {{subject}}.\n\n{{custom_message}}\n\nWould you be available for a brief call this week to discuss further?\n\nBest regards,\n{{sender_name}}`,
  partnership: `Hi {{name}},\n\nI'm reaching out because I believe there could be great synergy between our organisations.\n\n{{custom_message}}\n\nI'd love to explore potential partnership opportunities with you.\n\nBest regards,\n{{sender_name}}`,
  press_release: `Hi {{name}},\n\nI hope you're doing well. I wanted to share some exciting news from our company that I think would be of interest to you.\n\n{{custom_message}}\n\nI'd be happy to provide more details or arrange an interview if this interests you.\n\nBest regards,\n{{sender_name}}`
}

// HELPER FUNCTIONS FOR SAFE RENDERING
const safeGetString = (value: any, fallback = 'Unknown'): string => {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && value.name) return safeGetString(value.name, fallback)
  if (value && typeof value === 'object') return JSON.stringify(value)
  return fallback || 'Unknown'
}

function fillTemplateSafely(templateString: string, data: any) {
  if (!templateString || !data) {
    return templateString || '';
  }
  return templateString.replace(/{{(\w+)}}/g, (placeholder, key) => {
    const value = data[key]
    return value ? safeGetString(value, placeholder) : placeholder;
  });
}

export default function NewCampaignModal({ open, onClose, workspaceId, editingCampaign }: NewCampaignModalProps) {
  const [activeTab, setActiveTab] = useState('basic')
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    description: '',
    subject_line: '',
    email_template: EMAIL_TEMPLATES.cold_outreach,
    outreach_type_id: '',
    segment_id: '',
    send_immediately: false,
    scheduled_at: '',
    settings: {
      delay_between_emails: 5,
      max_emails_per_day: 50,
      track_opens: true,
      track_clicks: true,
      follow_up_enabled: false,
      follow_up_days: 3,
      personalization_enabled: true,
      use_research_data: true
    }
  })
  const [attachments, setAttachments] = useState<File[]>([])

  const { 
    leads,
    segments, 
    outreachTypes,
    loading,
    createCampaign,
    updateCampaign,
    fetchLeads,
    fetchSegments,
    fetchOutreachTypes
  } = useOutreachStore()
  
  const { user } = useAuth()
  const { toast } = useToast()

  // DEBUG LOGGING
  useEffect(() => {
    if (open) {
      console.log('Campaign Modal Data:', { segments, outreachTypes, leads })
    }
  }, [segments, outreachTypes, leads, open])

  // DATA FETCHING
  useEffect(() => {
    if (workspaceId && open) {
      fetchLeads(workspaceId);
      fetchSegments(workspaceId);
      fetchOutreachTypes(workspaceId);
    }
  }, [workspaceId, open])

  useEffect(() => {
    if (editingCampaign) {
      setCampaignForm({
        name: safeGetString(editingCampaign.name, ''),
        description: safeGetString(editingCampaign.description, ''),
        subject_line: safeGetString(editingCampaign.subject_line, ''),
        email_template: safeGetString(editingCampaign.email_template, EMAIL_TEMPLATES.cold_outreach),
        outreach_type_id: safeGetString(editingCampaign.outreach_type_id, ''),
        segment_id: safeGetString(editingCampaign.segment_id, ''),
        send_immediately: editingCampaign.send_immediately || false,
        scheduled_at: safeGetString(editingCampaign.scheduled_at, ''),
        settings: {
          ...campaignForm.settings,
          ...editingCampaign.settings
        }
      })
    } else {
      setCampaignForm({
        name: '',
        description: '',
        subject_line: '',
        email_template: EMAIL_TEMPLATES.cold_outreach,
        outreach_type_id: '',
        segment_id: '',
        send_immediately: false,
        scheduled_at: '',
        settings: {
          delay_between_emails: 5,
          max_emails_per_day: 50,
          track_opens: true,
          track_clicks: true,
          follow_up_enabled: false,
          follow_up_days: 3,
          personalization_enabled: true,
          use_research_data: true
        }
      })
      setAttachments([])
    }
  }, [editingCampaign, open])

  const handleTemplateSelect = (template: string) => {
    setCampaignForm(prev => ({
      ...prev,
      email_template: EMAIL_TEMPLATES[template as keyof typeof EMAIL_TEMPLATES]
    }))
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setAttachments(prev => [...prev, ...files])
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const generatePreview = () => {
    const previewLead = leads.length > 0 ? leads[0] : null;
    const defaultPreviewData = {
      name: 'Jane Doe',
      company: 'Example Corp',
      position: 'Marketing Director',
      industry: 'Technology'
    };

    const dataSource = previewLead || defaultPreviewData;
    
    const allData = {
      name: safeGetString(dataSource.name, 'Jane Doe'),
      company: safeGetString(dataSource.company, 'Example Corp'),
      position: safeGetString(dataSource.position, 'Marketing Director'),
      industry: safeGetString(dataSource.industry, 'Technology'),
      sender_name: safeGetString(user?.user_metadata?.full_name || user?.email, 'Your Name'),
      subject: safeGetString(campaignForm.subject_line, 'Your Subject'),
      custom_message: '[Your personalized message will appear here.]'
    };

    return fillTemplateSafely(campaignForm.email_template, allData);
  };

  const validateForm = () => {
    if (!campaignForm.name.trim()) {
      toast({
        title: "Error",
        description: "Please provide a campaign name",
        variant: "destructive"
      })
      return false
    }
    
    if (!campaignForm.subject_line.trim()) {
      toast({
        title: "Error",
        description: "Please provide a subject line",
        variant: "destructive"
      })
      return false
    }
    
    if (!campaignForm.email_template.trim()) {
      toast({
        title: "Error",
        description: "Please provide an email template",
        variant: "destructive"
      })
      return false
    }
    
    if (!campaignForm.segment_id) {
      toast({
        title: "Error",
        description: "Please select a target segment",
        variant: "destructive"
      })
      return false
    }
    
    return true
  }

  const handleSave = async (launch = false) => {
    if (!validateForm()) return

    try {
      const campaignData = {
        ...campaignForm,
        workspace_id: workspaceId,
        created_by: user!.id,
        status: launch ? 'running' : 'draft'
      }

      if (editingCampaign) {
        await updateCampaign(editingCampaign.id, campaignData)
        toast({
          title: "Campaign updated",
          description: "Your campaign has been updated successfully",
        })
      } else {
        await createCampaign(campaignData)
        toast({
          title: launch ? "Campaign launched" : "Campaign saved",
          description: launch 
            ? "Your campaign has been launched and emails are being sent"
            : "Your campaign has been saved as a draft",
        })
      }

      onClose()
    } catch (error) {
      console.error('Campaign save error:', error)
      toast({
        title: "Error",
        description: "Failed to save campaign",
        variant: "destructive"
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}
          </DialogTitle>
          <DialogDescription>
            {editingCampaign 
              ? 'Update your email campaign settings and content'
              : 'Create a new email campaign to reach your leads'
            }
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="content">Email Content</TabsTrigger>
            <TabsTrigger value="targeting">Targeting</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="campaign_name">Campaign Name</Label>
                <Input
                  id="campaign_name"
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Q1 Product Launch Outreach"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="outreach_type">Outreach Type</Label>
                <Select 
                  value={campaignForm.outreach_type_id}
                  onValueChange={(value) => setCampaignForm(prev => ({ ...prev, outreach_type_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select outreach type" />
                  </SelectTrigger>
                  <SelectContent>
                    {outreachTypes.map(type => (
                      <SelectItem key={type.id} value={type.id}>
                        {safeGetString(type.name, 'Unnamed Type')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={campaignForm.description}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the purpose and goals of this campaign..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject_line">Email Subject Line</Label>
              <Input
                id="subject_line"
                value={campaignForm.subject_line}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, subject_line: e.target.value }))}
                placeholder="e.g., Partnership opportunity with {{company}}"
              />
              <p className="text-sm text-gray-600">
                Use variables like name, company or industry for personalization
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="send_immediately"
                  checked={campaignForm.send_immediately}
                  onCheckedChange={(checked) => setCampaignForm(prev => ({ ...prev, send_immediately: checked }))}
                />
                <Label htmlFor="send_immediately">Send immediately after creation</Label>
              </div>

              {!campaignForm.send_immediately && (
                <div className="space-y-2">
                  <Label htmlFor="scheduled_at">Schedule for later</Label>
                  <Input
                    id="scheduled_at"
                    type="datetime-local"
                    value={campaignForm.scheduled_at}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, scheduled_at: e.target.value }))}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div>
                <Label className="mb-3 block">Email Template</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                  {Object.entries(EMAIL_TEMPLATES).map(([key, template]) => (
                    <Button
                      key={key}
                      variant="outline"
                      size="sm"
                      onClick={() => handleTemplateSelect(key)}
                      className="justify-start"
                    >
                      {safeGetString(key, 'Template').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email_template">Email Content</Label>
                <Textarea
                  id="email_template"
                  value={campaignForm.email_template}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, email_template: e.target.value }))}
                  placeholder="Write your email content here..."
                  rows={12}
                  className="font-mono text-sm"
                />
                <p className="text-sm text-gray-600">
                  Available variables: name, company, position, industry, sender_name
                </p>
              </div>

              <div className="space-y-2">
                <Label>Attachments</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    multiple
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="text-center">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        Click to upload files or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">PDF, DOC, JPG, PNG up to 10MB</p>
                    </div>
                  </label>
                </div>

                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-600" />
                          <span className="text-sm">{safeGetString(file.name, 'Unnamed File')}</span>
                          <Badge variant="outline">{(file.size / 1024).toFixed(1)} KB</Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="targeting" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="segment">Target Segment</Label>
                <Select 
                  value={campaignForm.segment_id}
                  onValueChange={(value) => setCampaignForm(prev => ({ ...prev, segment_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a lead segment" />
                  </SelectTrigger>
                  <SelectContent>
                    {segments.map(segment => (
                      <SelectItem key={segment.id} value={segment.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: safeGetString(segment.color, '#gray') }}
                          />
                          {safeGetString(segment.name, 'Unnamed Segment')}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-600">
                  Select which group of leads should receive this campaign
                </p>
              </div>

              {campaignForm.segment_id && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Segment Preview</CardTitle>
                    <CardDescription>
                      Overview of the selected segment
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const selectedSegment = segments.find(s => s.id === campaignForm.segment_id)
                      return selectedSegment ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: safeGetString(selectedSegment.color, '#gray') }}
                            />
                            <div>
                              <h4 className="font-medium">{safeGetString(selectedSegment.name, 'Unnamed Segment')}</h4>
                              {selectedSegment.description && (
                                <p className="text-sm text-gray-600">{safeGetString(selectedSegment.description, '')}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Total Leads:</span> 
                              <span className="ml-2">{selectedSegment.lead_count || 0}</span>
                            </div>
                            <div>
                              <span className="font-medium">Active Leads:</span> 
                              <span className="ml-2">{selectedSegment.active_count || 0}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500">Segment not found</p>
                      )
                    })()}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 pt-4">
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Sending Settings</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Delay Between Emails</Label>
                    <Select 
                      value={campaignForm.settings.delay_between_emails.toString()}
                      onValueChange={(value) => setCampaignForm(prev => ({
                        ...prev,
                        settings: { ...prev.settings, delay_between_emails: parseInt(value) }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 second</SelectItem>
                        <SelectItem value="2">2 seconds</SelectItem>
                        <SelectItem value="5">5 seconds</SelectItem>
                        <SelectItem value="10">10 seconds</SelectItem>
                        <SelectItem value="30">30 seconds</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Max Emails Per Day</Label>
                    <Select 
                      value={campaignForm.settings.max_emails_per_day.toString()}
                      onValueChange={(value) => setCampaignForm(prev => ({
                        ...prev,
                        settings: { ...prev.settings, max_emails_per_day: parseInt(value) }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 emails</SelectItem>
                        <SelectItem value="25">25 emails</SelectItem>
                        <SelectItem value="50">50 emails</SelectItem>
                        <SelectItem value="100">100 emails</SelectItem>
                        <SelectItem value="200">200 emails</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Tracking & Analytics</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Track Email Opens</Label>
                      <p className="text-sm text-gray-600">Track when recipients open your emails</p>
                    </div>
                    <Switch
                      checked={campaignForm.settings.track_opens}
                      onCheckedChange={(checked) => setCampaignForm(prev => ({
                        ...prev,
                        settings: { ...prev.settings, track_opens: checked }
                      }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Track Link Clicks</Label>
                      <p className="text-sm text-gray-600">Track when recipients click links in your emails</p>
                    </div>
                    <Switch
                      checked={campaignForm.settings.track_clicks}
                      onCheckedChange={(checked) => setCampaignForm(prev => ({
                        ...prev,
                        settings: { ...prev.settings, track_clicks: checked }
                      }))}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Personalization</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-personalization</Label>
                      <p className="text-sm text-gray-600">Automatically personalize emails with lead data</p>
                    </div>
                    <Switch
                      checked={campaignForm.settings.personalization_enabled}
                      onCheckedChange={(checked) => setCampaignForm(prev => ({
                        ...prev,
                        settings: { ...prev.settings, personalization_enabled: checked }
                      }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Use AI Research Data</Label>
                      <p className="text-sm text-gray-600">Include insights from AI research in personalization</p>
                    </div>
                    <Switch
                      checked={campaignForm.settings.use_research_data}
                      onCheckedChange={(checked) => setCampaignForm(prev => ({
                        ...prev,
                        settings: { ...prev.settings, use_research_data: checked }
                      }))}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Follow-up Settings</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Follow-ups</Label>
                      <p className="text-sm text-gray-600">Automatically send follow-up emails</p>
                    </div>
                    <Switch
                      checked={campaignForm.settings.follow_up_enabled}
                      onCheckedChange={(checked) => setCampaignForm(prev => ({
                        ...prev,
                        settings: { ...prev.settings, follow_up_enabled: checked }
                      }))}
                    />
                  </div>

                  {campaignForm.settings.follow_up_enabled && (
                    <div className="space-y-2">
                      <Label>Follow-up Delay (Days)</Label>
                      <Select 
                        value={campaignForm.settings.follow_up_days.toString()}
                        onValueChange={(value) => setCampaignForm(prev => ({
                          ...prev,
                          settings: { ...prev.settings, follow_up_days: parseInt(value) }
                        }))}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 day</SelectItem>
                          <SelectItem value="3">3 days</SelectItem>
                          <SelectItem value="7">7 days</SelectItem>
                          <SelectItem value="14">14 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Preview Section */}
        {activeTab === 'content' && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Email Preview
              </CardTitle>
              <CardDescription>
                How your email will look to recipients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 bg-white">
                <div className="mb-4 pb-2 border-b">
                  <div className="text-sm text-gray-600">Subject:</div>
                  <div className="font-medium">
                    {safeGetString(campaignForm.subject_line, 'Your subject line will appear here')}
                  </div>
                </div>
                <div className="whitespace-pre-wrap text-sm">
                  {generatePreview()}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => handleSave(false)}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save as Draft
            </Button>
            
            <Button 
              onClick={() => handleSave(true)}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {editingCampaign ? 'Update & Launch' : 'Create & Launch'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
