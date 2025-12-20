-- Add outreach_type column to outreach_settings table
ALTER TABLE public.outreach_settings 
ADD COLUMN IF NOT EXISTS outreach_type varchar DEFAULT 'client' CHECK (outreach_type IN ('collab', 'client'));

-- Add comment
COMMENT ON COLUMN public.outreach_settings.outreach_type IS 'Type of outreach: collab (internal team to chefs) or client (platform users)';
