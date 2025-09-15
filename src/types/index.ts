// types/index.ts - Complete Homebase types with Chef Outreach and Outreach System

// ======================================
// CORE USER & WORKSPACE TYPES
// ======================================

// From your `users` table
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatar: string | null;
  created_at: string;
}

// From your `workspaces` table - UPDATED to support all workspace types
export interface Workspace {
  id: string;
  name: string;
  department: string;
  created_at: string;
  description: string | null;
  created_by: string;
  color: string;
  type: 'task_management' | 'chef_outreach' | 'outreach'; // Support for all workspace types
  updated_at: string;
}

// ======================================
// TASK MANAGEMENT TYPES (EXISTING)
// ======================================

// From your `comments` table
export interface Comment {
  id: string;
  task_id: string;
  author: string;
  content: string;
  created_at: string;
}

// From your `subtasks` table
export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

// Represents a fully assembled Task object in the application
export interface Task {
  // Columns from the `tasks` table
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  created_by: string;
  workspace_id: string | null;
  created_at: string;
  updated_at: string;
  
  // Data loaded from related tables
  assignees: string[]; // From `task_assignees` - formatted as array of user IDs
  tags: string[];      // From `task_tags`
  subtasks: Subtask[]; // From `subtasks`
  comments: Comment[]; // From `comments`
  
  // Raw assignment data for filtering (preserve original Supabase structure)
  task_assignees?: Array<{ user_id: string }>; // Raw data from Supabase join
}

// Dashboard stats interface
export interface DashboardStats {
  total_tasks: number;
  todo_tasks: number;
  in_progress_tasks: number;
  done_tasks: number;
  overdue_tasks: number;
  due_today: number;
  high_priority: number;
  my_tasks: number;
  my_created_tasks: number;
}

// ======================================
// CHEF OUTREACH TYPES
// ======================================

// From the `chefs` table
export interface Chef {
  id: string;
  name: string;
  city?: string;
  phone?: string;
  email?: string;
  status: ChefStatus;
  progress_steps: ProgressSteps;
  notes?: string;
  workspace_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  outreach_logs?: OutreachLog[]; // Related outreach logs
}

// Chef status enum
export type ChefStatus = 'not_started' | 'in_progress' | 'interested_not_now' | 'not_interested';

// Progress steps for chef onboarding
export interface ProgressSteps {
  kvk_obtained?: boolean;
  eh_herkenning_setup?: boolean;
  profile_created?: boolean;
  menu_uploaded?: boolean;
  menu_pictures_added?: boolean;
  training_completed?: boolean;
  launch_ready?: boolean;
}

// From the `outreach_logs` table
export interface OutreachLog {
  id: string;
  chef_id: string;
  outreach_date: string;
  contact_method: ContactMethod;
  response_type?: ResponseType;
  follow_up_date?: string;
  notes?: string;
  workspace_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  chef?: Chef; // Related chef data
}

// Contact method enum
export type ContactMethod = 'phonecall' | 'videocall' | 'text' | 'email';

// Response type enum
export type ResponseType = 'interested' | 'no_response' | 'asked_to_contact_later' | 'not_interested';

// Chef statistics interface
export interface ChefStats {
  total: number;
  not_started: number;
  in_progress: number;
  interested_not_now: number;
  not_interested: number;
}

// Chef creation data
export interface CreateChefData {
  name: string;
  city?: string;
  phone?: string;
  email?: string;
  status?: ChefStatus;
  notes?: string;
  workspace_id: string;
}

// Chef update data
export interface UpdateChefData {
  name?: string;
  city?: string;
  phone?: string;
  email?: string;
  status?: ChefStatus;
  progress_steps?: Partial<ProgressSteps>;
  notes?: string;
}

// Outreach log creation data
export interface CreateOutreachLogData {
  chef_id: string;
  outreach_date: string;
  contact_method: ContactMethod;
  response_type?: ResponseType;
  follow_up_date?: string;
  notes?: string;
  workspace_id: string;
}

// Outreach log update data
export interface UpdateOutreachLogData {
  outreach_date?: string;
  contact_method?: ContactMethod;
  response_type?: ResponseType;
  follow_up_date?: string;
  notes?: string;
}

// ======================================
// OUTREACH SYSTEM TYPES (NEW)
// ======================================

// Lead management
export interface Lead {
  id: string;
  name: string;
  email: string;
  company?: string;
  position?: string;
  industry?: string;
  phone?: string;
  website?: string;
  linkedin_url?: string;
  twitter_url?: string;
  instagram_url?: string;
  location?: string;
  company_size?: string;
  revenue_range?: string;
  lead_score: number;
  status: 'new' | 'contacted' | 'responded' | 'qualified' | 'converted' | 'dead';
  source: string;
  notes?: string;
  research_data?: any;
  custom_fields?: any;
  segment_id?: string;
  created_by: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
  last_contacted_at?: string;
}

// Lead segmentation
export interface LeadSegment {
  id: string;
  name: string;
  description?: string;
  color: string;
  created_by: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
}

// Outreach types for categorization
export interface OutreachType {
  id: string;
  name: string;
  description?: string;
  color: string;
  created_by: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
}

// Email campaigns
export interface OutreachCampaign {
  id: string;
  name: string;
  description?: string;
  outreach_type_id?: string;
  segment_id?: string;
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed';
  subject_line: string;
  email_template: string;
  scheduled_at?: string;
  send_immediately: boolean;
  created_by: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
  settings: any;
}

// Campaign attachments
export interface CampaignAttachment {
  id: string;
  campaign_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  created_at: string;
}

// Email tracking
export interface OutreachEmail {
  id: string;
  campaign_id: string;
  lead_id: string;
  subject: string;
  content: string;
  status: 'pending' | 'sent' | 'delivered' | 'bounced' | 'failed';
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  replied_at?: string;
  bounced_at?: string;
  unsubscribed_at?: string;
  created_by: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
}

// AI Deep Research
export interface DeepResearchJob {
  id: string;
  name: string;
  search_criteria: any;
  research_prompt?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  openai_response_id?: string;
  total_leads_found: number;
  leads_imported: number;
  target_segment_id?: string;
  research_output?: string;
  leads_data?: any[];
  error_message?: string;
  created_by: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  settings: any;
}

// Research templates
export interface ResearchTemplate {
  id: string;
  name: string;
  description?: string;
  industry: string;
  prompt_template: string;
  default_fields: string[];
  created_by: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
}

// CSV Import tracking
export interface CSVImport {
  id: string;
  file_name: string;
  total_rows: number;
  processed_rows: number;
  successful_imports: number;
  failed_imports: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  field_mapping: any;
  error_log?: any;
  target_segment_id?: string;
  created_by: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

// Lead activities/history
export interface LeadActivity {
  id: string;
  lead_id: string;
  activity_type: 'created' | 'updated' | 'email_sent' | 'email_opened' | 'email_clicked' | 'email_replied' | 'note_added' | 'status_changed';
  activity_data: any;
  created_by: string;
  workspace_id: string;
  created_at: string;
}

// Outreach settings
export interface OutreachSettings {
  id: string;
  workspace_id: string;
  sender_name?: string;
  sender_email?: string;
  reply_to_email?: string;
  apps_script_url?: string;
  apps_script_api_key?: string;
  openai_api_key?: string;
  preferred_research_model?: string;
  max_research_cost_per_job?: number;
  default_research_settings?: any;
  auto_follow_up?: boolean;
  follow_up_delay_days?: number;
  max_follow_ups?: number;
  auto_pause_campaigns?: boolean;
  daily_email_limit?: number;
  webhook_url?: string;
  custom_tracking_domain?: string;
  enable_click_tracking?: boolean;
  enable_open_tracking?: boolean;
  timezone?: string;
  created_at: string;
  updated_at: string;
}

// ======================================
// CONFIGURATION OBJECTS
// ======================================

// Chef status display configurations
export const CHEF_STATUS_CONFIG: Record<ChefStatus, { label: string; color: string; bgColor: string }> = {
  not_started: {
    label: 'Not Started',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100'
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100'
  },
  interested_not_now: {
    label: 'Interested but not now',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100'
  },
  not_interested: {
    label: 'Not Interested',
    color: 'text-red-700',
    bgColor: 'bg-red-100'
  }
};

// Contact method display configurations
export const CONTACT_METHOD_CONFIG: Record<ContactMethod, { label: string; color: string }> = {
  phonecall: { label: 'Phone Call', color: 'bg-purple-100 text-purple-800' },
  videocall: { label: 'Video Call', color: 'bg-blue-100 text-blue-800' },
  text: { label: 'Text', color: 'bg-green-100 text-green-800' },
  email: { label: 'Email', color: 'bg-gray-100 text-gray-800' }
};

// Response type display configurations
export const RESPONSE_TYPE_CONFIG: Record<ResponseType, { label: string; color: string }> = {
  interested: { label: 'Interested', color: 'bg-green-100 text-green-800' },
  no_response: { label: 'No Response', color: 'bg-gray-100 text-gray-800' },
  asked_to_contact_later: { label: 'Asked to Contact Later', color: 'bg-yellow-100 text-yellow-800' },
  not_interested: { label: 'Not Interested', color: 'bg-red-100 text-red-800' }
};

// Progress steps configuration
export const PROGRESS_STEPS_CONFIG: Record<keyof ProgressSteps, string> = {
  kvk_obtained: 'KVK Obtained',
  eh_herkenning_setup: 'EH-Herkenning Setup',
  profile_created: 'Profile Created',
  menu_uploaded: 'Menu Uploaded',
  menu_pictures_added: 'Menu Pictures Added',
  training_completed: 'Training Completed',
  launch_ready: 'Launch Ready'
};

// Workspace type configurations
export const WORKSPACE_TYPE_CONFIG = {
  task_management: {
    name: 'Task Management',
    description: 'Manage tasks, projects, and team collaboration',
    icon: 'CheckSquare',
    color: 'bg-blue-100 text-blue-700'
  },
  chef_outreach: {
    name: 'Chef Outreach',
    description: 'Manage chef recruitment, outreach, and onboarding',
    icon: 'Users',
    color: 'bg-orange-100 text-orange-700'
  },
  outreach: {
    name: 'Lead Outreach',
    description: 'AI-powered lead generation and email campaigns',
    icon: 'Mail',
    color: 'bg-green-100 text-green-700'
  }
};

// Lead status configurations
export const LEAD_STATUS_CONFIG = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-800' },
  contacted: { label: 'Contacted', color: 'bg-yellow-100 text-yellow-800' },
  responded: { label: 'Responded', color: 'bg-purple-100 text-purple-800' },
  qualified: { label: 'Qualified', color: 'bg-green-100 text-green-800' },
  converted: { label: 'Converted', color: 'bg-emerald-100 text-emerald-800' },
  dead: { label: 'Dead', color: 'bg-gray-100 text-gray-800' }
};

// Campaign status configurations
export const CAMPAIGN_STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
  running: { label: 'Running', color: 'bg-green-100 text-green-800' },
  paused: { label: 'Paused', color: 'bg-yellow-100 text-yellow-800' },
  completed: { label: 'Completed', color: 'bg-purple-100 text-purple-800' }
};

// ======================================
// UTILITY FUNCTIONS
// ======================================

// Safe date parsing utilities
const safeParseDate = (dateValue: any): string => {
  if (!dateValue) return new Date().toISOString();
  if (typeof dateValue === 'string') {
    if (dateValue.trim() === '' || dateValue === '0000-00-00' || dateValue === 'null') {
      return new Date().toISOString();
    }
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date value: "${dateValue}", using current time`);
      return new Date().toISOString();
    }
    return dateValue;
  }
  return new Date().toISOString();
};

const safeParseDueDate = (dateValue: any): string | null => {
  if (!dateValue) return null;
  if (typeof dateValue === 'string') {
    if (dateValue.trim() === '' || dateValue === '0000-00-00' || dateValue === 'null') {
      return null;
    }
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      console.warn(`Invalid due date: "${dateValue}"`);
      return null;
    }
    return dateValue;
  }
  return null;
};

// Task formatting function
export const formatTaskFromSupabase = (supabaseTask: any): Task => {
  return {
    id: supabaseTask.id,
    title: supabaseTask.title || '',
    description: supabaseTask.description || null,
    due_date: safeParseDueDate(supabaseTask.due_date),
    priority: supabaseTask.priority,
    status: supabaseTask.status,
    created_by: supabaseTask.created_by,
    workspace_id: supabaseTask.workspace_id || null,
    created_at: safeParseDate(supabaseTask.created_at),
    updated_at: safeParseDate(supabaseTask.updated_at),
    
    assignees: (supabaseTask.task_assignees || []).map((ta: any) => ta.user_id),
    tags: (supabaseTask.task_tags || []).map((tt: any) => tt.tag),
    subtasks: supabaseTask.subtasks || [],
    comments: (supabaseTask.comments || []).map((comment: any) => ({
      ...comment,
      created_at: safeParseDate(comment.created_at)
    })),
    
    task_assignees: undefined // Will be populated by useTaskStore.fetchTasks()
  };
};

// Chef formatting function
export const formatChefFromSupabase = (supabaseChef: any): Chef => {
  return {
    id: supabaseChef.id,
    name: supabaseChef.name || '',
    city: supabaseChef.city || undefined,
    phone: supabaseChef.phone || undefined,
    email: supabaseChef.email || undefined,
    status: supabaseChef.status || 'not_started',
    progress_steps: supabaseChef.progress_steps || {},
    notes: supabaseChef.notes || undefined,
    workspace_id: supabaseChef.workspace_id,
    created_by: supabaseChef.created_by,
    created_at: safeParseDate(supabaseChef.created_at),
    updated_at: safeParseDate(supabaseChef.updated_at),
    outreach_logs: supabaseChef.outreach_logs || []
  };
};

// Outreach log formatting function
export const formatOutreachLogFromSupabase = (supabaseLog: any): OutreachLog => {
  return {
    id: supabaseLog.id,
    chef_id: supabaseLog.chef_id,
    outreach_date: supabaseLog.outreach_date,
    contact_method: supabaseLog.contact_method,
    response_type: supabaseLog.response_type || undefined,
    follow_up_date: supabaseLog.follow_up_date || undefined,
    notes: supabaseLog.notes || undefined,
    workspace_id: supabaseLog.workspace_id,
    created_by: supabaseLog.created_by,
    created_at: safeParseDate(supabaseLog.created_at),
    updated_at: safeParseDate(supabaseLog.updated_at),
    chef: supabaseLog.chef ? formatChefFromSupabase(supabaseLog.chef) : undefined
  };
};

// Lead formatting function
export const formatLeadFromSupabase = (supabaseLead: any): Lead => {
  return {
    id: supabaseLead.id,
    name: supabaseLead.name || '',
    email: supabaseLead.email || '',
    company: supabaseLead.company || undefined,
    position: supabaseLead.position || undefined,
    industry: supabaseLead.industry || undefined,
    phone: supabaseLead.phone || undefined,
    website: supabaseLead.website || undefined,
    linkedin_url: supabaseLead.linkedin_url || undefined,
    twitter_url: supabaseLead.twitter_url || undefined,
    instagram_url: supabaseLead.instagram_url || undefined,
    location: supabaseLead.location || undefined,
    company_size: supabaseLead.company_size || undefined,
    revenue_range: supabaseLead.revenue_range || undefined,
    lead_score: supabaseLead.lead_score || 0,
    status: supabaseLead.status || 'new',
    source: supabaseLead.source || 'manual',
    notes: supabaseLead.notes || undefined,
    research_data: supabaseLead.research_data || undefined,
    custom_fields: supabaseLead.custom_fields || undefined,
    segment_id: supabaseLead.segment_id || undefined,
    created_by: supabaseLead.created_by,
    workspace_id: supabaseLead.workspace_id,
    created_at: safeParseDate(supabaseLead.created_at),
    updated_at: safeParseDate(supabaseLead.updated_at),
    last_contacted_at: supabaseLead.last_contacted_at || undefined
  };
};

// Calculate follow-up date based on response type
export const calculateFollowUpDate = (responseType: ResponseType): string => {
  const today = new Date();
  let followUpDate = new Date(today);
  
  switch (responseType) {
    case 'interested':
    case 'no_response':
      followUpDate.setDate(today.getDate() + 7);
      break;
    case 'asked_to_contact_later':
      followUpDate.setDate(today.getDate() + 14);
      break;
    case 'not_interested':
      return '';
    default:
      followUpDate.setDate(today.getDate() + 7);
  }
  
  return followUpDate.toISOString().split('T')[0];
};

// Get progress percentage for a chef
export const getChefProgressPercentage = (progressSteps: ProgressSteps): number => {
  const totalSteps = Object.keys(PROGRESS_STEPS_CONFIG).length;
  const completedSteps = Object.values(progressSteps || {}).filter(Boolean).length;
  return Math.round((completedSteps / totalSteps) * 100);
};

// Date utility functions
export const isToday = (dateString: string): boolean => {
  const today = new Date().toISOString().split('T')[0];
  return dateString === today;
};

export const isPastDate = (dateString: string): boolean => {
  const today = new Date().toISOString().split('T')[0];
  return dateString < today;
};

export const formatDisplayDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString();
};

// Get upcoming follow-ups within a date range
export const getUpcomingFollowUps = (logs: OutreachLog[], days: number = 7): OutreachLog[] => {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + days);
  
  const todayString = today.toISOString().split('T')[0];
  const futureDateString = futureDate.toISOString().split('T')[0];
  
  return logs.filter(log => 
    log.follow_up_date && 
    log.follow_up_date >= todayString && 
    log.follow_up_date <= futureDateString
  ).sort((a, b) => 
    new Date(a.follow_up_date!).getTime() - new Date(b.follow_up_date!).getTime()
  );
};
