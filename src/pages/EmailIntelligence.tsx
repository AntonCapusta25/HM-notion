// EmailIntelligence.tsx - Unified email tracking dashboard
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
    Mail, RefreshCw, Search, Download, MessageSquare,
    Eye, AlertCircle, Inbox, Settings, CheckCircle2, Zap, Plus, Trash2
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { UnifiedEmailLog, EmailSubjectStats, EmailSegmentStats } from '@/types'
import GmailConnect from '@/components/GmailConnect'
import ReplyDialog from '@/components/ReplyDialog'
import EmailDetailDialog from '@/components/EmailDetailDialog'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, BarChart, Bar
} from 'recharts'
import CampaignList from '@/components/outreach/CampaignList'
import CampaignWizard from '@/components/outreach/CampaignWizard'

interface EmailIntelligenceProps {
    workspaceId: string
}

const SOURCE_COLORS: Record<string, string> = {
    gmail: 'bg-red-100 text-red-700 border-red-200',
    sendgrid: 'bg-blue-100 text-blue-700 border-blue-200',
    manual: 'bg-gray-100 text-gray-700 border-gray-200',
}

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    sent: 'secondary',
    opened: 'default', // blue-ish usually or primary
    clicked: 'default',
    replied: 'default', // green-ish usually - might need custom class
    bounced: 'destructive',
    failed: 'destructive',
}

export default function EmailIntelligence({ workspaceId }: EmailIntelligenceProps) {
    const [activeTab, setActiveTab] = useState('overview')
    const [emails, setEmails] = useState<UnifiedEmailLog[]>([])
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [accountFilter, setAccountFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all') // Use this for tabs
    const [sortKey, setSortKey] = useState<keyof UnifiedEmailLog>('sent_at')
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
    const [selectedEmail, setSelectedEmail] = useState<UnifiedEmailLog | null>(null)
    const [replyOpen, setReplyOpen] = useState(false)
    const [detailOpen, setDetailOpen] = useState(false)
    const [detailEmail, setDetailEmail] = useState<UnifiedEmailLog | null>(null)
    const [view, setView] = useState<'dashboard' | 'campaign-wizard'>('dashboard')
    const [campaignId, setCampaignId] = useState<string | null>(null)

    // Industry stats from campaigns
    interface IndustryStat { industry: string; campaigns: number; total_leads: number; emails_sent: number; replied: number; reply_rate: number }
    const [industryStats, setIndustryStats] = useState<IndustryStat[]>([])

    const fetchIndustryStats = async () => {
        if (!workspaceId) return
        // Get campaigns with industry set
        const { data: campaigns } = await supabase
            .from('outreach_campaigns')
            .select('id, industry')
            .eq('workspace_id', workspaceId)
            .not('industry', 'is', null)
        if (!campaigns?.length) return

        const map = new Map<string, IndustryStat>()
        for (const c of campaigns) {
            const ind = c.industry || 'Other'
            if (!map.has(ind)) map.set(ind, { industry: ind, campaigns: 0, total_leads: 0, emails_sent: 0, replied: 0, reply_rate: 0 })
            const s = map.get(ind)!
            s.campaigns++
            // Count leads in this campaign via segment
            const { count: leadCount } = await supabase
                .from('outreach_emails')
                .select('id', { count: 'exact' })
                .eq('campaign_id', c.id)
            s.emails_sent += leadCount || 0
            const { count: repliedCount } = await supabase
                .from('outreach_emails')
                .select('id', { count: 'exact' })
                .eq('campaign_id', c.id)
                .eq('status', 'replied')
            s.replied += repliedCount || 0
        }
        const result = Array.from(map.values()).map(s => ({
            ...s,
            reply_rate: s.emails_sent > 0 ? s.replied / s.emails_sent * 100 : 0
        })).sort((a, b) => b.emails_sent - a.emails_sent)
        setIndustryStats(result)
    }

    // Subject Groups — persisted in localStorage
    interface SubjectGroup { id: string; name: string; prefix: string; color: string }
    const [subjectGroups, setSubjectGroups] = useState<SubjectGroup[]>(() => {
        try { return JSON.parse(localStorage.getItem('email_subject_groups') || '[]') } catch { return [] }
    })
    const [showGroupDialog, setShowGroupDialog] = useState(false)
    const [groupForm, setGroupForm] = useState({ name: '', prefix: '', color: '#3b82f6' })

    const GROUP_COLORS = [
        '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
        '#ef4444', '#ec4899', '#06b6d4', '#64748b',
    ]

    const saveGroups = (groups: SubjectGroup[]) => {
        setSubjectGroups(groups)
        localStorage.setItem('email_subject_groups', JSON.stringify(groups))
    }

    const handleCreateGroup = () => {
        if (!groupForm.name || !groupForm.prefix) return
        const newGroup: SubjectGroup = {
            id: crypto.randomUUID(),
            name: groupForm.name.trim(),
            prefix: groupForm.prefix.trim().toLowerCase(),
            color: groupForm.color,
        }
        saveGroups([...subjectGroups, newGroup])
        setGroupForm({ name: '', prefix: '', color: '#3b82f6' })
        setShowGroupDialog(false)
    }

    const ACCOUNTS = [
        { value: 'all', label: 'All Accounts' },
        { value: 'chefs@homemademeals.net', label: 'Chef Outreach' },
        { value: 'nederland@homemademeals.net', label: 'Netherlands Team' },
    ]

    // Filters
    const [searchTerm, setSearchTerm] = useState('')
    const [sourceFilter, setSourceFilter] = useState('all')
    const [segmentFilter, setSegmentFilter] = useState('all')
    const [dateRange, setDateRange] = useState('30')

    const { toast } = useToast()

    const fetchEmails = async () => {
        setLoading(true)
        const since = new Date()
        since.setDate(since.getDate() - parseInt(dateRange))

        const { data, error } = await supabase
            .from('unified_email_log')
            .select('*, gmail_connection:gmail_connections(account_label, gmail_address)')
            .eq('workspace_id', workspaceId)
            .gte('sent_at', since.toISOString())
            .order('sent_at', { ascending: false })
            .limit(1000)

        if (!error) setEmails(data || [])
        else toast({ title: 'Error loading emails', description: error.message, variant: 'destructive' })
        setLoading(false)
    }

    useEffect(() => {
        if (workspaceId) fetchEmails()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspaceId, dateRange])

    useEffect(() => { if (workspaceId) fetchIndustryStats() }, [workspaceId])

    const handleSyncAll = async () => {
        setSyncing(true)
        try {
            const { data, error } = await supabase.functions.invoke('sync-gmail-sent', {
                body: { workspace_id: workspaceId, max_results: 200 },
            })
            if (error) throw new Error(error.message)
            if (data?.error) throw new Error(data.error)

            const synced = data?.synced ?? 0
            const errs = data?.errors?.length ? ` (${data.errors.length} account error(s))` : ''
            toast({
                title: synced > 0 ? `Synced ${synced} email${synced !== 1 ? 's' : ''}${errs}` : `Up to date${errs}`,
                description: synced > 0
                    ? 'Your email history has been updated.'
                    : 'No new emails found since last sync.',
            })
            // Refresh after sync completes
            await fetchEmails()
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error'
            toast({ title: 'Sync failed', description: errorMessage, variant: 'destructive' })
        } finally {
            setSyncing(false)
        }
    }

    // Filtered emails
    // 1. First filter by account
    const accountFilteredEmails = useMemo(() => {
        if (accountFilter === 'all') return emails
        return emails.filter(e => e.sender_email.toLowerCase().includes(accountFilter.toLowerCase()))
    }, [emails, accountFilter])

    // 2. Then apply other filters (for History tab)
    const filteredEmails = useMemo(() => {
        return accountFilteredEmails.filter(email => {
            const matchesSearch = !searchTerm ||
                email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                email.recipient_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (email.recipient_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (email.group_name || '').toLowerCase().includes(searchTerm.toLowerCase())
            const matchesSource = sourceFilter === 'all' || email.source === sourceFilter
            const matchesStatus = statusFilter === 'all' || email.status === statusFilter
            const matchesSegment = segmentFilter === 'all' || email.segment === segmentFilter
            return matchesSearch && matchesSource && matchesStatus && matchesSegment
        }).sort((a, b) => {
            const valA = a[sortKey] || ''
            const valB = b[sortKey] || ''
            if (valA < valB) return sortDirection === 'asc' ? -1 : 1
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1
            return 0
        })
    }, [accountFilteredEmails, searchTerm, sourceFilter, statusFilter, segmentFilter, sortKey, sortDirection])

    // KPI calculations
    // KPI calculations (based on account filtered list)
    const kpis = useMemo(() => {
        const total = accountFilteredEmails.length
        const replied = accountFilteredEmails.filter(e => e.replied_at).length
        const opened = accountFilteredEmails.filter(e => e.opened_at).length
        const clicked = accountFilteredEmails.filter(e => e.clicked_at).length
        const bounced = accountFilteredEmails.filter(e => e.bounced_at).length
        return {
            total,
            replied,
            opened,
            clicked,
            bounced,
            replyRate: total > 0 ? (replied / total * 100) : 0,
            openRate: total > 0 ? (opened / total * 100) : 0,
            clickRate: total > 0 ? (clicked / total * 100) : 0,
            bounceRate: total > 0 ? (bounced / total * 100) : 0,
        }
    }, [accountFilteredEmails])

    // By Subject stats
    const subjectStats = useMemo((): EmailSubjectStats[] => {
        const map = new Map<string, EmailSubjectStats>()
        accountFilteredEmails.forEach(email => {
            const key = email.subject
            if (!map.has(key)) {
                map.set(key, {
                    subject: key,
                    total_sent: 0, replied: 0, opened: 0, clicked: 0, bounced: 0,
                    reply_rate: 0, open_rate: 0, click_rate: 0,
                    last_sent: email.sent_at,
                })
            }
            const s = map.get(key)!
            s.total_sent++
            if (email.replied_at) s.replied++
            if (email.opened_at) s.opened++
            if (email.clicked_at) s.clicked++
            if (email.bounced_at) s.bounced++
            if (email.sent_at > s.last_sent) s.last_sent = email.sent_at
        })
        return Array.from(map.values()).map(s => ({
            ...s,
            reply_rate: s.total_sent > 0 ? s.replied / s.total_sent * 100 : 0,
            open_rate: s.total_sent > 0 ? s.opened / s.total_sent * 100 : 0,
            click_rate: s.total_sent > 0 ? s.clicked / s.total_sent * 100 : 0,
        })).sort((a, b) => b.total_sent - a.total_sent)
    }, [accountFilteredEmails])

    // By Segment stats
    const segmentStats = useMemo((): EmailSegmentStats[] => {
        const map = new Map<string, EmailSegmentStats>()
        accountFilteredEmails.forEach(email => {
            const key = email.segment || 'Untagged'
            if (!map.has(key)) {
                map.set(key, { segment: key, total_sent: 0, replied: 0, opened: 0, reply_rate: 0, open_rate: 0 })
            }
            const s = map.get(key)!
            s.total_sent++
            if (email.replied_at) s.replied++
            if (email.opened_at) s.opened++
        })
        return Array.from(map.values()).map(s => ({
            ...s,
            reply_rate: s.total_sent > 0 ? s.replied / s.total_sent * 100 : 0,
            open_rate: s.total_sent > 0 ? s.opened / s.total_sent * 100 : 0,
        })).sort((a, b) => b.total_sent - a.total_sent)
    }, [accountFilteredEmails])

    // Unique segments for filter
    const segments = useMemo(() => {
        const s = new Set(accountFilteredEmails.map(e => e.segment).filter(Boolean))
        return Array.from(s) as string[]
    }, [accountFilteredEmails])

    // Timeline data (last 14 days)
    const timelineData = useMemo(() => {
        const days: Record<string, { date: string; sent: number; replied: number; opened: number }> = {}
        for (let i = 13; i >= 0; i--) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            const key = d.toISOString().split('T')[0]
            days[key] = { date: key.slice(5), sent: 0, replied: 0, opened: 0 }
        }
        accountFilteredEmails.forEach(email => {
            const key = email.sent_at.split('T')[0]
            if (days[key]) {
                days[key].sent++
                if (email.replied_at) days[key].replied++
                if (email.opened_at) days[key].opened++
            }
        })
        return Object.values(days)
    }, [accountFilteredEmails])

    const handleExportCSV = () => {
        const rows = [
            ['Subject', 'Recipient', 'Sender', 'Source', 'Segment', 'Group', 'Sent At', 'Status', 'Opened', 'Replied', 'Bounced'],
            ...filteredEmails.map(e => [
                e.subject, e.recipient_email, e.sender_email, e.source,
                e.segment || '', e.group_name || '',
                new Date(e.sent_at).toLocaleString(), e.status,
                e.opened_at ? 'Yes' : 'No',
                e.replied_at ? 'Yes' : 'No',
                e.bounced_at ? 'Yes' : 'No',
            ])
        ]
        const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `email-intel-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    const handleSort = (key: keyof UnifiedEmailLog) => {
        if (sortKey === key) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setSortKey(key)
            setSortDirection('desc') // Default desc for new column
        }
    }

    return (
        <div className="container mx-auto p-6 max-w-7xl space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        Email Intelligence
                        {loading && <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />}
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Unified view of all sent emails — Gmail, SendGrid, and Google Apps Script
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Select value={dateRange} onValueChange={setDateRange}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7">Last 7 days</SelectItem>
                            <SelectItem value="30">Last 30 days</SelectItem>
                            <SelectItem value="90">Last 90 days</SelectItem>
                            <SelectItem value="365">Last year</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={handleExportCSV} className="gap-2">
                        <Download className="h-4 w-4" />
                        Export
                    </Button>
                    <Button variant="outline" onClick={handleSyncAll} disabled={syncing} className="gap-2">
                        <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                        Sync Gmail
                    </Button>
                    <Button
                        onClick={() => { setCampaignId(null); setView('campaign-wizard') }}
                        className="gap-2"
                    >
                        <Zap className="h-4 w-4" />
                        New Campaign
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setShowSettings(!showSettings)}>
                        <Settings className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Gmail Connect Settings Panel */}
            {showSettings && (
                <div className="animate-in slide-in-from-top-4 duration-300">
                    <GmailConnect workspaceId={workspaceId} />
                </div>
            )}

            {/* Account Selector Tabs */}
            <Tabs value={accountFilter} onValueChange={setAccountFilter} className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-3">
                    {ACCOUNTS.map(acc => (
                        <TabsTrigger key={acc.value} value={acc.value}>{acc.label}</TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                    <TabsTrigger value="by-subject">By Subject</TabsTrigger>
                    <TabsTrigger value="by-segment">By Segment</TabsTrigger>
                </TabsList>

                {/* ── OVERVIEW TAB ── */}
                <TabsContent value="overview" className="space-y-6">
                    {/* KPI Cards */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
                                <Mail className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{kpis.total}</div>
                                <p className="text-xs text-muted-foreground">Emails sent in period</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Reply Rate</CardTitle>
                                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">{kpis.replyRate.toFixed(1)}%</div>
                                <p className="text-xs text-muted-foreground">{kpis.replied} replies received</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
                                <Eye className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-600">{kpis.openRate.toFixed(1)}%</div>
                                <p className="text-xs text-muted-foreground">{kpis.opened} unique opens</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
                                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600">{kpis.bounceRate.toFixed(1)}%</div>
                                <p className="text-xs text-muted-foreground">{kpis.bounced} emails bounced</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Timeline Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Email Activity</CardTitle>
                            <CardDescription>Performance over the last 14 days</CardDescription>
                        </CardHeader>
                        <CardContent className="pl-2">
                            <ResponsiveContainer width="100%" height={350}>
                                <LineChart data={timelineData}>
                                    <XAxis
                                        dataKey="date"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                                    />
                                    <Line type="monotone" dataKey="sent" stroke="hsl(var(--primary))" strokeWidth={2} activeDot={{ r: 8 }} name="Sent" />
                                    <Line type="monotone" dataKey="opened" stroke="#8b5cf6" strokeWidth={2} name="Opened" />
                                    <Line type="monotone" dataKey="replied" stroke="#16a34a" strokeWidth={2} name="Replied" />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── HISTORY TAB ── */}
                <TabsContent value="history" className="space-y-4">
                    <div className="flex flex-col gap-4">
                        {/* Filters Row */}
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto">
                                <TabsList>
                                    <TabsTrigger value="all">All</TabsTrigger>
                                    <TabsTrigger value="replied">Replied</TabsTrigger>
                                    <TabsTrigger value="opened">Opened</TabsTrigger>
                                    <TabsTrigger value="bounced">Bounced</TabsTrigger>
                                </TabsList>
                            </Tabs>

                            <div className="flex gap-2 w-full sm:w-auto">
                                <div className="relative flex-1 sm:min-w-[200px]">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search subject, recipient..."
                                        className="pl-8"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                                    <SelectTrigger className="w-[130px]">
                                        <SelectValue placeholder="Source" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Sources</SelectItem>
                                        <SelectItem value="gmail">Gmail</SelectItem>
                                        <SelectItem value="sendgrid">SendGrid</SelectItem>
                                        <SelectItem value="manual">Manual</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead
                                        className="cursor-pointer hover:text-primary"
                                        onClick={() => handleSort('subject')}
                                    >
                                        Subject {sortKey === 'subject' && (sortDirection === 'asc' ? '↑' : '↓')}
                                    </TableHead>
                                    <TableHead
                                        className="cursor-pointer hover:text-primary"
                                        onClick={() => handleSort('recipient_email')}
                                    >
                                        Recipient {sortKey === 'recipient_email' && (sortDirection === 'asc' ? '↑' : '↓')}
                                    </TableHead>
                                    <TableHead
                                        className="cursor-pointer hover:text-primary"
                                        onClick={() => handleSort('status')}
                                    >
                                        Status {sortKey === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                                    </TableHead>
                                    <TableHead
                                        className="cursor-pointer hover:text-primary"
                                        onClick={() => handleSort('source')}
                                    >
                                        Source {sortKey === 'source' && (sortDirection === 'asc' ? '↑' : '↓')}
                                    </TableHead>
                                    <TableHead
                                        className="text-right cursor-pointer hover:text-primary"
                                        onClick={() => handleSort('sent_at')}
                                    >
                                        Sent {sortKey === 'sent_at' && (sortDirection === 'asc' ? '↑' : '↓')}
                                    </TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredEmails.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            No results.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredEmails.map((email) => (
                                        <TableRow
                                            key={email.id}
                                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                                            onClick={() => {
                                                setDetailEmail(email)
                                                setDetailOpen(true)
                                            }}
                                        >
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span className="truncate max-w-[300px]" title={email.subject}>
                                                        {email.subject}
                                                    </span>
                                                    {email.group_name && (
                                                        <span className="text-xs text-muted-foreground">{email.group_name}</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span>{email.recipient_email}</span>
                                                    {email.recipient_name && (
                                                        <span className="text-xs text-muted-foreground">{email.recipient_name}</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={STATUS_COLORS[email.status] || 'secondary'}>
                                                    {email.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize">
                                                    {email.source}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right text-muted-foreground text-sm">
                                                {new Date(email.sent_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {email.source === 'gmail' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        onClick={(e) => {
                                                            e.stopPropagation() // Prevent row click
                                                            setSelectedEmail(email)
                                                            setReplyOpen(true)
                                                        }}
                                                    >
                                                        <span className="sr-only">Reply</span>
                                                        <MessageSquare className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                {/* ── BY SUBJECT TAB ── */}
                <TabsContent value="by-subject" className="space-y-4">
                    {/* Groups section */}
                    {subjectGroups.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Groups</h3>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {subjectGroups.map(group => {
                                    // Aggregate stats for subjects matching this group's prefix
                                    const matched = subjectStats.filter(s =>
                                        s.subject.toLowerCase().includes(group.prefix)
                                    )
                                    const totalSent = matched.reduce((a, s) => a + s.total_sent, 0)
                                    const totalReplied = matched.reduce((a, s) => a + s.replied, 0)
                                    const totalOpened = matched.reduce((a, s) => a + s.opened, 0)
                                    const replyRate = totalSent > 0 ? (totalReplied / totalSent * 100) : 0
                                    const openRate = totalSent > 0 ? (totalOpened / totalSent * 100) : 0
                                    return (
                                        <Card key={group.id} className="relative overflow-hidden">
                                            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: group.color }} />
                                            <CardHeader className="pb-2 pl-5">
                                                <div className="flex items-center justify-between">
                                                    <CardTitle className="text-sm font-semibold">{group.name}</CardTitle>
                                                    <Button
                                                        variant="ghost" size="icon"
                                                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                        onClick={() => saveGroups(subjectGroups.filter(g => g.id !== group.id))}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                                <p className="text-xs text-muted-foreground">prefix: "{group.prefix}" · {matched.length} subject{matched.length !== 1 ? 's' : ''}</p>
                                            </CardHeader>
                                            <CardContent className="pl-5 pt-0">
                                                <div className="flex gap-4 text-sm">
                                                    <div>
                                                        <div className="text-lg font-bold">{totalSent}</div>
                                                        <div className="text-xs text-muted-foreground">Sent</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-lg font-bold text-blue-600">{openRate.toFixed(1)}%</div>
                                                        <div className="text-xs text-muted-foreground">Open</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-lg font-bold text-green-600">{replyRate.toFixed(1)}%</div>
                                                        <div className="text-xs text-muted-foreground">Reply</div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Subject Line Performance</CardTitle>
                                <CardDescription>Top performing subject lines by engagement</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowGroupDialog(true)}>
                                <Plus className="h-4 w-4" />
                                Create Group
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Subject</TableHead>
                                            <TableHead className="text-right">Sent</TableHead>
                                            <TableHead className="text-right">Open Rate</TableHead>
                                            <TableHead className="text-right">Reply Rate</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {subjectStats.map((stat, i) => {
                                            // Find if this subject belongs to any group
                                            const group = subjectGroups.find(g =>
                                                stat.subject.toLowerCase().includes(g.prefix)
                                            )
                                            return (
                                                <TableRow key={i}>
                                                    <TableCell className="font-medium max-w-[400px]" title={stat.subject}>
                                                        <div className="flex items-center gap-2">
                                                            {group && (
                                                                <span
                                                                    className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                                                                    style={{ backgroundColor: group.color }}
                                                                    title={group.name}
                                                                />
                                                            )}
                                                            <span className="truncate">{stat.subject}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">{stat.total_sent}</TableCell>
                                                    <TableCell className="text-right font-medium text-blue-600">
                                                        {stat.open_rate.toFixed(1)}%
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium text-green-600">
                                                        {stat.reply_rate.toFixed(1)}%
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Create Group Dialog */}
                    <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Create Subject Group</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Group Name</label>
                                    <Input
                                        placeholder="e.g. Chef Invitations"
                                        value={groupForm.name}
                                        onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Subject Contains</label>
                                    <Input
                                        placeholder="e.g. Partnership with Homemade"
                                        value={groupForm.prefix}
                                        onChange={e => setGroupForm(f => ({ ...f, prefix: e.target.value }))}
                                    />
                                    <p className="text-xs text-muted-foreground">Subjects containing this text will be grouped together</p>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Color</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {GROUP_COLORS.map(color => (
                                            <button
                                                key={color}
                                                className={`w-7 h-7 rounded-full border-2 transition-all ${groupForm.color === color ? 'border-foreground scale-110' : 'border-transparent'
                                                    }`}
                                                style={{ backgroundColor: color }}
                                                onClick={() => setGroupForm(f => ({ ...f, color }))}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowGroupDialog(false)}>Cancel</Button>
                                <Button onClick={handleCreateGroup} disabled={!groupForm.name || !groupForm.prefix}>
                                    Create Group
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </TabsContent>

                {/* ── BY SEGMENT TAB ── */}
                <TabsContent value="by-segment" className="space-y-4">
                    {/* Industry cards */}
                    {industryStats.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">By Industry</h3>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {industryStats.map(stat => (
                                    <Card key={stat.industry}>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-semibold">{stat.industry}</CardTitle>
                                            <p className="text-xs text-muted-foreground">{stat.campaigns} campaign{stat.campaigns !== 1 ? 's' : ''}</p>
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                            <div className="flex gap-4 text-sm">
                                                <div>
                                                    <div className="text-lg font-bold">{stat.emails_sent}</div>
                                                    <div className="text-xs text-muted-foreground">Sent</div>
                                                </div>
                                                <div>
                                                    <div className="text-lg font-bold text-green-600">{stat.reply_rate.toFixed(1)}%</div>
                                                    <div className="text-xs text-muted-foreground">Reply Rate</div>
                                                </div>
                                                <div>
                                                    <div className="text-lg font-bold text-muted-foreground">{stat.replied}</div>
                                                    <div className="text-xs text-muted-foreground">Replied</div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Original segment bar chart */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card className="col-span-2">
                            <CardHeader>
                                <CardTitle>Segment Performance</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={segmentStats.map(s => ({
                                        name: s.segment,
                                        Reply: s.reply_rate,
                                        Open: s.open_rate
                                    }))}>
                                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                                            itemStyle={{ color: 'hsl(var(--foreground))' }}
                                        />
                                        <Bar dataKey="Reply" fill="#16a34a" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="Open" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

            </Tabs>

            {/* ── CAMPAIGN WIZARD (inline overlay) ── */}
            {view === 'campaign-wizard' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <CampaignWizard
                        campaignId={campaignId}
                        onBack={() => setView('dashboard')}
                    />
                </div>
            )}

            <ReplyDialog
                open={replyOpen}
                onOpenChange={setReplyOpen}
                email={selectedEmail}
                workspaceId={workspaceId}
                onSuccess={fetchEmails}
            />

            <EmailDetailDialog
                open={detailOpen}
                onOpenChange={setDetailOpen}
                email={detailEmail}
                onReply={(email) => {
                    setSelectedEmail(email)
                    setReplyOpen(true)
                }}
            />
        </div >
    )
}
