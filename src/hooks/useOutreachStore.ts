// useOutreachStore.ts - Simplified version without deep research functionality
import { create } from 'zustand'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
)

// Types (Deep Research types removed)
interface Lead {
  id: string
  name: string
  email: string
  company?: string
  position?: string
  industry?: string
  phone?: string
  website?: string
  linkedin_url?: string
  twitter_url?: string
  instagram_url?: string
  location?: string
  company_size?: string
  revenue_range?: string
  lead_score: number
  status: 'new' | 'contacted' | 'responded' | 'qualified' | 'converted' | 'dead'
  source: string
  notes?: string
  custom_fields?: any
  segment_id?: string
  created_by: string
  workspace_id: string
  created_at: string
  updated_at: string
  last_contacted_at?: string
}

interface LeadSegment {
  id: string
  name: string
  description?: string
  color: string
  created_by: string
  workspace_id: string
  created_at: string
  updated_at: string
}

interface OutreachType {
  id: string
  name: string
  description?: string
  default_subject?: string
  default_template?: string
  created_by: string
  workspace_id: string
  created_at: string
  updated_at: string
}

interface OutreachCampaign {
  id: string
  name: string
  description?: string
  outreach_type_id?: string
  segment_id?: string
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed'
  subject_line: string
  email_template: string
  scheduled_at?: string
  send_immediately: boolean
  created_by: string
  workspace_id: string
  created_at: string
  updated_at: string
  settings: any
  attachments?: CampaignAttachment[]
}

interface CampaignAttachment {
  id: string
  campaign_id: string
  file_name: string
  file_url: string
  file_size?: number
  file_type?: string
  uploaded_by: string
  created_at: string
}

interface OutreachEmail {
  id: string
  campaign_id?: string
  lead_id: string
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'replied' | 'bounced' | 'failed'
  subject_line?: string
  email_content?: string
  personalized_content?: any
  scheduled_at?: string
  sent_at?: string
  delivered_at?: string
  opened_at?: string
  clicked_at?: string
  replied_at?: string
  apps_script_id?: string
  tracking_data?: any
  error_message?: string
  created_by: string
  workspace_id: string
  created_at: string
  updated_at: string
}

interface CSVImport {
  id: string
  file_name: string
  file_url: string
  total_rows: number
  successful_imports: number
  failed_imports: number
  target_segment_id?: string
  mapping_config: any
  error_log?: string
  created_by: string
  workspace_id: string
  created_at: string
  completed_at?: string
}

interface OutreachSettings {
  id: string
  workspace_id: string
  sender_name?: string
  sender_email?: string
  reply_to_email?: string
  apps_script_url?: string
  apps_script_api_key?: string
  created_by: string
  created_at: string
  updated_at: string
}

interface Analytics {
  total_leads: number
  leads_by_status: Record<string, number>
  leads_by_source: Record<string, number>
  campaigns_count: number
  active_campaigns: number
  total_emails_sent: number
  overall_open_rate: number
  overall_click_rate: number
  overall_response_rate: number
  conversion_rate: number
  recent_activity: Array<{
    type: string
    description: string
    timestamp: string
  }>
}

// Store interface (Deep Research removed)
interface OutreachStore {
  // State
  leads: Lead[]
  segments: LeadSegment[]
  outreachTypes: OutreachType[]
  campaigns: OutreachCampaign[]
  emails: OutreachEmail[]
  csvImports: CSVImport[]
  settings: OutreachSettings | null
  analytics: Analytics | null
  loading: boolean
  error: string | null

  // Actions
  // Initialization
  initializeWorkspace: (workspaceId: string) => Promise<void>

  // Leads
  fetchLeads: (workspaceId: string) => Promise<void>
  createLead: (lead: Partial<Lead>) => Promise<Lead>
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>
  deleteLead: (id: string) => Promise<void>
  bulkUpdateLeads: (ids: string[], updates: Partial<Lead>) => Promise<void>

  // Segments
  fetchSegments: (workspaceId: string) => Promise<void>
  createSegment: (segment: Partial<LeadSegment>) => Promise<LeadSegment>
  updateSegment: (id: string, updates: Partial<LeadSegment>) => Promise<void>
  deleteSegment: (id: string) => Promise<void>

  // Outreach Types
  fetchOutreachTypes: (workspaceId: string) => Promise<void>
  createOutreachType: (type: Partial<OutreachType>) => Promise<OutreachType>
  updateOutreachType: (id: string, updates: Partial<OutreachType>) => Promise<void>
  deleteOutreachType: (id: string) => Promise<void>

  // Campaigns
  fetchCampaigns: (workspaceId: string) => Promise<void>
  createCampaign: (campaign: Partial<OutreachCampaign>) => Promise<OutreachCampaign>
  updateCampaign: (id: string, updates: Partial<OutreachCampaign>) => Promise<void>
  deleteCampaign: (id: string) => Promise<void>
  launchCampaign: (id: string) => Promise<void>
  pauseCampaign: (id: string) => Promise<void>

  // Emails
  fetchEmails: (workspaceId: string, campaignId?: string) => Promise<void>
  sendTestEmail: (emailData: any) => Promise<void>

  // CSV Import
  fetchCSVImports: (workspaceId: string) => Promise<void>
  uploadCSV: (file: File, workspaceId: string) => Promise<string>
  processCSVImport: (importData: any) => Promise<CSVImport>

  // Settings
  fetchSettings: (workspaceId: string) => Promise<void>
  updateSettings: (workspaceId: string, updates: Partial<OutreachSettings>) => Promise<void>

  // Analytics
  fetchAnalytics: (workspaceId: string) => Promise<void>

  // Utility
  clearError: () => void
  setLoading: (loading: boolean) => void
}

// Create store
export const useOutreachStore = create<OutreachStore>((set, get) => ({
  // Initial state (Deep Research removed)
  leads: [],
  segments: [],
  outreachTypes: [],
  campaigns: [],
  emails: [],
  csvImports: [],
  settings: null,
  analytics: null,
  loading: false,
  error: null,

  // Utility actions
  clearError: () => set({ error: null }),
  setLoading: (loading: boolean) => set({ loading }),

  // Initialize workspace data (Deep Research removed)
  initializeWorkspace: async (workspaceId: string) => {
    try {
      set({ loading: true, error: null })
      console.log('🔄 OutreachStore - Initializing workspace:', workspaceId)
      
      // Load all essential data in parallel (removed deep research)
      const results = await Promise.allSettled([
        get().fetchLeads(workspaceId),
        get().fetchSegments(workspaceId),
        get().fetchOutreachTypes(workspaceId),
        get().fetchCampaigns(workspaceId),
        get().fetchEmails(workspaceId),
        get().fetchCSVImports(workspaceId),
        get().fetchSettings(workspaceId)
      ])
      
      // Check for any failures
      const failures = results.filter(result => result.status === 'rejected')
      if (failures.length > 0) {
        console.warn('⚠️ OutreachStore - Some data failed to load:', failures)
      }
      
      // Generate analytics after data is loaded
      await get().fetchAnalytics(workspaceId)
      
      console.log('✅ OutreachStore - Workspace initialization completed')
    } catch (error: any) {
      console.error('❌ OutreachStore - Initialization failed:', error)
      set({ error: error.message })
    } finally {
      set({ loading: false })
    }
  },

  // Leads actions
  fetchLeads: async (workspaceId: string) => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*, lead_segments(name, color)')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ leads: data || [] })
    } catch (error: any) {
      console.warn('Failed to fetch leads:', error.message)
      set({ leads: [] })
    }
  },

  createLead: async (lead: Partial<Lead>) => {
    try {
      set({ loading: true, error: null })
      
      const { data, error } = await supabase
        .from('leads')
        .insert(lead)
        .select()
        .single()

      if (error) throw error
      
      set(state => ({ leads: [data, ...state.leads] }))
      return data
    } catch (error: any) {
      set({ error: error.message })
      throw error
    } finally {
      set({ loading: false })
    }
  },

  updateLead: async (id: string, updates: Partial<Lead>) => {
    try {
      set({ loading: true, error: null })
      
      const { error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      
      set(state => ({
        leads: state.leads.map(lead => 
          lead.id === id ? { ...lead, ...updates } : lead
        )
      }))
    } catch (error: any) {
      set({ error: error.message })
    } finally {
      set({ loading: false })
    }
  },

  deleteLead: async (id: string) => {
    try {
      set({ loading: true, error: null })
      
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      set(state => ({
        leads: state.leads.filter(lead => lead.id !== id)
      }))
    } catch (error: any) {
      set({ error: error.message })
    } finally {
      set({ loading: false })
    }
  },

  bulkUpdateLeads: async (ids: string[], updates: Partial<Lead>) => {
    try {
      set({ loading: true, error: null })
      
      const { error } = await supabase
        .from('leads')
        .update(updates)
        .in('id', ids)

      if (error) throw error
      
      set(state => ({
        leads: state.leads.map(lead => 
          ids.includes(lead.id) ? { ...lead, ...updates } : lead
        )
      }))
    } catch (error: any) {
      set({ error: error.message })
    } finally {
      set({ loading: false })
    }
  },

  // Segments actions
  fetchSegments: async (workspaceId: string) => {
    try {
      const { data, error } = await supabase
        .from('lead_segments')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ segments: data || [] })
    } catch (error: any) {
      console.warn('Failed to fetch segments:', error.message)
      set({ segments: [] })
    }
  },

  createSegment: async (segment: Partial<LeadSegment>) => {
    try {
      const { data, error } = await supabase
        .from('lead_segments')
        .insert(segment)
        .select()
        .single()

      if (error) throw error
      
      set(state => ({ segments: [data, ...state.segments] }))
      return data
    } catch (error: any) {
      set({ error: error.message })
      throw error
    }
  },

  updateSegment: async (id: string, updates: Partial<LeadSegment>) => {
    try {
      const { error } = await supabase
        .from('lead_segments')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      
      set(state => ({
        segments: state.segments.map(segment => 
          segment.id === id ? { ...segment, ...updates } : segment
        )
      }))
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  deleteSegment: async (id: string) => {
    try {
      const { error } = await supabase
        .from('lead_segments')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      set(state => ({
        segments: state.segments.filter(segment => segment.id !== id)
      }))
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  // Outreach Types actions
  fetchOutreachTypes: async (workspaceId: string) => {
    try {
      const { data, error } = await supabase
        .from('outreach_types')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ outreachTypes: data || [] })
    } catch (error: any) {
      console.warn('Failed to fetch outreach types:', error.message)
      set({ outreachTypes: [] })
    }
  },

  createOutreachType: async (type: Partial<OutreachType>) => {
    try {
      const { data, error } = await supabase
        .from('outreach_types')
        .insert(type)
        .select()
        .single()

      if (error) throw error
      
      set(state => ({ outreachTypes: [data, ...state.outreachTypes] }))
      return data
    } catch (error: any) {
      set({ error: error.message })
      throw error
    }
  },

  updateOutreachType: async (id: string, updates: Partial<OutreachType>) => {
    try {
      const { error } = await supabase
        .from('outreach_types')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      
      set(state => ({
        outreachTypes: state.outreachTypes.map(type => 
          type.id === id ? { ...type, ...updates } : type
        )
      }))
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  deleteOutreachType: async (id: string) => {
    try {
      const { error } = await supabase
        .from('outreach_types')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      set(state => ({
        outreachTypes: state.outreachTypes.filter(type => type.id !== id)
      }))
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  // Campaigns actions
  fetchCampaigns: async (workspaceId: string) => {
    try {
      const { data, error } = await supabase
        .from('outreach_campaigns')
        .select(`
          *, 
          outreach_types(name),
          lead_segments(name, color),
          campaign_attachments(*)
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ campaigns: data || [] })
    } catch (error: any) {
      console.warn('Failed to fetch campaigns:', error.message)
      set({ campaigns: [] })
    }
  },

  createCampaign: async (campaign: Partial<OutreachCampaign>) => {
    try {
      set({ loading: true, error: null })
      
      const { data, error } = await supabase
        .from('outreach_campaigns')
        .insert(campaign)
        .select()
        .single()

      if (error) throw error
      
      set(state => ({ campaigns: [data, ...state.campaigns] }))
      return data
    } catch (error: any) {
      set({ error: error.message })
      throw error
    } finally {
      set({ loading: false })
    }
  },

  updateCampaign: async (id: string, updates: Partial<OutreachCampaign>) => {
    try {
      const { error } = await supabase
        .from('outreach_campaigns')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      
      set(state => ({
        campaigns: state.campaigns.map(campaign => 
          campaign.id === id ? { ...campaign, ...updates } : campaign
        )
      }))
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  deleteCampaign: async (id: string) => {
    try {
      const { error } = await supabase
        .from('outreach_campaigns')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      set(state => ({
        campaigns: state.campaigns.filter(campaign => campaign.id !== id)
      }))
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  launchCampaign: async (id: string) => {
    try {
      set({ loading: true, error: null })
      
      // Update campaign status to running
      await get().updateCampaign(id, { status: 'running' })
      
      // Call Apps Script to start sending emails
      const { settings } = get()
      if (settings?.apps_script_url) {
        const response = await fetch(settings.apps_script_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'send_campaign_emails',
            campaign_id: id,
            api_key: settings.apps_script_api_key
          })
        })
        
        if (!response.ok) {
          throw new Error('Failed to start email sending')
        }
      }
    } catch (error: any) {
      set({ error: error.message })
    } finally {
      set({ loading: false })
    }
  },

  pauseCampaign: async (id: string) => {
    try {
      await get().updateCampaign(id, { status: 'paused' })
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  // Emails actions
  fetchEmails: async (workspaceId: string, campaignId?: string) => {
    try {
      let query = supabase
        .from('outreach_emails')
        .select('*, leads(name, email, company), outreach_campaigns(name)')
        .eq('workspace_id', workspaceId)

      if (campaignId) {
        query = query.eq('campaign_id', campaignId)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      set({ emails: data || [] })
    } catch (error: any) {
      console.warn('Failed to fetch emails:', error.message)
      set({ emails: [] })
    }
  },

  sendTestEmail: async (emailData: any) => {
    try {
      set({ loading: true, error: null })
      
      const { settings } = get()
      if (!settings?.apps_script_url) {
        throw new Error('Apps Script URL not configured')
      }

      const response = await fetch(settings.apps_script_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'send_single_email',
          ...emailData,
          api_key: settings.apps_script_api_key
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send test email')
      }
    } catch (error: any) {
      set({ error: error.message })
      throw error
    } finally {
      set({ loading: false })
    }
  },

  // CSV Import actions
  fetchCSVImports: async (workspaceId: string) => {
    try {
      const { data, error } = await supabase
        .from('csv_imports')
        .select('*, lead_segments(name)')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ csvImports: data || [] })
    } catch (error: any) {
      console.warn('Failed to fetch CSV imports:', error.message)
      set({ csvImports: [] })
    }
  },

  uploadCSV: async (file: File, workspaceId: string) => {
    try {
      set({ loading: true, error: null })
      
      const fileName = `${workspaceId}/${Date.now()}-${file.name}`
      
      const { data, error } = await supabase.storage
        .from('csv-imports')
        .upload(fileName, file)

      if (error) throw error
      
      const { data: urlData } = supabase.storage
        .from('csv-imports')
        .getPublicUrl(fileName)

      return urlData.publicUrl
    } catch (error: any) {
      set({ error: error.message })
      throw error
    } finally {
      set({ loading: false })
    }
  },

  processCSVImport: async (importData: any) => {
    try {
      set({ loading: true, error: null })
      
      const { data, error } = await supabase
        .from('csv_imports')
        .insert(importData)
        .select()
        .single()

      if (error) throw error
      
      set(state => ({ csvImports: [data, ...state.csvImports] }))
      return data
    } catch (error: any) {
      set({ error: error.message })
      throw error
    } finally {
      set({ loading: false })
    }
  },

  // Settings actions (OpenAI removed)
  fetchSettings: async (workspaceId: string) => {
    try {
      const { data, error } = await supabase
        .from('outreach_settings')
        .select('*')
        .eq('workspace_id', workspaceId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      set({ settings: data })
    } catch (error: any) {
      console.warn('Failed to fetch settings:', error.message)
      set({ settings: null })
    }
  },

  updateSettings: async (workspaceId: string, updates: Partial<OutreachSettings>) => {
    try {
      set({ loading: true, error: null })
      
      const { data, error } = await supabase
        .from('outreach_settings')
        .upsert({ workspace_id: workspaceId, ...updates })
        .select()
        .single()

      if (error) throw error
      set({ settings: data })
    } catch (error: any) {
      set({ error: error.message })
    } finally {
      set({ loading: false })
    }
  },

  // Analytics actions
  fetchAnalytics: async (workspaceId: string) => {
    try {
      const { leads, campaigns, emails } = get()
      
      const analytics: Analytics = {
        total_leads: leads.length,
        leads_by_status: leads.reduce((acc, lead) => {
          acc[lead.status] = (acc[lead.status] || 0) + 1
          return acc
        }, {} as Record<string, number>),
        leads_by_source: leads.reduce((acc, lead) => {
          acc[lead.source] = (acc[lead.source] || 0) + 1
          return acc
        }, {} as Record<string, number>),
        campaigns_count: campaigns.length,
        active_campaigns: campaigns.filter(c => c.status === 'running').length,
        total_emails_sent: emails.filter(e => e.status === 'sent').length,
        overall_open_rate: emails.length > 0 ? 
          (emails.filter(e => e.opened_at).length / emails.filter(e => e.status === 'sent').length) * 100 : 0,
        overall_click_rate: emails.length > 0 ? 
          (emails.filter(e => e.clicked_at).length / emails.filter(e => e.status === 'sent').length) * 100 : 0,
        overall_response_rate: emails.length > 0 ? 
          (emails.filter(e => e.replied_at).length / emails.filter(e => e.status === 'sent').length) * 100 : 0,
        conversion_rate: leads.length > 0 ? 
          (leads.filter(l => l.status === 'converted').length / leads.length) * 100 : 0,
        recent_activity: []
      }
      
      set({ analytics })
    } catch (error: any) {
      console.warn('Failed to fetch analytics:', error.message)
      set({ analytics: null })
    }
  }
}))

export default useOutreachStore
