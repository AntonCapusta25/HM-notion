import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Workspace } from '../types';
import { CheckSquare, Users, AlertTriangle } from 'lucide-react';

interface EditWorkspaceDialogProps {
  workspace: Workspace | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WORKSPACE_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
];

const DEPARTMENTS = [
  'Engineering',
  'Design',
  'Marketing',
  'Sales',
  'Product',
  'Operations',
  'Finance',
  'HR',
  'Customer Success',
  'Other'
];

// NEW: Workspace type configurations
const WORKSPACE_TYPES = [
  {
    id: 'task_management',
    name: 'Task Management',
    description: 'Manage tasks, projects, and team collaboration',
    icon: CheckSquare
  },
  {
    id: 'chef_outreach',
    name: 'Chef Outreach',
    description: 'Manage chef recruitment, outreach, and onboarding',
    icon: Users
  }
];

export const EditWorkspaceDialog = ({ workspace, open, onOpenChange }: EditWorkspaceDialogProps) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('');
  const [color, setColor] = useState(WORKSPACE_COLORS[0]);
  const [type, setType] = useState('task_management'); // NEW: Workspace type state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when workspace changes
  useEffect(() => {
    if (workspace && open) {
      setName(workspace.name || '');
      setDescription(workspace.description || '');
      setDepartment(workspace.department || '');
      setColor(workspace.color || WORKSPACE_COLORS[0]);
      setType(workspace.type || 'task_management'); // NEW: Set workspace type
      setError(null);
    }
  }, [workspace, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !workspace) {
      setError('Unable to update workspace');
      return;
    }

    if (!name.trim()) {
      setError('Workspace name is required');
      return;
    }

    if (!department) {
      setError('Please select a department');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('workspaces')
        .update({
          name: name.trim(),
          description: description.trim(),
          department,
          color,
          type, // NEW: Include workspace type in update
          updated_at: new Date().toISOString(),
        })
        .eq('id', workspace.id);

      if (updateError) throw updateError;

      // Success - close dialog
      onOpenChange(false);
      
      // Trigger a refresh of the workspaces list
      window.location.reload(); // Simple approach - could be improved with state management
      
    } catch (err: any) {
      console.error('Error updating workspace:', err);
      setError('Failed to update workspace. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!workspace || !user) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete "${workspace.name}"? This action cannot be undone and will remove the workspace and all its data.`
    );
    
    if (!confirmed) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Handle deletion based on workspace type
      if (workspace.type === 'chef_outreach') {
        // Delete chef outreach data first
        await supabase
          .from('outreach_logs')
          .delete()
          .eq('workspace_id', workspace.id);
        
        await supabase
          .from('chefs')
          .delete()
          .eq('workspace_id', workspace.id);
      } else {
        // Handle task management workspace deletion
        await supabase
          .from('tasks')
          .update({ workspace_id: null })
          .eq('workspace_id', workspace.id);
      }

      // Then delete the workspace
      const { error: deleteError } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', workspace.id);

      if (deleteError) throw deleteError;

      // Success - close dialog and refresh
      onOpenChange(false);
      window.location.reload();
      
    } catch (err: any) {
      console.error('Error deleting workspace:', err);
      setError('Failed to delete workspace. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setDepartment('');
    setColor(WORKSPACE_COLORS[0]);
    setType('task_management'); // NEW: Reset type
    setError(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  if (!workspace) {
    return null;
  }

  // NEW: Check if type is changing to show warning
  const isTypeChanging = workspace.type !== type;
  const currentTypeConfig = WORKSPACE_TYPES.find(t => t.id === workspace.type);
  const newTypeConfig = WORKSPACE_TYPES.find(t => t.id === type);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Workspace: {workspace.name}</DialogTitle>
        </DialogHeader>
        
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* NEW: Warning for type changes */}
        {isTypeChanging && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Changing workspace type from {currentTypeConfig?.name} to {newTypeConfig?.name} 
              may affect how data is displayed and managed. Existing data will be preserved.
            </AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* NEW: Workspace Type Selection */}
          <div className="space-y-2">
            <Label>Workspace Type</Label>
            <div className="grid grid-cols-1 gap-3">
              {WORKSPACE_TYPES.map((workspaceType) => {
                const Icon = workspaceType.icon;
                return (
                  <button
                    key={workspaceType.id}
                    type="button"
                    onClick={() => setType(workspaceType.id)}
                    className={`flex items-start gap-3 p-4 border-2 rounded-lg text-left transition-colors ${
                      type === workspaceType.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    disabled={isSubmitting}
                  >
                    <Icon className="h-6 w-6 text-gray-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-900">{workspaceType.name}</div>
                      <div className="text-sm text-gray-500">{workspaceType.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Workspace Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter workspace name..."
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this workspace..."
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label>Department</Label>
            <Select value={department} onValueChange={setDepartment} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map(dept => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Color Theme</Label>
            <div className="flex gap-2 flex-wrap">
              {WORKSPACE_COLORS.map(colorOption => (
                <button
                  key={colorOption}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === colorOption ? 'border-gray-800 scale-110' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: colorOption }}
                  onClick={() => setColor(colorOption)}
                  disabled={isSubmitting}
                />
              ))}
            </div>
            <p className="text-sm text-gray-500">
              This color will be used to identify the workspace throughout the app
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              type="submit" 
              className="flex-1 bg-homemade-orange hover:bg-homemade-orange-dark"
              disabled={isSubmitting || !name.trim() || !department}
            >
              {isSubmitting ? 'Updating...' : 'Update Workspace'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>

          <div className="border-t pt-4">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? 'Deleting...' : 'Delete Workspace'}
            </Button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              This will permanently delete the workspace and all its data. This action cannot be undone.
            </p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
