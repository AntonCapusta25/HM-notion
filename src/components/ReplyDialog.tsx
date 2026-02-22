import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Loader2, Send } from 'lucide-react'
import { UnifiedEmailLog } from '@/types'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

interface ReplyDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    email: UnifiedEmailLog | null
    workspaceId: string
    onSuccess?: () => void
}

export default function ReplyDialog({ open, onOpenChange, email, workspaceId, onSuccess }: ReplyDialogProps) {
    const [message, setMessage] = useState('')
    const [confirmed, setConfirmed] = useState(false)
    const [sending, setSending] = useState(false)
    const { toast } = useToast()

    if (!email) return null

    // Resolve display-friendly recipient: prefer recipient_name, then email, then fallback
    const toDisplay = email.recipient_name
        ? `${email.recipient_name} <${email.recipient_email}>`
        : email.recipient_email || '—'

    const handleSend = async () => {
        if (!message.trim() || !confirmed) return
        setSending(true)
        try {
            const { error } = await supabase.functions.invoke('send-gmail-reply', {
                body: {
                    workspace_id: workspaceId,
                    sender_email: email.sender_email,
                    recipient_email: email.recipient_email,
                    subject: `Re: ${email.subject.replace(/^Re:\s*/i, '')}`,
                    message_text: message,
                    thread_id: email.thread_id,
                    original_message_id: email.external_id
                }
            })
            if (error) throw error
            toast({ title: 'Reply sent', description: 'Your email has been sent successfully.' })
            setMessage('')
            setConfirmed(false)
            onOpenChange(false)
            if (onSuccess) onSuccess()
        } catch (err: any) {
            toast({ title: 'Error sending reply', description: err.message || 'Failed to send email', variant: 'destructive' })
        } finally {
            setSending(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Reply to Email</DialogTitle>
                    <DialogDescription>Send a follow-up to this thread.</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-2">
                    {/* Meta */}
                    <div className="rounded-lg border bg-muted/30 px-4 py-3 space-y-1.5 text-sm">
                        <div className="flex gap-2">
                            <span className="text-muted-foreground w-14 shrink-0">From</span>
                            <span className="font-medium">{email.sender_email}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="text-muted-foreground w-14 shrink-0">To</span>
                            <span className="font-medium">{toDisplay}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="text-muted-foreground w-14 shrink-0">Re</span>
                            <span className="text-muted-foreground truncate">{email.subject.replace(/^Re:\s*/i, '')}</span>
                        </div>
                    </div>

                    {/* Compose */}
                    <div className="space-y-1.5">
                        <Label htmlFor="message">Your Reply</Label>
                        <Textarea
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type your reply here..."
                            className="min-h-[140px]"
                        />
                    </div>

                    {/* Original email body */}
                    {email.body_text && (
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Original Message</Label>
                            <div className="rounded-md border border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground whitespace-pre-wrap max-h-[200px] overflow-y-auto leading-relaxed">
                                {email.body_text.slice(0, 1500)}{email.body_text.length > 1500 ? '…' : ''}
                            </div>
                        </div>
                    )}

                    {/* Confirm */}
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="confirm"
                            checked={confirmed}
                            onCheckedChange={(c) => setConfirmed(!!c)}
                        />
                        <Label htmlFor="confirm" className="text-sm text-muted-foreground leading-none">
                            I verify this reply is professional and appropriate.
                        </Label>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Cancel</Button>
                    <Button onClick={handleSend} disabled={!message.trim() || !confirmed || sending}>
                        {sending ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>
                        ) : (
                            <><Send className="mr-2 h-4 w-4" />Send Reply</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
