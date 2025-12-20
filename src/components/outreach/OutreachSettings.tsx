// OutreachSettings.tsx - Simplified email configuration
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Mail,
  TestTube,
  CheckCircle,
  RefreshCw,
  AlertCircle
} from 'lucide-react'
import { useOutreachStore } from '@/hooks/useOutreachStore'
import { useCollabStore } from '@/hooks/useCollabStore'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

interface OutreachSettingsProps {
  workspaceId: string
  outreachType?: 'collab' | 'client'
}

export default function OutreachSettings({ workspaceId, outreachType = 'client' }: OutreachSettingsProps) {
  const clientStore = useOutreachStore()
  const collabStore = useCollabStore()
  const store = outreachType === 'collab' ? collabStore : clientStore

  const [testing, setTesting] = useState(false)
  const [testResults, setTestResults] = useState<any>(null)

  const { settings, loading, fetchSettings, sendTestEmail } = store
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (workspaceId) {
      fetchSettings(workspaceId)
    }
  }, [workspaceId])

  const handleTestEmailSystem = async () => {
    if (!user?.email) {
      toast({
        title: "Error",
        description: "No user email found",
        variant: "destructive"
      })
      return
    }

    setTesting(true)
    setTestResults(null)

    try {
      await sendTestEmail({
        to: user.email,
        subject: `Test Email - ${outreachType === 'collab' ? 'Collab' : 'Client'} Outreach`,
        content: `This is a test email from your ${outreachType === 'collab' ? 'collab' : 'client'} outreach system.`,
        html: `<p>This is a test email from your <strong>${outreachType === 'collab' ? 'collab' : 'client'} outreach</strong> system.</p><p>If you received this, your email configuration is working correctly!</p>`,
        from_email: 'Chefs@homemademeals.net',
        from_name: 'Homemade Meals',
        workspace_id: workspaceId
      })

      setTestResults({
        success: true,
        message: `Test email sent successfully to ${user.email}`
      })

      toast({
        title: "Test Email Sent",
        description: `Check your inbox at ${user.email}`,
      })
    } catch (error: any) {
      console.error('Test email error:', error)
      setTestResults({
        success: false,
        message: error.message || 'Failed to send test email'
      })

      toast({
        title: "Test Failed",
        description: error.message || 'Failed to send test email',
        variant: "destructive"
      })
    } finally {
      setTesting(false)
    }
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
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Email Settings</h2>
        <p className="text-gray-600">
          {outreachType === 'collab'
            ? 'Configure email settings for internal team outreach to chefs'
            : 'Configure email settings for client outreach campaigns'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            SendGrid Email Configuration
          </CardTitle>
          <CardDescription>
            Email provider configured via environment variables
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Email Provider</h4>
                <p className="text-sm text-gray-600 mt-1">SendGrid is configured via environment variables</p>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                SendGrid Active
              </Badge>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">From Email:</span>
                <span className="font-medium">Chefs@homemademeals.net</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">From Name:</span>
                <span className="font-medium">Homemade Meals</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Status:</span>
                <span className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Configured
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Daily Limit:</span>
                <span className="font-medium text-blue-600">Unlimited</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Tracking:</span>
                <span className="font-medium">Opens & Clicks Enabled</span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleTestEmailSystem}
              disabled={testing}
              className="w-full flex items-center justify-center gap-2"
            >
              {testing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Sending Test Email...
                </>
              ) : (
                <>
                  <TestTube className="h-4 w-4" />
                  Send Test Email
                </>
              )}
            </Button>

            {testResults && (
              <div className={`p-4 rounded-lg border ${testResults.success
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
                }`}>
                <div className="flex items-start gap-3">
                  {testResults.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h4 className={`font-medium ${testResults.success ? 'text-green-900' : 'text-red-900'
                      }`}>
                      {testResults.success ? 'Test Successful' : 'Test Failed'}
                    </h4>
                    <p className={`text-sm mt-1 ${testResults.success ? 'text-green-700' : 'text-red-700'
                      }`}>
                      {testResults.message}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">📧 Email Capabilities</h4>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>Send unlimited emails per day</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>Bulk campaign sending to 10k+ recipients</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>Email open and click tracking</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>Personalized email templates</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>Campaign analytics and reporting</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
