// SegmentDetailView.tsx - Detailed view of a segment with member management
import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    ArrowLeft,
    Download,
    Upload,
    Search,
    UserPlus,
    X,
    Mail,
    Phone,
    Calendar,
    Trash2
} from 'lucide-react'
import { useOutreachStore } from '@/hooks/useOutreachStore'
import { useCollabStore } from '@/hooks/useCollabStore'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Lead, CollabLead, LeadSegment, CollabSegment } from '@/types'

interface SegmentDetailViewProps {
    segmentId: string
    workspaceId: string
    onBack: () => void
    outreachType?: 'collab' | 'client'
}

const LEAD_STATUS_COLORS: Record<string, string> = {
    new: 'bg-blue-100 text-blue-800',
    contacted: 'bg-yellow-100 text-yellow-800',
    responded: 'bg-purple-100 text-purple-800',
    interested: 'bg-green-100 text-green-800',
    qualified: 'bg-green-100 text-green-800',
    converted: 'bg-emerald-100 text-emerald-800',
    not_interested: 'bg-red-100 text-red-800',
    dead: 'bg-gray-100 text-gray-800'
}

export default function SegmentDetailView({
    segmentId,
    workspaceId,
    onBack,
    outreachType = 'client'
}: SegmentDetailViewProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [isExporting, setIsExporting] = useState(false)
    const [isImporting, setIsImporting] = useState(false)

    const clientStore = useOutreachStore()
    const collabStore = useCollabStore()
    const store = outreachType === 'collab' ? collabStore : clientStore

    const { segments, leads, updateLead, createLead, fetchLeads, fetchSegments } = store
    const { user } = useAuth()
    const { toast } = useToast()

    useEffect(() => {
        if (workspaceId) {
            fetchSegments(workspaceId)
            fetchLeads(workspaceId)
        }
    }, [workspaceId, fetchSegments, fetchLeads])

    const segment = segments.find(s => s.id === segmentId)
    const segmentLeads = useMemo(() =>
        leads.filter(lead => lead.segment_id === segmentId),
        [leads, segmentId]
    )

    const filteredLeads = useMemo(() =>
        segmentLeads.filter(lead =>
            !searchTerm ||
            lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.email.toLowerCase().includes(searchTerm.toLowerCase())
        ),
        [segmentLeads, searchTerm]
    )

    const handleRemoveFromSegment = async (leadId: string) => {
        try {
            await updateLead(leadId, { segment_id: null })
            toast({
                title: "Success",
                description: "Lead removed from segment"
            })
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to remove lead from segment",
                variant: "destructive"
            })
        }
    }

    const handleExportCSV = () => {
        setIsExporting(true)

        try {
            const headers = ['Name', 'Email', 'Phone', 'Status', 'Notes', 'Created At']
            const rows = segmentLeads.map(lead => [
                lead.name,
                lead.email,
                lead.phone || '',
                lead.status,
                (lead.notes || '').replace(/,/g, ';'), // Escape commas in notes
                new Date(lead.created_at).toLocaleDateString()
            ])

            const csv = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n')

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `${segment?.name || 'segment'}-leads-${new Date().toISOString().split('T')[0]}.csv`
            link.click()
            URL.revokeObjectURL(url)

            toast({
                title: "Export Successful",
                description: `Exported ${segmentLeads.length} leads to CSV`
            })
        } catch (error) {
            toast({
                title: "Export Failed",
                description: "Failed to export leads",
                variant: "destructive"
            })
        } finally {
            setIsExporting(false)
        }
    }

    const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        setIsImporting(true)

        try {
            const text = await file.text()
            const lines = text.split('\n').filter(line => line.trim())

            // Skip header row
            const dataRows = lines.slice(1)

            let successCount = 0
            let errorCount = 0

            for (const row of dataRows) {
                try {
                    // Parse CSV row (handle quoted fields)
                    const matches = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)
                    if (!matches || matches.length < 2) continue

                    const [name, email, phone = '', status = 'new', notes = ''] = matches.map(
                        field => field.replace(/^"|"$/g, '').trim()
                    )

                    if (!name || !email) continue

                    // Check if lead already exists
                    const existingLead = leads.find(l => l.email.toLowerCase() === email.toLowerCase())

                    if (existingLead) {
                        // Update existing lead to add to segment
                        await updateLead(existingLead.id!, { segment_id: segmentId })
                    } else {
                        // Create new lead
                        const leadData: any = {
                            name,
                            email,
                            phone: phone || null,
                            status: status || 'new',
                            notes: notes || null,
                            segment_id: segmentId,
                            workspace_id: workspaceId,
                            created_by: user!.id
                        }

                        if (outreachType === 'client') {
                            leadData.source = 'csv_import'
                            leadData.lead_score = 50
                        }

                        await createLead(leadData)
                    }

                    successCount++
                } catch (error) {
                    console.error('Error importing row:', error)
                    errorCount++
                }
            }

            toast({
                title: "Import Complete",
                description: `Successfully imported ${successCount} leads${errorCount > 0 ? `, ${errorCount} failed` : ''}`
            })

            // Refresh leads
            await fetchLeads(workspaceId)
        } catch (error) {
            toast({
                title: "Import Failed",
                description: "Failed to import CSV file",
                variant: "destructive"
            })
        } finally {
            setIsImporting(false)
            // Reset file input
            event.target.value = ''
        }
    }

    if (!segment) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <p className="text-gray-600">Segment not found</p>
                    <Button onClick={onBack} className="mt-4">
                        Back to Segments
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <Button
                    variant="ghost"
                    onClick={onBack}
                    className="mb-4 -ml-2"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Segments
                </Button>

                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                        <div
                            className="w-12 h-12 rounded-lg flex-shrink-0 mt-1"
                            style={{ backgroundColor: segment.color }}
                        />
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900">{segment.name}</h2>
                            {segment.description && (
                                <p className="text-gray-600 mt-1">{segment.description}</p>
                            )}
                            <div className="flex items-center gap-4 mt-2">
                                <Badge variant="outline" className="text-sm">
                                    {segmentLeads.length} {segmentLeads.length === 1 ? 'lead' : 'leads'}
                                </Badge>
                                <span className="text-sm text-gray-500">
                                    Created {new Date(segment.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={handleExportCSV}
                            disabled={isExporting || segmentLeads.length === 0}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            {isExporting ? 'Exporting...' : 'Export CSV'}
                        </Button>

                        <Button
                            variant="outline"
                            disabled={isImporting}
                            onClick={() => document.getElementById('csv-import')?.click()}
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            {isImporting ? 'Importing...' : 'Import CSV'}
                        </Button>
                        <input
                            id="csv-import"
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={handleImportCSV}
                        />
                    </div>
                </div>
            </div>

            {/* Search */}
            <Card>
                <CardContent className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search leads by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Leads List */}
            {filteredLeads.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <UserPlus className="h-12 w-12 text-gray-400 mb-4" />
                        <h4 className="text-lg font-medium text-gray-900 mb-2">
                            {segmentLeads.length === 0 ? 'No leads in this segment yet' : 'No leads match your search'}
                        </h4>
                        <p className="text-gray-600 text-center mb-4">
                            {segmentLeads.length === 0
                                ? "Import leads from CSV or add them individually from the Leads tab"
                                : "Try adjusting your search terms"
                            }
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Segment Members ({filteredLeads.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {filteredLeads.map((lead) => (
                                <div
                                    key={lead.id}
                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="font-medium text-gray-900">{lead.name}</h4>
                                            <Badge className={LEAD_STATUS_COLORS[lead.status] || 'bg-gray-100 text-gray-800'}>
                                                {lead.status}
                                            </Badge>
                                        </div>

                                        <div className="flex items-center gap-4 text-sm text-gray-600">
                                            <div className="flex items-center gap-1">
                                                <Mail className="h-3 w-3" />
                                                <span className="truncate">{lead.email}</span>
                                            </div>
                                            {lead.phone && (
                                                <div className="flex items-center gap-1">
                                                    <Phone className="h-3 w-3" />
                                                    <span>{lead.phone}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                <span>{new Date(lead.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>

                                        {lead.notes && (
                                            <p className="text-sm text-gray-500 mt-2 line-clamp-1">{lead.notes}</p>
                                        )}
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveFromSegment(lead.id!)}
                                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
