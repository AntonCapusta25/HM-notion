import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { Plus, Mail, FileEdit, Play, Pause, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { OutreachCampaign, CAMPAIGN_STATUS_CONFIG } from '@/types'

interface CampaignListProps {
    onCreate: () => void
    onSelect: (campaignId: string) => void
}

export default function CampaignList({ onCreate, onSelect }: CampaignListProps) {
    const { toast } = useToast()
    const [campaigns, setCampaigns] = useState<OutreachCampaign[]>([])
    const [loading, setLoading] = useState(true)

    const fetchCampaigns = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('outreach_campaigns')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            toast({ title: 'Error loading campaigns', description: error.message, variant: 'destructive' })
        } else {
            setCampaigns(data || [])
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchCampaigns()
    }, [])

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'draft': return <FileEdit className="h-4 w-4" />
            case 'running': return <Play className="h-4 w-4" />
            case 'paused': return <Pause className="h-4 w-4" />
            case 'completed': return <CheckCircle className="h-4 w-4" />
            default: return <Mail className="h-4 w-4" />
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Campaigns</h2>
                    <p className="text-muted-foreground">Manage your AI-powered outreach sequences</p>
                </div>
                <Button onClick={onCreate} className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Campaign
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Campaigns</CardTitle>
                    <CardDescription>View and manage all your outreach efforts</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Subject Line</TableHead>
                                <TableHead className="text-right">Created</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {campaigns.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        No campaigns yet. Create one to get started.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                campaigns.map((campaign) => (
                                    <TableRow key={campaign.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelect(campaign.id)}>
                                        <TableCell className="font-medium">
                                            {campaign.name}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`${CAMPAIGN_STATUS_CONFIG[campaign.status as keyof typeof CAMPAIGN_STATUS_CONFIG]?.color} flex w-fit gap-1 items-center`}>
                                                {getStatusIcon(campaign.status)}
                                                {CAMPAIGN_STATUS_CONFIG[campaign.status as keyof typeof CAMPAIGN_STATUS_CONFIG]?.label || campaign.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground truncate max-w-[300px]">
                                            {campaign.subject_line || '(No subject)'}
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground">
                                            {new Date(campaign.created_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={(e) => {
                                                e.stopPropagation()
                                                onSelect(campaign.id)
                                            }}>
                                                Manage
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
