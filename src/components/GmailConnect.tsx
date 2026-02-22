// GmailConnect.tsx - Service account status panel (no OAuth needed)
import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mail, RefreshCw, CheckCircle, Loader2, Info } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

interface GmailConnectProps {
    workspaceId: string
    onSyncComplete?: () => void
}

// Gmail accounts synced via service account — configured in Supabase secrets (GMAIL_ACCOUNTS)
const CONFIGURED_ACCOUNTS = [
    { label: 'Chef Outreach', email: 'chefs@homemademeals.net' },
    { label: 'Netherlands Team', email: 'nederland@homemademeals.net' },
]

export default function GmailConnect({ workspaceId, onSyncComplete }: GmailConnectProps) {
    const [syncing, setSyncing] = useState(false)
    const { toast } = useToast()

    const handleSync = async () => {
        setSyncing(true)
        try {
            const { data, error } = await supabase.functions.invoke('sync-gmail-sent', {
                body: {
                    workspace_id: workspaceId,
                    max_results: 200,
                },
            })
            if (error) throw error

            if (data?.errors && data.errors.length > 0) {
                toast({
                    title: 'Sync Warning',
                    description: data.errors.join('\n'),
                    variant: 'destructive',
                })
            } else {
                toast({
                    title: 'Sync complete',
                    description: `Synced ${data.synced} emails from Gmail.`,
                })
            }
            onSyncComplete?.()
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
            toast({
                title: 'Sync failed',
                description: errorMessage,
                variant: 'destructive',
            })
        } finally {
            setSyncing(false)
        }
    }

    return (
        <Card className="border-border">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <Mail className="h-5 w-5 text-primary" />
                            Gmail Sync
                        </CardTitle>
                        <CardDescription>
                            Connected via Google Workspace service account — accessible to the whole team
                        </CardDescription>
                    </div>
                    <Button
                        size="sm"
                        onClick={handleSync}
                        disabled={syncing}
                        className="flex items-center gap-2"
                        variant="outline"
                    >
                        {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        {syncing ? 'Syncing...' : 'Sync Now'}
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="flex flex-col gap-2">
                    {CONFIGURED_ACCOUNTS.map(account => (
                        <div
                            key={account.email}
                            className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Mail className="h-4 w-4 text-primary" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium">{account.email}</span>
                                    <span className="text-xs text-muted-foreground">{account.label}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-xs font-medium">
                                    <CheckCircle className="h-3 w-3" />
                                    Active
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                    <Info className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary" />
                    <span>
                        Emails are synced via Google Workspace service account. To add more accounts, update the <code className="bg-background px-1.5 py-0.5 rounded border border-border">GMAIL_ACCOUNTS</code> secret in Supabase.
                    </span>
                </div>
            </CardContent>
        </Card>
    )
}
