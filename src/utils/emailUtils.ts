import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';

interface EmailPayload {
    to_email: string | string[];
    subject: string;
    html_content: string;
}

export const sendNotificationEmail = async (payload: EmailPayload): Promise<boolean> => {
    try {
        console.log('Sending email via send-email-only Edge Function:', payload.subject);

        const { error } = await supabase.functions.invoke('send-email-only', {
            body: payload,
        });

        if (error) {
            console.error('Email invocation error:', error);
            throw new Error(error.message || 'Failed to trigger email function');
        }

        console.log('✅ Email successfully dispatched.');
        return true;
    } catch (err: any) {
        console.error('Failed to send email:', err);
        // We do not want email failure to block the main UI flow, so we catch and toast
        toast({
            title: 'Email Notification Failed',
            description: err.message,
            variant: 'destructive',
        });
        return false;
    }
};
