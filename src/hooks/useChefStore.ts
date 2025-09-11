
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { 
  Chef, 
  OutreachLog, 
  CreateChefData, 
  UpdateChefData, 
  CreateOutreachLogData, 
  UpdateOutreachLogData, 
  ChefStats 
} from '@/types/chef';

interface ChefStore {
  // State
  chefs: Chef[];
  outreachLogs: OutreachLog[];
  loading: boolean;
  error: string | null;
  
  // Chef actions
  fetchChefs: (workspaceId: string) => Promise<void>;
  createChef: (data: CreateChefData) => Promise<Chef>;
  updateChef: (id: string, data: UpdateChefData) => Promise<Chef>;
  deleteChef: (id: string) => Promise<void>;
  getChefStats: (workspaceId: string) => ChefStats;
  
  // Outreach log actions
  fetchOutreachLogs: (workspaceId: string) => Promise<void>;
  createOutreachLog: (data: CreateOutreachLogData) => Promise<OutreachLog>;
  updateOutreachLog: (id: string, data: UpdateOutreachLogData) => Promise<OutreachLog>;
  deleteOutreachLog: (id: string) => Promise<void>;
  getOutreachLogsForChef: (chefId: string) => OutreachLog[];
  
  // Utility actions
  clearError: () => void;
  getFollowUpDate: (responseType: string) => string;
}

export const useChefStore = create<ChefStore>((set, get) => ({
  // Initial state
  chefs: [],
  outreachLogs: [],
  loading: false,
  error: null,

  // Chef actions
  fetchChefs: async (workspaceId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('chefs')
        .select(`
          *,
          outreach_logs (*)
        `)
        .eq('workspace_id', workspaceId)
        .order('name');

      if (error) throw error;
      
      set({ chefs: data || [], loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createChef: async (data: CreateChefData) => {
    set({ loading: true, error: null });
    try {
      const { data: chef, error } = await supabase
        .from('chefs')
        .insert([{
          ...data,
          created_by: (await supabase.auth.getUser()).data.user?.id,
          progress_steps: {}
        }])
        .select()
        .single();

      if (error) throw error;

      set(state => ({ 
        chefs: [...state.chefs, chef],
        loading: false 
      }));
      
      return chef;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateChef: async (id: string, data: UpdateChefData) => {
    set({ loading: true, error: null });
    try {
      const { data: chef, error } = await supabase
        .from('chefs')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      set(state => ({
        chefs: state.chefs.map(c => c.id === id ? chef : c),
        loading: false
      }));
      
      return chef;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteChef: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('chefs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        chefs: state.chefs.filter(c => c.id !== id),
        outreachLogs: state.outreachLogs.filter(log => log.chef_id !== id),
        loading: false
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  getChefStats: (workspaceId: string) => {
    const { chefs } = get();
    const workspaceChefs = chefs.filter(chef => chef.workspace_id === workspaceId);
    
    return {
      total: workspaceChefs.length,
      not_started: workspaceChefs.filter(c => c.status === 'not_started').length,
      in_progress: workspaceChefs.filter(c => c.status === 'in_progress').length,
      interested_not_now: workspaceChefs.filter(c => c.status === 'interested_not_now').length,
      not_interested: workspaceChefs.filter(c => c.status === 'not_interested').length,
    };
  },

  // Outreach log actions
  fetchOutreachLogs: async (workspaceId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('outreach_logs')
        .select(`
          *,
          chef:chefs (*)
        `)
        .eq('workspace_id', workspaceId)
        .order('outreach_date', { ascending: false });

      if (error) throw error;
      
      set({ outreachLogs: data || [], loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createOutreachLog: async (data: CreateOutreachLogData) => {
    set({ loading: true, error: null });
    try {
      // Auto-calculate follow-up date if response type is provided
      let followUpDate = data.follow_up_date;
      if (data.response_type && !followUpDate) {
        followUpDate = get().getFollowUpDate(data.response_type);
      }

      const { data: log, error } = await supabase
        .from('outreach_logs')
        .insert([{
          ...data,
          follow_up_date: followUpDate,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select(`
          *,
          chef:chefs (*)
        `)
        .single();

      if (error) throw error;

      set(state => ({ 
        outreachLogs: [log, ...state.outreachLogs],
        loading: false 
      }));
      
      return log;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateOutreachLog: async (id: string, data: UpdateOutreachLogData) => {
    set({ loading: true, error: null });
    try {
      const { data: log, error } = await supabase
        .from('outreach_logs')
        .update(data)
        .eq('id', id)
        .select(`
          *,
          chef:chefs (*)
        `)
        .single();

      if (error) throw error;

      set(state => ({
        outreachLogs: state.outreachLogs.map(l => l.id === id ? log : l),
        loading: false
      }));
      
      return log;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteOutreachLog: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('outreach_logs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        outreachLogs: state.outreachLogs.filter(l => l.id !== id),
        loading: false
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  getOutreachLogsForChef: (chefId: string) => {
    const { outreachLogs } = get();
    return outreachLogs.filter(log => log.chef_id === chefId);
  },

  // Utility actions
  clearError: () => set({ error: null }),

  getFollowUpDate: (responseType: string) => {
    const today = new Date();
    let followUpDate = new Date(today);
    
    switch (responseType) {
      case 'interested':
      case 'no_response':
        // 1 week follow-up
        followUpDate.setDate(today.getDate() + 7);
        break;
      case 'asked_to_contact_later':
        // Default to 2 weeks, but should be manually set
        followUpDate.setDate(today.getDate() + 14);
        break;
      case 'not_interested':
        // No follow-up needed
        return '';
      default:
        followUpDate.setDate(today.getDate() + 7);
    }
    
    return followUpDate.toISOString().split('T')[0];
  }
}));
