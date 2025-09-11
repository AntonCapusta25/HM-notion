import React, { useState, useRef } from 'react';
import { ChefListView } from './ChefListView';
import { ChefStatusBoard } from './ChefStatusBoard';
import { ChefProgressView } from './ChefProgressView';
import { OutreachLogView } from './OutreachLogView';
import { OutreachCalendarView } from './OutreachCalendarView';
import { ChefModal } from './ChefModal';
import { OutreachLogModal } from './OutreachLogModal';
import { EnhancedChatbot } from '@/components/EnhancedChatbot';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useChefStore } from '@/hooks/useChefStore';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, 
  Layout, 
  BarChart3, 
  MessageCircle, 
  Calendar, 
  Settings,
  Download,
  Upload,
  CheckCircle,
  AlertTriangle,
  X,
  Bot,
  Minimize2,
  Maximize2
} from 'lucide-react';

interface ChefWorkspaceProps {
  workspaceId: string;
}

type ViewType = 'list' | 'status' | 'progress' | 'outreach' | 'calendar' | 'chatbot';

export const ChefWorkspace: React.FC<ChefWorkspaceProps> = ({ workspaceId }) => {
  const [currentView, setCurrentView] = useState<ViewType>('list');
  
  // CSV Import/Export States
  const [showSettings, setShowSettings] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chatbot States
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatbotMinimized, setChatbotMinimized] = useState(false);

  // Get auth context for chatbot
  const { user, session } = useAuth();

  // Get data from chef store
  const { chefs, outreachLogs, createChef } = useChefStore();
  
  // Filter data for current workspace
  const workspaceChefs = chefs.filter(chef => chef.workspace_id === workspaceId);
  const workspaceOutreachLogs = outreachLogs.filter(log => log.workspace_id === workspaceId);

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
    },
    {
      id: 'chatbot' as ViewType,
      name: 'AI Assistant',
      icon: Bot,
      description: 'Chat with AI to manage chefs, log outreach, and get insights'
    }
  ];

  // CSV Export Function
  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const headers = [
        'Name', 'City', 'Phone', 'Email', 'Status', 'Progress Steps', 'Notes',
        'Total Outreach Attempts', 'Last Contact Date', 'Last Contact Method',
        'Last Response Type', 'Next Follow-up Date', 'Created At'
      ];

      const rows = workspaceChefs.map(chef => {
        const chefOutreach = workspaceOutreachLogs.filter(log => log.chef_id === chef.id);
        const totalAttempts = chefOutreach.length;
        const lastOutreach = chefOutreach.sort((a, b) => 
          new Date(b.outreach_date).getTime() - new Date(a.outreach_date).getTime()
        )[0];

        const progressSteps = chef.progress_steps ? 
          Object.entries(chef.progress_steps)
            .filter(([key, value]) => value)
            .map(([key]) => key)
            .join('; ') : '';

        return [
          `"${(chef.name || '').replace(/"/g, '""')}"`,
          `"${(chef.city || '').replace(/"/g, '""')}"`,
          `"${(chef.phone || '').replace(/"/g, '""')}"`,
          `"${(chef.email || '').replace(/"/g, '""')}"`,
          chef.status || '',
          `"${progressSteps}"`,
          `"${(chef.notes || '').replace(/"/g, '""')}"`,
          totalAttempts,
          lastOutreach ? lastOutreach.outreach_date : '',
          lastOutreach ? lastOutreach.contact_method : '',
          lastOutreach ? lastOutreach.response_type : '',
          lastOutreach ? lastOutreach.follow_up_date : '',
          chef.created_at || ''
        ].join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `chef_outreach_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export CSV. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // CSV Import Function
  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('CSV file must have at least a header row and one data row');
      }

      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      const rows = lines.slice(1);

      if (!headers.includes('Name')) {
        throw new Error('Missing required column: Name');
      }

      const chefsToImport = [];
      const errors = [];

      rows.forEach((row, index) => {
        try {
          const values = row.split(',').map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"'));
          const chefData: any = { workspace_id: workspaceId };

          headers.forEach((header, i) => {
            const value = values[i] || '';
            
            switch (header) {
              case 'Name':
                chefData.name = value;
                break;
              case 'City':
                chefData.city = value;
                break;
              case 'Phone':
                chefData.phone = value;
                break;
              case 'Email':
                chefData.email = value;
                break;
              case 'Status':
                const validStatuses = ['not_started', 'in_progress', 'interested_not_now', 'not_interested'];
                chefData.status = validStatuses.includes(value.toLowerCase()) ? value.toLowerCase() : 'not_started';
                break;
              case 'Notes':
                chefData.notes = value;
                break;
              case 'Progress Steps':
                if (value) {
                  const steps = value.split(';').map(s => s.trim());
                  chefData.progress_steps = {
                    kvk_registered: steps.includes('kvk_registered'),
                    eh_herkenning_setup: steps.includes('eh_herkenning_setup'),
                    profile_completed: steps.includes('profile_completed'),
                    menu_uploaded: steps.includes('menu_uploaded'),
                    menu_pictures_added: steps.includes('menu_pictures_added'),
                    test_order_completed: steps.includes('test_order_completed'),
                    live_launch: steps.includes('live_launch')
                  };
                }
                break;
            }
          });

          if (!chefData.name) {
            errors.push(`Row ${index + 2}: Name is required`);
            return;
          }

          chefsToImport.push(chefData);
        } catch (rowError: any) {
          errors.push(`Row ${index + 2}: ${rowError.message}`);
        }
      });

      if (errors.length === 0 && chefsToImport.length > 0) {
        let successCount = 0;
        const importErrors = [];

        for (const chefData of chefsToImport) {
          try {
            await createChef(chefData);
            successCount++;
          } catch (error: any) {
            importErrors.push(`Failed to import "${chefData.name}": ${error.message}`);
          }
        }

        setImportResult({
          success: true,
          imported: successCount,
          total: chefsToImport.length,
          errors: importErrors
        });
      } else {
        setImportResult({
          success: false,
          errors: errors
        });
      }

    } catch (error: any) {
      setImportResult({
        success: false,
        errors: [error.message]
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

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
      case 'chatbot':
        return (
          <div className="flex justify-center">
            <div className="w-full max-w-4xl">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Chef Assistant</h2>
                <p className="text-gray-600">
                  Ask me to add chefs, log outreach attempts, analyze your recruitment pipeline, or get insights about your chef database.
                </p>
              </div>
              {session?.access_token && user && (
                <EnhancedChatbot 
                  userAuthToken={session.access_token}
                  userId={user.id}
                  workspaceId={workspaceId}
                />
              )}
            </div>
          </div>
        );
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
              {/* Floating Chatbot Toggle (when not on chatbot tab) */}
              {currentView !== 'chatbot' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowChatbot(!showChatbot)}
                  className="flex items-center gap-2"
                >
                  <Bot className="h-4 w-4" />
                  AI Chat
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Button>
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

      {/* Floating Chatbot */}
      {showChatbot && currentView !== 'chatbot' && session?.access_token && user && (
        <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${
          chatbotMinimized ? 'w-80' : 'w-96'
        }`}>
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200">
            {/* Chatbot Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-blue-50 rounded-t-lg">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">AI Chef Assistant</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setChatbotMinimized(!chatbotMinimized)}
                  className="h-6 w-6 p-0"
                >
                  {chatbotMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowChatbot(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            {/* Chatbot Content */}
            {!chatbotMinimized && (
              <div className="h-80">
                <EnhancedChatbot 
                  userAuthToken={session.access_token}
                  userId={user.id}
                  workspaceId={workspaceId}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Dialog with CSV Import/Export */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chef Data Management</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Export Section */}
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export Chefs
              </h4>
              <p className="text-sm text-gray-600">
                Download all chef data as CSV ({workspaceChefs.length} chefs)
              </p>
              <Button 
                onClick={handleExportCSV}
                disabled={exporting || workspaceChefs.length === 0}
                className="w-full"
              >
                {exporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </>
                )}
              </Button>
            </div>

            {/* Import Section */}
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Import Chefs
              </h4>
              <p className="text-sm text-gray-600">
                Upload CSV file. Required: Name column.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                disabled={importing}
                className="hidden"
              />
              <Button 
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                variant="outline"
                className="w-full"
              >
                {importing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Choose CSV File
                  </>
                )}
              </Button>
            </div>

            {/* Import Result */}
            {importResult && (
              <Alert variant={importResult.success ? "default" : "destructive"}>
                <div className="flex items-start gap-2">
                  {importResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <AlertDescription>
                      {importResult.success ? (
                        <p>Successfully imported {importResult.imported} of {importResult.total} chefs</p>
                      ) : (
                        <div>
                          <p className="font-medium">Import failed</p>
                          <ul className="text-sm list-disc list-inside mt-1">
                            {importResult.errors.slice(0, 3).map((error: string, i: number) => (
                              <li key={i}>{error}</li>
                            ))}
                            {importResult.errors.length > 3 && (
                              <li>... and {importResult.errors.length - 3} more</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </AlertDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setImportResult(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Alert>
            )}

            {/* CSV Format Guide */}
            <div className="text-xs text-gray-500 space-y-1 border-t pt-3">
              <p><strong>CSV Format:</strong></p>
              <ul className="list-disc list-inside pl-2 space-y-0.5">
                <li><strong>Name</strong> (required) - Chef's name</li>
                <li><strong>City</strong> - Chef's city</li>
                <li><strong>Phone</strong> - Contact phone</li>
                <li><strong>Email</strong> - Contact email</li>
                <li><strong>Status</strong> - not_started, in_progress, interested_not_now, not_interested</li>
                <li><strong>Notes</strong> - Additional notes</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
