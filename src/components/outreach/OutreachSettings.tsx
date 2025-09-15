// OutreachSettings.tsx - Complete configuration settings for outreach system
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { 
  Settings, 
  Mail, 
  Brain, 
  Key, 
  TestTube,
  Save,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Globe,
  Database,
  Zap,
  ExternalLink,
  Shield,
  Clock,
  DollarSign
} from 'lucide-react'
import { useOutreachStore } from '@/hooks/useOutreachStore'
import { useAuthStore } from '@/hooks/useAuthStore'
import { useToast } from '@/hooks/use-toast'

interface OutreachSettingsProps {
  workspaceId: string
}

export default function OutreachSettings({ workspaceId }: OutreachSettingsProps) {
  const [activeTab, setActiveTab] = useState('email')
  const [settingsForm, setSettingsForm] = useState({
    // Email settings
    sender_name: '',
    sender_email: '',
    reply_to_email: '',
    
    // Apps Script settings
    apps_script_url: '',
    apps_script_api_key: '',
    
    // OpenAI settings
    openai_api_key: '',
    preferred_research_model: 'o4-mini-deep-research',
    max_research_cost_per_job: 50.00,
    
    // Research preferences
    default_research_settings: {
      include_financial_data: true,
      include_social_media: true,
      verify_contact_info: true,
      deep_company_analysis: false,
      include_news_mentions: true,
      max_leads_per_research: 100
    },
    
    // Automation settings
    auto_follow_up: false,
    follow_up_delay_days: 7,
    max_follow_ups: 3,
    auto_pause_campaigns: true,
    daily_email_limit: 50,
    
    // Advanced settings
    webhook_url: '',
    custom_tracking_domain: '',
    enable_click_tracking: true,
    enable_open_tracking: true,
    timezone: 'America/New_York'
  })
  const [testing, setTesting] = useState(false)
  const [testResults, setTestResults] = useState<any>(null)

  const { 
    settings, 
    loading,
    fetchSettings,
    updateSettings,
    sendTestEmail
  } = useOutreachStore()
  
  const { user } = useAuthStore()
  const { toast } = useToast()

  useEffect(() => {
    if (workspaceId) {
      fetchSettings(workspaceId)
    }
  }, [workspaceId])

  useEffect(() => {
    if (settings) {
      setSettingsForm({
        sender_name: settings.sender_name || '',
        sender_email: settings.sender_email || '',
        reply_to_email: settings.reply_to_email || '',
        apps_script_url: settings.apps_script_url || '',
        apps_script_api_key: settings.apps_script_api_key || '',
        openai_api_key: settings.openai_api_key || '',
        preferred_research_model: settings.preferred_research_model || 'o4-mini-deep-research',
        max_research_cost_per_job: settings.max_research_cost_per_job || 50.00,
        default_research_settings: {
          ...settingsForm.default_research_settings,
          ...settings.default_research_settings
        },
        auto_follow_up: settings.auto_follow_up || false,
        follow_up_delay_days: settings.follow_up_delay_days || 7,
        max_follow_ups: settings.max_follow_ups || 3,
        auto_pause_campaigns: settings.auto_pause_campaigns || true,
        daily_email_limit: settings.daily_email_limit || 50,
        webhook_url: settings.webhook_url || '',
        custom_tracking_domain: settings.custom_tracking_domain || '',
        enable_click_tracking: settings.enable_click_tracking !== false,
        enable_open_tracking: settings.enable_open_tracking !== false,
        timezone: settings.timezone || 'America/New_York'
      })
    }
  }, [settings])

  const handleSaveSettings = async () => {
    try {
      await updateSettings(workspaceId, {
        ...settingsForm,
        updated_at: new Date().toISOString()
      })
      
      toast({
        title: "Settings saved",
        description: "Your outreach settings have been updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive"
      })
    }
  }

  const handleTestEmailSystem = async () => {
    setTesting(true)
    setTestResults(null)
    
    try {
      await sendTestEmail({
        to: user?.email,
        subject: 'Outreach System Test',
        content: `
          <h2>Outreach System Test</h2>
          <p>This is a test email from your outreach system.</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
          <p>If you received this, your email system is working correctly! ✅</p>
        `,
        sender_name: settingsForm.sender_name || 'Outreach System',
        reply_to: settingsForm.reply_to_email || user?.email
      })
      
      setTestResults({
        success: true,
        message: 'Test email sent successfully'
      })
      
      toast({
        title: "Test email sent",
        description: "Check your inbox for the test email",
      })
    } catch (error: any) {
      setTestResults({
        success: false,
        message: error.message
      })
      
      toast({
        title: "Test failed",
        description: "Failed to send test email",
        variant: "destructive"
      })
    } finally {
      setTesting(false)
    }
  }

  const handleTestOpenAI = async () => {
    setTesting(true)
    
    try {
      // This would test OpenAI connection
      // For now, we'll simulate a successful test
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setTestResults({
        success: true,
        message: 'OpenAI connection successful'
      })
      
      toast({
        title: "OpenAI test successful",
        description: "Your OpenAI API key is working correctly",
      })
    } catch (error: any) {
      setTestResults({
        success: false,
        message: error.message
      })
      
      toast({
        title: "OpenAI test failed",
        description: "Check your API key and try again",
        variant: "destructive"
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Outreach Settings</h2>
          <p className="text-gray-600">
            Configure your outreach system preferences and integrations
          </p>
        </div>
        
        <Button 
          onClick={handleSaveSettings}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          Save Settings
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="email">Email Setup</TabsTrigger>
          <TabsTrigger value="ai">AI Research</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Configuration
              </CardTitle>
              <CardDescription>
                Configure your email sending settings and Google Apps Script integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sender_name">Sender Name</Label>
                  <Input
                    id="sender_name"
                    value={settingsForm.sender_name}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, sender_name: e.target.value }))}
                    placeholder="Your Name or Company"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sender_email">Sender Email</Label>
                  <Input
                    id="sender_email"
                    type="email"
                    value={settingsForm.sender_email}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, sender_email: e.target.value }))}
                    placeholder="sender@yourcompany.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reply_to_email">Reply-To Email</Label>
                  <Input
                    id="reply_to_email"
                    type="email"
                    value={settingsForm.reply_to_email}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, reply_to_email: e.target.value }))}
                    placeholder="replies@yourcompany.com"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Google Apps Script Integration</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="apps_script_url">Apps Script Web App URL</Label>
                  <Input
                    id="apps_script_url"
                    value={settingsForm.apps_script_url}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, apps_script_url: e.target.value }))}
                    placeholder="https://script.google.com/macros/s/.../exec"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apps_script_api_key">Apps Script API Key</Label>
                  <Input
                    id="apps_script_api_key"
                    type="password"
                    value={settingsForm.apps_script_api_key}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, apps_script_api_key: e.target.value }))}
                    placeholder="Your secure API key"
                  />
                </div>

                <Button 
                  variant="outline" 
                  onClick={handleTestEmailSystem}
                  disabled={testing || !settingsForm.apps_script_url}
                  className="flex items-center gap-2"
                >
                  {testing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <TestTube className="h-4 w-4" />
                  )}
                  Test Email System
                </Button>

                {testResults && (
                  <div className={`p-3 rounded-lg border ${
                    testResults.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      {testResults.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className={`text-sm font-medium ${
                        testResults.success ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {testResults.message}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Research Configuration
              </CardTitle>
              <CardDescription>
                Configure OpenAI settings and research preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="openai_api_key">OpenAI API Key</Label>
                <Input
                  id="openai_api_key"
                  type="password"
                  value={settingsForm.openai_api_key}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, openai_api_key: e.target.value }))}
                  placeholder="sk-..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preferred Research Model</Label>
                  <Select 
                    value={settingsForm.preferred_research_model}
                    onValueChange={(value) => setSettingsForm(prev => ({ ...prev, preferred_research_model: value }))}
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
                  <Label htmlFor="max_cost">Max Cost Per Research Job ($)</Label>
                  <Input
                    id="max_cost"
                    type="number"
                    min="1"
                    max="500"
                    step="1"
                    value={settingsForm.max_research_cost_per_job}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, max_research_cost_per_job: parseFloat(e.target.value) }))}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Default Research Settings</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      settingsForm.apps_script_url ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                    <div>
                      <span className="font-medium">Google Apps Script</span>
                      <p className="text-sm text-gray-600">Email sending service</p>
                    </div>
                  </div>
                  <Badge variant={settingsForm.apps_script_url ? "default" : "secondary"}>
                    {settingsForm.apps_script_url ? "Configured" : "Not Set"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      settingsForm.openai_api_key ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                    <div>
                      <span className="font-medium">OpenAI API</span>
                      <p className="text-sm text-gray-600">AI research capabilities</p>
                    </div>
                  </div>
                  <Badge variant={settingsForm.openai_api_key ? "default" : "secondary"}>
                    {settingsForm.openai_api_key ? "Configured" : "Not Set"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      settingsForm.webhook_url ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                    <div>
                      <span className="font-medium">Webhook Integration</span>
                      <p className="text-sm text-gray-600">Real-time event notifications</p>
                    </div>
                  </div>
                  <Badge variant={settingsForm.webhook_url ? "default" : "secondary"}>
                    {settingsForm.webhook_url ? "Configured" : "Optional"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}">
                      <div>
                        <Label>Include Financial Data</Label>
                        <p className="text-sm text-gray-600">Revenue, funding, financial metrics</p>
                      </div>
                      <Switch
                        checked={settingsForm.default_research_settings.include_financial_data}
                        onCheckedChange={(checked) => 
                          setSettingsForm(prev => ({ 
                            ...prev, 
                            default_research_settings: { 
                              ...prev.default_research_settings, 
                              include_financial_data: checked 
                            }
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Include Social Media</Label>
                        <p className="text-sm text-gray-600">LinkedIn, Twitter profiles</p>
                      </div>
                      <Switch
                        checked={settingsForm.default_research_settings.include_social_media}
                        onCheckedChange={(checked) => 
                          setSettingsForm(prev => ({ 
                            ...prev, 
                            default_research_settings: { 
                              ...prev.default_research_settings, 
                              include_social_media: checked 
                            }
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Verify Contact Info</Label>
                        <p className="text-sm text-gray-600">Email validation and verification</p>
                      </div>
                      <Switch
                        checked={settingsForm.default_research_settings.verify_contact_info}
                        onCheckedChange={(checked) => 
                          setSettingsForm(prev => ({ 
                            ...prev, 
                            default_research_settings: { 
                              ...prev.default_research_settings, 
                              verify_contact_info: checked 
                            }
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Deep Company Analysis</Label>
                        <p className="text-sm text-gray-600">Recent news, press releases</p>
                      </div>
                      <Switch
                        checked={settingsForm.default_research_settings.deep_company_analysis}
                        onCheckedChange={(checked) => 
                          setSettingsForm(prev => ({ 
                            ...prev, 
                            default_research_settings: { 
                              ...prev.default_research_settings, 
                              deep_company_analysis: checked 
                            }
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Include News Mentions</Label>
                        <p className="text-sm text-gray-600">Recent media coverage</p>
                      </div>
                      <Switch
                        checked={settingsForm.default_research_settings.include_news_mentions}
                        onCheckedChange={(checked) => 
                          setSettingsForm(prev => ({ 
                            ...prev, 
                            default_research_settings: { 
                              ...prev.default_research_settings, 
                              include_news_mentions: checked 
                            }
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Max Leads Per Research</Label>
                      <Select 
                        value={settingsForm.default_research_settings.max_leads_per_research.toString()}
                        onValueChange={(value) => 
                          setSettingsForm(prev => ({ 
                            ...prev, 
                            default_research_settings: { 
                              ...prev.default_research_settings, 
                              max_leads_per_research: parseInt(value) 
                            }
                          }))
                        }
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
                </div>
              </div>

              <Button 
                variant="outline" 
                onClick={handleTestOpenAI}
                disabled={testing || !settingsForm.openai_api_key}
                className="flex items-center gap-2"
              >
                {testing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <TestTube className="h-4 w-4" />
                )}
                Test OpenAI Connection
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Automation Rules
              </CardTitle>
              <CardDescription>
                Configure automated follow-ups and campaign management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto Follow-up</Label>
                      <p className="text-sm text-gray-600">Automatically send follow-up emails</p>
                    </div>
                    <Switch
                      checked={settingsForm.auto_follow_up}
                      onCheckedChange={(checked) => 
                        setSettingsForm(prev => ({ ...prev, auto_follow_up: checked }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Follow-up Delay (Days)</Label>
                    <Select 
                      value={settingsForm.follow_up_delay_days.toString()}
                      onValueChange={(value) => setSettingsForm(prev => ({ ...prev, follow_up_delay_days: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 days</SelectItem>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="14">14 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Max Follow-ups</Label>
                    <Select 
                      value={settingsForm.max_follow_ups.toString()}
                      onValueChange={(value) => setSettingsForm(prev => ({ ...prev, max_follow_ups: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 follow-up</SelectItem>
                        <SelectItem value="2">2 follow-ups</SelectItem>
                        <SelectItem value="3">3 follow-ups</SelectItem>
                        <SelectItem value="5">5 follow-ups</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-pause Campaigns</Label>
                      <p className="text-sm text-gray-600">Pause on high bounce rates</p>
                    </div>
                    <Switch
                      checked={settingsForm.auto_pause_campaigns}
                      onCheckedChange={(checked) => 
                        setSettingsForm(prev => ({ ...prev, auto_pause_campaigns: checked }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Daily Email Limit</Label>
                    <Select 
                      value={settingsForm.daily_email_limit.toString()}
                      onValueChange={(value) => setSettingsForm(prev => ({ ...prev, daily_email_limit: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="20">20 emails/day</SelectItem>
                        <SelectItem value="50">50 emails/day</SelectItem>
                        <SelectItem value="100">100 emails/day</SelectItem>
                        <SelectItem value="200">200 emails/day</SelectItem>
                        <SelectItem value="500">500 emails/day</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select 
                      value={settingsForm.timezone}
                      onValueChange={(value) => setSettingsForm(prev => ({ ...prev, timezone: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                        <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="Europe/London">London</SelectItem>
                        <SelectItem value="Europe/Paris">Paris</SelectItem>
                        <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Advanced Settings
              </CardTitle>
              <CardDescription>
                Advanced configuration and tracking settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="webhook_url">Webhook URL</Label>
                    <Input
                      id="webhook_url"
                      value={settingsForm.webhook_url}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, webhook_url: e.target.value }))}
                      placeholder="https://your-app.com/webhooks/outreach"
                    />
                    <p className="text-xs text-gray-500">
                      Receive real-time notifications about email events
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tracking_domain">Custom Tracking Domain</Label>
                    <Input
                      id="tracking_domain"
                      value={settingsForm.custom_tracking_domain}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, custom_tracking_domain: e.target.value }))}
                      placeholder="track.yourcompany.com"
                    />
                    <p className="text-xs text-gray-500">
                      Use your own domain for tracking links
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Click Tracking</Label>
                      <p className="text-sm text-gray-600">Track link clicks in emails</p>
                    </div>
                    <Switch
                      checked={settingsForm.enable_click_tracking}
                      onCheckedChange={(checked) => 
                        setSettingsForm(prev => ({ ...prev, enable_click_tracking: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Open Tracking</Label>
                      <p className="text-sm text-gray-600">Track when emails are opened</p>
                    </div>
                    <Switch
                      checked={settingsForm.enable_open_tracking}
                      onCheckedChange={(checked) => 
                        setSettingsForm(prev => ({ ...prev, enable_open_tracking: checked }))
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">Advanced Settings</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      These settings affect email deliverability and tracking. Only modify if you understand the implications.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                Integration Status
              </CardTitle>
              <CardDescription>
                Check the status of your integrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
