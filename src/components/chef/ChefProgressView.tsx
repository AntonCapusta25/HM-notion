
import React, { useState, useEffect } from 'react';
import { useChefStore } from '@/stores/useChefStore';
import { Chef, ProgressSteps, PROGRESS_STEPS_CONFIG } from '@/types/chef';
import { Check, X, Clock, Plus } from 'lucide-react';

interface ChefProgressViewProps {
  workspaceId: string;
}

export const ChefProgressView: React.FC<ChefProgressViewProps> = ({ workspaceId }) => {
  const { chefs, loading, fetchChefs, updateChef } = useChefStore();
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchChefs(workspaceId);
  }, [workspaceId, fetchChefs]);

  const handleStepToggle = async (chef: Chef, stepKey: keyof ProgressSteps) => {
    const currentSteps = chef.progress_steps || {};
    const newSteps = {
      ...currentSteps,
      [stepKey]: !currentSteps[stepKey]
    };
    
    await updateChef(chef.id, { progress_steps: newSteps });
  };

  const getCompletedStepsCount = (progressSteps: ProgressSteps) => {
    return Object.values(progressSteps || {}).filter(Boolean).length;
  };

  const getTotalStepsCount = () => {
    return Object.keys(PROGRESS_STEPS_CONFIG).length;
  };

  const getProgressPercentage = (progressSteps: ProgressSteps) => {
    const completed = getCompletedStepsCount(progressSteps);
    const total = getTotalStepsCount();
    return Math.round((completed / total) * 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage === 100) return 'bg-green-500';
    if (percentage >= 70) return 'bg-blue-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-gray-300';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Chef Progress Tracker</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          New Chef
        </button>
      </div>

      {/* Progress Overview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{chefs.length}</div>
            <div className="text-sm text-gray-500">Total Chefs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {chefs.filter(chef => getProgressPercentage(chef.progress_steps) === 100).length}
            </div>
            <div className="text-sm text-gray-500">Fully Ready</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {chefs.filter(chef => {
                const percentage = getProgressPercentage(chef.progress_steps);
                return percentage > 0 && percentage < 100;
              }).length}
            </div>
            <div className="text-sm text-gray-500">In Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {chefs.filter(chef => getProgressPercentage(chef.progress_steps) === 0).length}
            </div>
            <div className="text-sm text-gray-500">Not Started</div>
          </div>
        </div>
      </div>

      {/* Progress Steps Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Onboarding Steps</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
          {Object.entries(PROGRESS_STEPS_CONFIG).map(([key, label]) => (
            <div key={key} className="text-center p-2 bg-gray-50 rounded">
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Chef Progress List */}
      <div className="space-y-4">
        {chefs.map((chef) => {
          const completedSteps = getCompletedStepsCount(chef.progress_steps);
          const totalSteps = getTotalStepsCount();
          const percentage = getProgressPercentage(chef.progress_steps);
          const progressColor = getProgressColor(percentage);

          return (
            <div key={chef.id} className="bg-white rounded-lg border border-gray-200 p-6">
              {/* Chef Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{chef.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {chef.city && <span>{chef.city}</span>}
                    {chef.email && <span>{chef.email}</span>}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    {completedSteps}/{totalSteps}
                  </div>
                  <div className="text-sm text-gray-500">{percentage}% complete</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${progressColor}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>

              {/* Progress Steps */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {Object.entries(PROGRESS_STEPS_CONFIG).map(([stepKey, stepLabel]) => {
                  const isCompleted = chef.progress_steps?.[stepKey as keyof ProgressSteps];
                  
                  return (
                    <div key={stepKey} className="text-center">
                      <button
                        onClick={() => handleStepToggle(chef, stepKey as keyof ProgressSteps)}
                        className={`w-full p-3 rounded-lg border-2 transition-all duration-200 ${
                          isCompleted
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        <div className="flex items-center justify-center mb-1">
                          {isCompleted ? (
                            <Check className="h-5 w-5 text-green-600" />
                          ) : (
                            <Clock className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <div className="text-xs font-medium">{stepLabel}</div>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Notes */}
              {chef.notes && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="text-sm text-yellow-800">
                    <strong>Notes:</strong> {chef.notes}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {chefs.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <div className="text-gray-500">
              No chefs yet. Add your first chef to start tracking their progress.
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="text-sm text-blue-800">
          💡 <strong>Tip:</strong> Click on any step to toggle its completion status. Use this to track each chef's onboarding progress.
        </div>
      </div>
    </div>
  );
};
