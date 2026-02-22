import React from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Mail, Reply, Calendar, User, ArrowRight } from 'lucide-react'
import { UnifiedEmailLog } from '@/types'
import { Badge } from '@/components/ui/badge'

interface EmailDetailDialogProps {
    email: UnifiedEmailLog | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onReply: (email: UnifiedEmailLog) => void
}

export default function EmailDetailDialog({ email, open, onOpenChange, onReply }: EmailDetailDialogProps) {
    if (!email) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <div className="flex items-start justify-between pr-8">
                        <DialogTitle className="text-xl font-semibold leading-normal">
                            {email.subject || '(No Subject)'}
                        </DialogTitle>
                        <Badge variant={email.status === 'replied' ? 'default' : 'secondary'}>
                            {email.status}
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-3 rounded-lg border">
                        <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                                <User className="h-3 w-3" /> From
                            </span>
                            <div className="truncate font-medium">{email.sender_email}</div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                                <ArrowRight className="h-3 w-3" /> To
                            </span>
                            <div className="flex flex-col">
                                <span className="font-medium">{email.recipient_email}</span>
                                {email.recipient_name && (
                                    <span className="text-xs text-muted-foreground">{email.recipient_name}</span>
                                )}
                            </div>
                        </div>
                        <div className="space-y-1 col-span-2 sm:col-span-1">
                            <span className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> Sent
                            </span>
                            <div>{new Date(email.sent_at).toLocaleString()}</div>
                        </div>
                        <div className="space-y-1 col-span-2 sm:col-span-1">
                            <span className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                                <Mail className="h-3 w-3" /> Id
                            </span>
                            <div className="truncate text-xs font-mono text-muted-foreground" title={email.id}>
                                {email.id}
                            </div>
                        </div>
                    </div>

                    {/* Email Body */}
                    <div className="flex flex-col gap-2 flex-1">
                        <h4 className="text-sm font-medium text-muted-foreground">Message Body</h4>
                        <ScrollArea className="h-[300px] w-full rounded-md border p-4 bg-background text-sm leading-relaxed whitespace-pre-wrap">
                            {email.body_text || (
                                <span className="italic text-muted-foreground">
                                    No body content available. (Sync requires 'Format Full' update)
                                </span>
                            )}
                        </ScrollArea>
                    </div>
                </div>

                <DialogFooter className="sm:justify-between items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                        Source: <span className="capitalize font-medium">{email.source}</span>
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                        <Button onClick={() => {
                            onOpenChange(false)
                            onReply(email)
                        }}>
                            <Reply className="mr-2 h-4 w-4" />
                            Reply
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
