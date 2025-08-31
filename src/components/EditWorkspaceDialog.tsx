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

export const EditWorkspaceDialog = ({ workspace, open, onOpenChange }: EditWorkspaceDialogProps) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('');
  const [color, setColor] = useState(WORKSPACE_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when workspace changes
  useEffect(() => {
    if (workspace && open) {
      setName(workspace.name || '');
      setDescription(workspace.description || '');
      setDepartment(workspace.department || '');
      setColor(workspace.color || WORKSPACE_COLORS[0]);
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
      `Are you sure you want to delete "${workspace.name}"? This action cannot be undone and will remove the workspace from all associated tasks.`
    );
    
    if (!confirmed) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // First, update all tasks in this workspace to have no workspace
      await supabase
        .from('tasks')
        .update({ workspace_id: null })
        .eq('workspace_id', workspace.id);

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
    setError(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  if (!workspace) {
    return null;
  }

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
        
        <form onSubmit={handleSubmit} className="space-y-6">
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
              This will remove the workspace from all associated tasks. This action cannot be undone.
            </p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
