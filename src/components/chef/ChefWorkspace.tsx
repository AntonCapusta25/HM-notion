
import React, { useState } from 'react';
import { ChefListView } from './ChefListView';
import { ChefStatusBoard } from './ChefStatusBoard';
import { ChefProgressView } from './ChefProgressView';
import { OutreachLogView } from './OutreachLogView';
import { OutreachCalendarView } from './OutreachCalendarView';
import { ChefModal } from './ChefModal';
import { OutreachLogModal } from './OutreachLogModal';
import { 
  Users, 
  Layout, 
  BarChart3, 
  MessageCircle, 
  Calendar, 
  Settings 
} from 'lucide-react';

interface ChefWorkspaceProps {
  workspaceId: string;
}

type ViewType = 'list' | 'status' | 'progress' | 'outreach' | 'calendar';

export const ChefWorkspace: React.FC<ChefWorkspaceProps> = ({ workspaceId }) => {
  const [currentView, setCurrentView] = useState<ViewType>('list');

  const views = [
    {
      id: 'list' as ViewType,
      name: 'Chef List',
      icon: Users,
      description: 'Complete list of all chefs with contact details'
    },
    {
      id: 'status' as ViewType,
      name: 'Status Board',
      icon: Layout,
      description: 'Kanban-style board grouped by chef status'
    },
    {
      id: 'progress' as ViewType,
      name: 'Progress Tracker',
      icon: BarChart3,
      description: 'Track onboarding progress for each chef'
    },
    {
      id: 'outreach' as ViewType,
      name: 'Outreach Log',
      icon: MessageCircle,
      description: 'Log and track all communication attempts'
    },
    {
      id: 'calendar' as ViewType,
      name: 'Follow-up Calendar',
      icon: Calendar,
      description: 'Calendar view of scheduled follow-ups'
    }
  ];

  const renderCurrentView = () => {
    switch (currentView) {
      case 'list':
        return <ChefListView workspaceId={workspaceId} />;
      case 'status':
        return <ChefStatusBoard workspaceId={workspaceId} />;
      case 'progress':
        return <ChefProgressView workspaceId={workspaceId} />;
      case 'outreach':
        return <OutreachLogView workspaceId={workspaceId} />;
      case 'calendar':
        return <OutreachCalendarView workspaceId={workspaceId} />;
      default:
        return <ChefListView workspaceId={workspaceId} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Tab Navigation */}
            <nav className="flex space-x-8 overflow-x-auto">
              {views.map((view) => {
                const Icon = view.icon;
                const isActive = currentView === view.id;
                
                return (
                  <button
                    key={view.id}
                    onClick={() => setCurrentView(view.id)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {view.name}
                  </button>
                );
              })}
            </nav>

            {/* Settings/Actions */}
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* View Description */}
      <div className="bg-blue-50 border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="text-sm text-blue-700">
            {views.find(v => v.id === currentView)?.description}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderCurrentView()}
      </div>
    </div>
  );
};

// Export all components for easy importing
export { 
  ChefListView,
  ChefStatusBoard, 
  ChefProgressView,
  OutreachLogView,
  OutreachCalendarView,
  ChefModal,
  OutreachLogModal
};
