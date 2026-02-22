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

    const handleSend = async () => {
        if (!message.trim()) return
        if (!confirmed) return

        setSending(true)
        try {
            const { error } = await supabase.functions.invoke('send-gmail-reply', {
                body: {
                    workspace_id: workspaceId,
                    sender_email: email.sender_email,
                    recipient_email: email.recipient_email,
                    subject: `Re: ${email.subject.replace(/^Re: /i, '')}`,
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
            toast({
                title: 'Error sending reply',
                description: err.message || 'Failed to send email',
                variant: 'destructive'
            })
        } finally {
            setSending(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Reply to Email</DialogTitle>
                    <DialogDescription>
                        Send a follow-up to this thread.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right text-muted-foreground">From</Label>
                        <div className="col-span-3 text-sm font-medium">{email.sender_email}</div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right text-muted-foreground">To</Label>
                        <div className="col-span-3 text-sm font-medium">{email.recipient_email}</div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right text-muted-foreground">Subject</Label>
                        <div className="col-span-3 text-sm font-medium text-muted-foreground">
                            Re: {email.subject.replace(/^Re: /i, '')}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="message">Message</Label>
                        <Textarea
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type your reply here..."
                            className="min-h-[150px]"
                        />
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                        <Checkbox
                            id="confirm"
                            checked={confirmed}
                            onCheckedChange={(c) => setConfirmed(!!c)}
                        />
                        <Label htmlFor="confirm" className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            I verify this reply is professional and appropriate.
                        </Label>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
                        Cancel
                    </Button>
                    <Button onClick={handleSend} disabled={!message.trim() || !confirmed || sending}>
                        {sending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <Send className="mr-2 h-4 w-4" />
                                Send Reply
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
