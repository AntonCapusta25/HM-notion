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
import { CheckSquare, Users, Mail, Brain } from 'lucide-react';

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

// Updated workspace type configurations with outreach support
const WORKSPACE_TYPES = [
  {
    id: 'task_management',
    name: 'Task Management',
    description: 'Manage tasks, projects, and team collaboration',
    icon: CheckSquare,
    defaultColor: '#3B82F6',
    features: ['Task tracking', 'Team collaboration', 'Project management', 'Progress monitoring']
  },
  {
    id: 'chef_outreach',
    name: 'Chef Outreach',
    description: 'Manage chef recruitment, outreach, and onboarding',
    icon: Users,
    defaultColor: '#F97316',
    features: ['Chef database', 'Recruitment tracking', 'Progress monitoring', 'Communication logs']
  },
  {
    id: 'outreach',
    name: 'Lead Outreach',
    description: 'AI-powered lead generation and email campaigns',
    icon: Mail,
    defaultColor: '#10B981',
    features: ['AI lead research', 'Email campaigns', 'Lead segmentation', 'Analytics dashboard']
  }
];

export const CreateWorkspaceDialog = ({ open, onOpenChange }: CreateWorkspaceDialogProps) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('');
  const [color, setColor] = useState(WORKSPACE_COLORS[0]);
  const [type, setType] = useState('task_management');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update color when type changes
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
          type,
          created_by: user.id,
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // Success - close dialog and reset form
      onOpenChange(false);
      resetForm();
      
      // Trigger a refresh of the workspaces list
      window.location.reload();
      
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
    setType('task_management');
    setError(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  const selectedWorkspaceType = WORKSPACE_TYPES.find(t => t.id === type);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Workspace</DialogTitle>
        </DialogHeader>
        
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Workspace Type Selection */}
          <div className="space-y-3">
            <Label>Workspace Type</Label>
            <div className="grid grid-cols-1 gap-3">
              {WORKSPACE_TYPES.map((workspaceType) => {
                const Icon = workspaceType.icon;
                return (
                  <button
                    key={workspaceType.id}
                    type="button"
                    onClick={() => handleTypeChange(workspaceType.id)}
                    className={`flex items-start gap-4 p-4 border-2 rounded-lg text-left transition-all ${
                      type === workspaceType.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    disabled={isSubmitting}
                  >
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                      style={{ backgroundColor: workspaceType.defaultColor }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 mb-1">{workspaceType.name}</div>
                      <div className="text-sm text-gray-600 mb-2">{workspaceType.description}</div>
                      <div className="flex flex-wrap gap-1">
                        {workspaceType.features.map((feature, index) => (
                          <span 
                            key={index}
                            className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                    {type === workspaceType.id && (
                      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Type Summary */}
          {selectedWorkspaceType && (
            <div className="bg-gray-50 border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <selectedWorkspaceType.icon className="h-5 w-5" style={{ color: selectedWorkspaceType.defaultColor }} />
                <span className="font-medium">Selected: {selectedWorkspaceType.name}</span>
              </div>
              <p className="text-sm text-gray-600">{selectedWorkspaceType.description}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Workspace Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Enter ${selectedWorkspaceType?.name.toLowerCase()} workspace name...`}
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
              placeholder="Describe this workspace and its purpose..."
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

          {/* Workspace Type Specific Information */}
          {type === 'outreach' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Brain className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-800">AI-Powered Outreach</h4>
                  <p className="text-sm text-green-700 mt-1">
                    This workspace includes OpenAI integration for deep research, automated lead generation, 
                    and intelligent email campaigns. You'll need to configure your API keys in workspace settings.
                  </p>
                </div>
              </div>
            </div>
          )}

          {type === 'chef_outreach' && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Users className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-orange-800">Chef Recruitment System</h4>
                  <p className="text-sm text-orange-700 mt-1">
                    Specialized workspace for managing chef outreach, recruitment tracking, 
                    onboarding progress, and communication logs with potential chef partners.
                  </p>
                </div>
              </div>
            </div>
          )}

          {type === 'task_management' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <CheckSquare className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-800">Team Collaboration</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Traditional project management workspace for task tracking, team collaboration, 
                    and progress monitoring across your team and projects.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button 
              type="submit" 
              className="flex-1 bg-homemade-orange hover:bg-homemade-orange-dark"
              disabled={isSubmitting || !name.trim() || !department}
            >
              {isSubmitting ? 'Creating Workspace...' : `Create ${selectedWorkspaceType?.name} Workspace`}
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
