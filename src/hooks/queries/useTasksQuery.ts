// React Query hooks for optimized task fetching with caching
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Task, User, Workspace, formatTaskFromSupabase } from '../../types';

// Query keys for cache management
export const taskKeys = {
    all: ['tasks'] as const,
    lists: () => [...taskKeys.all, 'list'] as const,
    list: (filters?: any) => [...taskKeys.lists(), filters] as const,
    details: () => [...taskKeys.all, 'detail'] as const,
    detail: (id: string) => [...taskKeys.details(), id] as const,
};

export const userKeys = {
    all: ['users'] as const,
    lists: () => [...userKeys.all, 'list'] as const,
    detail: (id: string) => [...userKeys.all, 'detail', id] as const,
};

export const workspaceKeys = {
    all: ['workspaces'] as const,
    lists: () => [...workspaceKeys.all, 'list'] as const,
    detail: (id: string) => [...workspaceKeys.all, 'detail', id] as const,
};

export const statsKeys = {
    dashboard: (userId: string) => ['stats', 'dashboard', userId] as const,
};

// Fetch tasks with optimized query
export const useTasksQuery = () => {
    return useQuery({
        queryKey: taskKeys.lists(),
        queryFn: async () => {
            console.log('🔄 React Query: Fetching tasks...');

            const { data, error } = await supabase
                .from('tasks')
                .select(`
          *,
          comments(
            id,
            content,
            author,
            created_at
          ),
          subtasks(
            id,
            title,
            completed,
            created_at
          ),
          task_tags(
            tag
          ),
          task_assignees(
            user_id
          )
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formattedTasks = (data || []).map(supabaseTask => {
                const formatted = formatTaskFromSupabase(supabaseTask);
                formatted.task_assignees = supabaseTask.task_assignees || [];
                return formatted;
            });

            console.log('✅ React Query: Tasks fetched:', formattedTasks.length);
            return formattedTasks;
        },
        staleTime: 30 * 1000, // Consider data fresh for 30 seconds
        gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
        refetchOnWindowFocus: false,
        refetchOnMount: false,
    });
};

// Fetch users with caching
export const useUsersQuery = () => {
    return useQuery({
        queryKey: userKeys.lists(),
        queryFn: async () => {
            console.log('🔄 React Query: Fetching users...');

            const { data, error } = await supabase
                .from('users')
                .select('id, name, email, role, department, avatar, created_at')
                .order('name');

            if (error) throw error;

            console.log('✅ React Query: Users fetched:', data?.length || 0);
            return data || [];
        },
        staleTime: 5 * 60 * 1000, // Users change infrequently, cache for 5 minutes
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
};

// Fetch workspaces with caching
export const useWorkspacesQuery = () => {
    return useQuery({
        queryKey: workspaceKeys.lists(),
        queryFn: async () => {
            console.log('🔄 React Query: Fetching workspaces...');

            const { data, error } = await supabase
                .from('workspaces')
                .select('*')
                .order('name');

            if (error) throw error;

            console.log('✅ React Query: Workspaces fetched:', data?.length || 0);
            return data || [];
        },
        staleTime: 5 * 60 * 1000, // Workspaces change infrequently
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
};

// Fetch dashboard stats with caching
export const useDashboardStatsQuery = (userId: string | undefined) => {
    return useQuery({
        queryKey: statsKeys.dashboard(userId || ''),
        queryFn: async () => {
            if (!userId) throw new Error('User ID required');

            console.log('🔄 React Query: Fetching dashboard stats...');

            const { data, error } = await supabase
                .rpc('get_dashboard_stats', { user_uuid: userId });

            if (error) throw error;

            console.log('✅ React Query: Dashboard stats fetched:', data);
            return data;
        },
        enabled: !!userId, // Only run query if userId is available
        staleTime: 30 * 1000, // Cache stats for 30 seconds
        gcTime: 2 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
};

// Create task mutation with optimistic updates
export const useCreateTaskMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newTask: any) => {
            const { data, error } = await supabase
                .from('tasks')
                .insert(newTask)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onMutate: async (newTask) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

            // Snapshot previous value
            const previousTasks = queryClient.getQueryData(taskKeys.lists());

            // Optimistically update cache
            queryClient.setQueryData(taskKeys.lists(), (old: Task[] = []) => {
                const optimisticTask = {
                    ...newTask,
                    id: `temp-${Date.now()}`,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };
                return [optimisticTask, ...old];
            });

            return { previousTasks };
        },
        onError: (err, newTask, context) => {
            // Rollback on error
            if (context?.previousTasks) {
                queryClient.setQueryData(taskKeys.lists(), context.previousTasks);
            }
        },
        onSuccess: () => {
            // Invalidate and refetch
            queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
            queryClient.invalidateQueries({ queryKey: statsKeys.dashboard('') });
        },
    });
};

// Update task mutation with optimistic updates
export const useUpdateTaskMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) => {
            const { data, error } = await supabase
                .from('tasks')
                .update(updates)
                .eq('id', taskId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onMutate: async ({ taskId, updates }) => {
            await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

            const previousTasks = queryClient.getQueryData(taskKeys.lists());

            queryClient.setQueryData(taskKeys.lists(), (old: Task[] = []) =>
                old.map(task => task.id === taskId ? { ...task, ...updates } : task)
            );

            return { previousTasks };
        },
        onError: (err, variables, context) => {
            if (context?.previousTasks) {
                queryClient.setQueryData(taskKeys.lists(), context.previousTasks);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
            queryClient.invalidateQueries({ queryKey: statsKeys.dashboard('') });
        },
    });
};

// Delete task mutation
export const useDeleteTaskMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (taskId: string) => {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', taskId);

            if (error) throw error;
        },
        onMutate: async (taskId) => {
            await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

            const previousTasks = queryClient.getQueryData(taskKeys.lists());

            queryClient.setQueryData(taskKeys.lists(), (old: Task[] = []) =>
                old.filter(task => task.id !== taskId)
            );

            return { previousTasks };
        },
        onError: (err, taskId, context) => {
            if (context?.previousTasks) {
                queryClient.setQueryData(taskKeys.lists(), context.previousTasks);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
            queryClient.invalidateQueries({ queryKey: statsKeys.dashboard('') });
        },
    });
};
