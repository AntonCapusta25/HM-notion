import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import Papa from 'papaparse'
import { ArrowLeft, ArrowRight, Wand2, Mail, Users, Upload, Send, Save, RefreshCw, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface CampaignWizardProps {
    onBack: () => void
    campaignId?: string | null
}

export default function CampaignWizard({ onBack, campaignId: initialCampaignId }: CampaignWizardProps) {
    const { toast } = useToast()
    const [activeTab, setActiveTab] = useState('setup')
    const [loading, setLoading] = useState(false)
    const [campaignId, setCampaignId] = useState<string | null>(initialCampaignId || null)

    // Form State
    const [name, setName] = useState('')
    const [goal, setGoal] = useState('')
    const [industry, setIndustry] = useState('')
    const [prompt, setPrompt] = useState('Write a friendly introduction email to {{name}} from {{company}}.')
    const [importedLeads, setImportedLeads] = useState<any[]>([])
    const [segmentId, setSegmentId] = useState<string | null>(null)
    const [existingLeadCount, setExistingLeadCount] = useState(0)

    const INDUSTRIES = [
        'Cooking Schools', 'Restaurants', 'Caterers', 'Hotels & Hospitality',
        'Food Bloggers', 'Private Chefs', 'Meal Prep Services', 'Food Trucks',
        'Bakeries & Pastry', 'Corporate Catering', 'Event Planners', 'Other',
    ]

    // Generation State
    const [generatedEmails, setGeneratedEmails] = useState<any[]>([])
    const [generating, setGenerating] = useState(false)
    const [sending, setSending] = useState(false)

    // Load existing
    useEffect(() => {
        if (initialCampaignId) {
            loadCampaign(initialCampaignId)
        }
    }, [initialCampaignId])

    const loadCampaign = async (id: string) => {
        setLoading(true)
        const { data, error } = await supabase.from('outreach_campaigns').select('*').eq('id', id).single()
        if (data) {
            setName(data.name)
            setGoal(data.description || '')
            setIndustry(data.industry || '')
            setPrompt(data.settings?.prompt || prompt)
            setSegmentId(data.segment_id)
            setCampaignId(data.id)
            if (data.status !== 'draft') setActiveTab('review')
            else if (data.segment_id) setActiveTab('content')
            fetchGeneratedEmails(id)
            // Count existing leads in this segment
            if (data.segment_id) {
                const { count } = await supabase.from('leads').select('id', { count: 'exact' }).eq('segment_id', data.segment_id)
                setExistingLeadCount(count || 0)
            }
        }
        setLoading(false)
    }

    // 1. Save Setup
    const handleSaveSetup = async () => {
        if (!name) return toast({ title: 'Name required', variant: 'destructive' })
        setLoading(true)

        // Create or update campaign
        const campaignData = {
            name,
            description: goal,
            industry,
            status: 'draft',
            settings: { prompt },
        }

        let error
        if (campaignId) {
            const { error: e } = await supabase.from('outreach_campaigns').update(campaignData).eq('id', campaignId)
            error = e
        } else {
            // For now, hardcode workspace/user or fetch from AuthContext if available
            // Assuming user is logged in and we have context, but I don't have AuthContext here.
            // I'll fetch user first.
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                // @ts-ignore
                campaignData.created_by = user.id
                // Fetch user's workspace
                const { data: member } = await supabase.from('workspace_members').select('workspace_id').eq('user_id', user.id).single()
                // @ts-ignore
                if (member) campaignData.workspace_id = member.workspace_id
            }

            const { data, error: e } = await supabase.from('outreach_campaigns').insert(campaignData).select().single()
            if (data) setCampaignId(data.id)
            error = e
        }

        setLoading(false)
        if (error) {
            toast({ title: 'Error saving campaign', description: error.message, variant: 'destructive' })
        } else {
            toast({ title: 'Campaign saved' })
            setActiveTab('leads')
        }
    }

    // 2. Import CSV
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        Papa.parse(file, {
            header: true,
            complete: async (results) => {
                const leads = results.data.filter((r: any) => r.Email || r.email) // Basic validation
                setImportedLeads(leads)
                toast({ title: `Parsed ${leads.length} leads` })
            },
            error: (err) => toast({ title: 'CSV Error', description: err.message, variant: 'destructive' })
        })
    }

    const handleImportLeads = async () => {
        if (importedLeads.length === 0) return toast({ title: 'No leads to import', variant: 'destructive' })
        if (!campaignId) return toast({ title: 'Save setup first', variant: 'destructive' })

        setLoading(true)

        // 1. Create Segment
        const segmentName = `Imported: ${name} (${new Date().toLocaleDateString()})`
        // Helper to get IDs (could extract to util)
        const { data: { user } } = await supabase.auth.getUser()
        let workspaceId = ''
        if (user) {
            const { data: member } = await supabase.from('workspace_members').select('workspace_id').eq('user_id', user.id).single()
            workspaceId = member?.workspace_id
        }

        // Retry segment with correct IDs
        if (workspaceId && user) {
            const { data: segmentData } = await supabase.from('lead_segments').insert({
                name: segmentName,
                color: '#3b82f6',
                workspace_id: workspaceId,
                created_by: user.id
            }).select().single()

            if (segmentData) {
                setSegmentId(segmentData.id)

                // Update campaign with segment_id
                await supabase.from('outreach_campaigns').update({ segment_id: segmentData.id }).eq('id', campaignId)

                // 2. Upsert Leads
                const formattedLeads = importedLeads.map((l: any) => ({
                    email: l.Email || l.email,
                    name: l.Name || l.name || '',
                    company: l.Company || l.company || '',
                    industry: l.Industry || l.industry || '',
                    notes: l.Notes || l.notes || '',
                    segment_id: segmentData.id,
                    workspace_id: workspaceId,
                    created_by: user.id,
                    status: 'new'
                }))

                const { error: leadsError } = await supabase.from('leads').upsert(formattedLeads, { onConflict: 'email,workspace_id' })

                if (leadsError) {
                    toast({ title: 'Error importing leads', description: leadsError.message, variant: 'destructive' })
                } else {
                    toast({ title: 'Leads imported successfully' })
                    setActiveTab('content')
                }
            }
        }
        setLoading(false)
    }

    // 2b. Add more leads to existing segment (dedup by email+workspace_id)
    const handleAddMoreLeads = async () => {
        if (!importedLeads.length || !segmentId || !campaignId) return
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        let workspaceId = ''
        if (user) {
            const { data: member } = await supabase.from('workspace_members').select('workspace_id').eq('user_id', user.id).single()
            workspaceId = member?.workspace_id
        }
        const formattedLeads = importedLeads.map((l: any) => ({
            email: l.Email || l.email,
            name: l.Name || l.name || '',
            company: l.Company || l.company || '',
            industry: industry || l.Industry || l.industry || '',
            notes: l.Notes || l.notes || '',
            segment_id: segmentId,
            workspace_id: workspaceId,
            created_by: user!.id,
            status: 'new'
        }))
        const { error } = await supabase.from('leads').upsert(formattedLeads, { onConflict: 'email,workspace_id' })
        if (error) {
            toast({ title: 'Error adding leads', description: error.message, variant: 'destructive' })
        } else {
            const { count } = await supabase.from('leads').select('id', { count: 'exact' }).eq('segment_id', segmentId)
            setExistingLeadCount(count || 0)
            setImportedLeads([])
            toast({ title: 'Leads added', description: `${count} total leads in this campaign` })
        }
        setLoading(false)
    }

    // 3. Generate Content
    const handleGenerate = async () => {
        if (!campaignId) return
        setGenerating(true)
        try {
            await supabase.from('outreach_campaigns').update({ settings: { prompt } }).eq('id', campaignId)

            const { data, error } = await supabase.functions.invoke('generate-campaign-content', {
                body: { campaign_id: campaignId }
            })

            if (error) throw error

            toast({ title: 'Generation Complete', description: `Drafted ${data.generated} emails` })
            fetchGeneratedEmails(campaignId)
            setActiveTab('review')
        } catch (err: any) {
            toast({ title: 'Generation Failed', description: err.message, variant: 'destructive' })
        } finally {
            setGenerating(false)
        }
    }

    const fetchGeneratedEmails = async (id: string) => {
        if (!id) return
        const { data } = await supabase
            .from('outreach_emails')
            .select('*, lead:leads(email, name)')
            .eq('campaign_id', id)
            .order('created_at')
        setGeneratedEmails(data || [])
    }

    // 4. Send
    const handleSendBatch = async () => {
        if (!campaignId) return
        setSending(true)
        try {
            const { data, error } = await supabase.functions.invoke('send-campaign-batch', {
                body: { campaign_id: campaignId, batch_size: 50 }
            })

            if (error) throw error

            toast({ title: 'Batch Sent', description: `Successfully sent ${data.sent} emails` })
            onBack() // Convert to list view
        } catch (err: any) {
            toast({ title: 'Send Failed', description: err.message, variant: 'destructive' })
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">
                        {initialCampaignId ? 'Edit Campaign' : 'New Campaign'}
                    </h2>
                    <p className="text-muted-foreground">Setup your automated outreach</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="setup">1. Setup</TabsTrigger>
                    <TabsTrigger value="leads" disabled={!campaignId}>2. Audience</TabsTrigger>
                    <TabsTrigger value="content" disabled={!segmentId}>3. Content</TabsTrigger>
                    <TabsTrigger value="review" disabled={generatedEmails.length === 0}>4. Review & Launch</TabsTrigger>
                </TabsList>

                {/* STEP 1: SETUP */}
                <TabsContent value="setup">
                    <Card>
                        <CardHeader>
                            <CardTitle>Campaign Details</CardTitle>
                            <CardDescription>Name your campaign and set your goal.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Campaign Name</Label>
                                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Q1 Outreach - Hospitality" />
                            </div>
                            <div className="space-y-2">
                                <Label>Industry / Segment</Label>
                                <Select value={industry} onValueChange={setIndustry}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select industry..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {INDUSTRIES.map(ind => (
                                            <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Goal / Description</Label>
                                <Textarea value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Reach out to potential restaurant partners..." />
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-end">
                            <Button onClick={handleSaveSetup} disabled={loading}>
                                {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                                Next: Audience <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                {/* STEP 2: LEADS */}
                <TabsContent value="leads">
                    <Card>
                        <CardHeader>
                            <CardTitle>Import Audience</CardTitle>
                            <CardDescription>Upload a CSV with columns: Email, Name, Company, Industry</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* If campaign already has leads, show count + add-more section */}
                            {existingLeadCount > 0 && (
                                <div className="rounded-lg border bg-muted/30 px-4 py-3 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium">{existingLeadCount} leads already in this campaign</p>
                                        <p className="text-xs text-muted-foreground">Upload a new CSV to add more — duplicates will be ignored</p>
                                    </div>
                                    <Badge variant="secondary">{industry || 'No industry set'}</Badge>
                                </div>
                            )}

                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Label htmlFor="csv">{existingLeadCount > 0 ? 'Add More Leads (CSV)' : 'CSV File'}</Label>
                                <Input id="csv" type="file" accept=".csv" onChange={handleFileUpload} />
                            </div>

                            {importedLeads.length > 0 && (
                                <div className="rounded-md border p-4 bg-muted/50">
                                    <p className="text-sm font-medium mb-2">Preview ({importedLeads.length} leads)</p>
                                    <div className="max-h-[200px] overflow-auto text-xs">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Email</TableHead>
                                                    <TableHead>Name</TableHead>
                                                    <TableHead>Company</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {importedLeads.slice(0, 5).map((l, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell>{l.Email || l.email}</TableCell>
                                                        <TableCell>{l.Name || l.name}</TableCell>
                                                        <TableCell>{l.Company || l.company}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <Button variant="outline" onClick={() => setActiveTab('setup')}>Back</Button>
                            <div className="flex gap-2">
                                {existingLeadCount > 0 && importedLeads.length > 0 && (
                                    <Button variant="outline" onClick={handleAddMoreLeads} disabled={loading}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add {importedLeads.length} Leads
                                    </Button>
                                )}
                                <Button
                                    onClick={existingLeadCount > 0 && importedLeads.length === 0
                                        ? () => setActiveTab('content')
                                        : handleImportLeads
                                    }
                                    disabled={(importedLeads.length === 0 && existingLeadCount === 0) || loading}
                                >
                                    {loading ? 'Importing...' :
                                        existingLeadCount > 0 && importedLeads.length === 0
                                            ? 'Continue to Content'
                                            : 'Import & Continue'
                                    } <Upload className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </CardFooter>
                    </Card>
                </TabsContent>

                {/* STEP 3: CONTENT */}
                <TabsContent value="content">
                    <Card>
                        <CardHeader>
                            <CardTitle>AI Content Generation</CardTitle>
                            <CardDescription>Define how the AI should write emails for your leads.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Prompt Instructions</Label>
                                <Textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    className="h-[150px] font-mono text-sm"
                                    placeholder="Write a cold email to {{name}}..."
                                />
                                <p className="text-xs text-muted-foreground">
                                    Available variables: <code>{'{{name}}'}</code>, <code>{'{{company}}'}</code>, <code>{'{{industry}}'}</code>
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <Button variant="outline" onClick={() => setActiveTab('leads')}>Back</Button>
                            <Button onClick={handleGenerate} disabled={generating}>
                                {generating ? (
                                    <>Generating ({generatedEmails.length} drafts)... <RefreshCw className="ml-2 h-4 w-4 animate-spin" /></>
                                ) : (
                                    <>Generate Drafts <Wand2 className="ml-2 h-4 w-4" /></>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                {/* STEP 4: REVIEW */}
                <TabsContent value="review">
                    <Card>
                        <CardHeader>
                            <CardTitle>Review & Launch</CardTitle>
                            <CardDescription>Review generated drafts before sending.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>To</TableHead>
                                            <TableHead>Subject</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {generatedEmails.map((email) => (
                                            <TableRow key={email.id}>
                                                <TableCell className="font-medium">
                                                    {email.lead?.name} <span className="text-xs text-muted-foreground">&lt;{email.lead?.email}&gt;</span>
                                                </TableCell>
                                                <TableCell className="truncate max-w-[300px]">{email.subject}</TableCell>
                                                <TableCell>
                                                    <Badge variant={email.status === 'pending' ? 'secondary' : 'default'}>
                                                        {email.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm">Edit</Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <Button variant="outline" onClick={() => setActiveTab('content')}>Back</Button>
                            <Button onClick={handleSendBatch} disabled={sending} className="bg-green-600 hover:bg-green-700">
                                {sending ? 'Sending...' : 'Launch Campaign'} <Send className="ml-2 h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
