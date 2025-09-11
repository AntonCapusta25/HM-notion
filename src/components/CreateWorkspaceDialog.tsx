import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CheckSquare, Users } from 'lucide-react';

interface CreateWorkspaceDialogProps {
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
    icon: CheckSquare,
    defaultColor: '#3B82F6'
  },
  {
    id: 'chef_outreach',
    name: 'Chef Outreach',
    description: 'Manage chef recruitment, outreach, and onboarding',
    icon: Users,
    defaultColor: '#F97316'
  }
];

export const CreateWorkspaceDialog = ({ open, onOpenChange }: CreateWorkspaceDialogProps) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('');
  const [color, setColor] = useState(WORKSPACE_COLORS[0]);
  const [type, setType] = useState('task_management'); // NEW: Workspace type state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // NEW: Update color when type changes
  const handleTypeChange = (newType: string) => {
    setType(newType);
    const typeConfig = WORKSPACE_TYPES.find(t => t.id === newType);
    if (typeConfig) {
      setColor(typeConfig.defaultColor);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to create workspaces');
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
      const { data, error: insertError } = await supabase
        .from('workspaces')
        .insert([{
          name: name.trim(),
          description: description.trim(),
          department,
          color,
          type, // NEW: Include workspace type
          created_by: user.id,
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // Success - close dialog and reset form
      onOpenChange(false);
      resetForm();
      
      // Optionally trigger a refresh of the workspaces list
      window.location.reload(); // Simple approach - could be improved with state management
      
    } catch (err: any) {
      console.error('Error creating workspace:', err);
      setError('Failed to create workspace. Please try again.');
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Workspace</DialogTitle>
        </DialogHeader>
        
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
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
                    onClick={() => handleTypeChange(workspaceType.id)}
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
              {isSubmitting ? 'Creating Workspace...' : 'Create Workspace'}
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
        </form>
      </DialogContent>
    </Dialog>
  );
};
