// useCollabStore.ts - State management for collab outreach (internal team → chefs)
import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { CollabLead, CollabSegment, CollabCampaign, CollabEmail, CollabActivity, OutreachSettings } from '../types'

interface CollabStore {
    // State
    leads: CollabLead[]
    segments: CollabSegment[]
    campaigns: CollabCampaign[]
    emails: CollabEmail[]
    activities: CollabActivity[]
    settings: OutreachSettings | null
    analytics: any
    loading: boolean
    error: string | null

    // Actions
    initializeWorkspace: (workspaceId: string) => Promise<void>
    clearError: () => void

    // Leads
    fetchLeads: (workspaceId: string) => Promise<void>
    createLead: (lead: Partial<CollabLead>) => Promise<void>
    updateLead: (id: string, updates: Partial<CollabLead>) => Promise<void>
    deleteLead: (id: string) => Promise<void>
    bulkUpdateLeads: (ids: string[], updates: Partial<CollabLead>) => Promise<void>

    // Segments
    fetchSegments: (workspaceId: string) => Promise<void>
    createSegment: (segment: Partial<CollabSegment>) => Promise<void>
    updateSegment: (id: string, updates: Partial<CollabSegment>) => Promise<void>
    deleteSegment: (id: string) => Promise<void>

    // Campaigns
    fetchCampaigns: (workspaceId: string) => Promise<void>
    createCampaign: (campaign: Partial<CollabCampaign>) => Promise<void>
    updateCampaign: (id: string, updates: Partial<CollabCampaign>) => Promise<void>
    deleteCampaign: (id: string) => Promise<void>
    launchCampaign: (id: string) => Promise<void>

    // Settings
    fetchSettings: (workspaceId: string) => Promise<void>
    updateSettings: (workspaceId: string, settings: Partial<OutreachSettings>) => Promise<void>
    sendTestEmail: (emailData: any) => Promise<void>
}

export const useCollabStore = create<CollabStore>((set, get) => ({
    // Initial state
    leads: [],
    segments: [],
    campaigns: [],
    emails: [],
    activities: [],
    settings: null,
    analytics: null,
    loading: false,
    error: null,

    // Initialize workspace
    initializeWorkspace: async (workspaceId: string) => {
        try {
            set({ loading: true, error: null })
            await Promise.all([
                get().fetchLeads(workspaceId),
                get().fetchSegments(workspaceId),
                get().fetchCampaigns(workspaceId),
                get().fetchSettings(workspaceId),
            ])
        } catch (error: any) {
            set({ error: error.message })
        } finally {
            set({ loading: false })
        }
    },

    clearError: () => set({ error: null }),

    // Leads operations
    fetchLeads: async (workspaceId: string) => {
        const { data, error } = await supabase
            .from('collab_leads')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false })

        if (error) throw error
        set({ leads: data || [] })
    },

    createLead: async (lead: Partial<CollabLead>) => {
        const { data: { user } } = await supabase.auth.getUser()

        const { data, error } = await supabase
            .from('collab_leads')
            .insert({ ...lead, created_by: user?.id })
            .select()
            .single()

        if (error) throw error
        set(state => ({ leads: [data, ...state.leads] }))
    },

    updateLead: async (id: string, updates: Partial<CollabLead>) => {
        const { data, error } = await supabase
            .from('collab_leads')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        set(state => ({
            leads: state.leads.map(l => l.id === id ? data : l)
        }))
    },

    deleteLead: async (id: string) => {
        const { error } = await supabase
            .from('collab_leads')
            .delete()
            .eq('id', id)

        if (error) throw error
        set(state => ({
            leads: state.leads.filter(l => l.id !== id)
        }))
    },

    bulkUpdateLeads: async (ids: string[], updates: Partial<CollabLead>) => {
        const { error } = await supabase
            .from('collab_leads')
            .update(updates)
            .in('id', ids)

        if (error) throw error
        set(state => ({
            leads: state.leads.map(l => ids.includes(l.id) ? { ...l, ...updates } : l)
        }))
    },

    // Segments operations
    fetchSegments: async (workspaceId: string) => {
        const { data, error } = await supabase
            .from('collab_segments')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false })

        if (error) throw error
        set({ segments: data || [] })
    },

    createSegment: async (segment: Partial<CollabSegment>) => {
        const { data: { user } } = await supabase.auth.getUser()

        const { data, error } = await supabase
            .from('collab_segments')
            .insert({ ...segment, created_by: user?.id })
            .select()
            .single()

        if (error) throw error
        set(state => ({ segments: [data, ...state.segments] }))
    },

    updateSegment: async (id: string, updates: Partial<CollabSegment>) => {
        const { data, error } = await supabase
            .from('collab_segments')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        set(state => ({
            segments: state.segments.map(s => s.id === id ? data : s)
        }))
    },

    deleteSegment: async (id: string) => {
        const { error } = await supabase
            .from('collab_segments')
            .delete()
            .eq('id', id)

        if (error) throw error
        set(state => ({
            segments: state.segments.filter(s => s.id !== id)
        }))
    },

    // Campaigns operations
    fetchCampaigns: async (workspaceId: string) => {
        const { data, error } = await supabase
            .from('collab_campaigns')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false })

        if (error) throw error
        set({ campaigns: data || [] })
    },

    createCampaign: async (campaign: Partial<CollabCampaign>) => {
        const { data: { user } } = await supabase.auth.getUser()

        const { data, error } = await supabase
            .from('collab_campaigns')
            .insert({ ...campaign, created_by: user?.id })
            .select()
            .single()

        if (error) throw error
        set(state => ({ campaigns: [data, ...state.campaigns] }))
    },

    updateCampaign: async (id: string, updates: Partial<CollabCampaign>) => {
        const { data, error } = await supabase
            .from('collab_campaigns')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        set(state => ({
            campaigns: state.campaigns.map(c => c.id === id ? data : c)
        }))
    },

    deleteCampaign: async (id: string) => {
        const { error } = await supabase
            .from('collab_campaigns')
            .delete()
            .eq('id', id)

        if (error) throw error
        set(state => ({
            campaigns: state.campaigns.filter(c => c.id !== id)
        }))
    },

    launchCampaign: async (id: string) => {
        try {
            set({ loading: true, error: null })

            await get().updateCampaign(id, { status: 'running' })

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('User not authenticated')

            const campaign = get().campaigns.find(c => c.id === id)
            if (!campaign) throw new Error('Campaign not found')

            const { data, error } = await supabase.functions.invoke('send-email', {
                body: {
                    action: 'send_campaign',
                    outreach_type: 'collab',
                    campaign_id: id,
                    workspace_id: campaign.workspace_id,
                    user_id: user.id
                }
            })

            if (error) throw new Error(error.message || 'Failed to send campaign emails')
            console.log('Collab campaign emails sent:', data)
        } catch (error: any) {
            set({ error: error.message })
            await get().updateCampaign(id, { status: 'paused' })
        } finally {
            set({ loading: false })
        }
    },

    // Settings operations
    fetchSettings: async (workspaceId: string) => {
        const { data, error } = await supabase
            .from('outreach_settings')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('outreach_type', 'collab')
            .single()

        if (error && error.code !== 'PGRST116') throw error
        set({ settings: data })
    },

    updateSettings: async (workspaceId: string, settings: Partial<OutreachSettings>) => {
        const { data: { user } } = await supabase.auth.getUser()

        const { data, error } = await supabase
            .from('outreach_settings')
            .upsert({
                workspace_id: workspaceId,
                outreach_type: 'collab',
                ...settings,
                created_by: user?.id,
                updated_at: new Date().toISOString()
            })
            .select()
            .single()

        if (error) throw error
        set({ settings: data })
    },

    sendTestEmail: async (emailData: any) => {
        try {
            set({ loading: true, error: null })

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('User not authenticated')

            const { data, error } = await supabase.functions.invoke('send-email', {
                body: {
                    action: 'send_single',
                    outreach_type: 'collab',
                    to: emailData.to,
                    subject: emailData.subject,
                    content: emailData.content,
                    html: emailData.html,
                    from_email: emailData.from_email,
                    from_name: emailData.from_name,
                    workspace_id: emailData.workspace_id,
                    user_id: user.id
                }
            })

            if (error) throw new Error(error.message || 'Failed to send test email')
            console.log('Collab test email sent:', data)
        } catch (error: any) {
            set({ error: error.message })
            throw error
        } finally {
            set({ loading: false })
        }
    },
}))
