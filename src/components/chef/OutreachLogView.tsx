// components/chef/OutreachLogView.tsx - Enhanced with direct chef addition and status management

import React, { useState, useEffect } from 'react';
import { useChefStore } from '@/hooks/useChefStore';
import { OutreachLog, CONTACT_METHOD_CONFIG, RESPONSE_TYPE_CONFIG, CHEF_STATUS_CONFIG, ChefStatus } from '@/types';
import { Plus, Calendar, MessageCircle, Filter, Edit, Trash2, Users, UserPlus } from 'lucide-react';
import { OutreachLogModal } from './OutreachLogModal';
import { ChefModal } from './ChefModal';

interface OutreachLogViewProps {
  workspaceId: string;
}

export const OutreachLogView: React.FC<OutreachLogViewProps> = ({ workspaceId }) => {
  const { 
    outreachLogs, 
    chefs, 
    loading, 
    fetchOutreachLogs, 
    fetchChefs, 
    deleteOutreachLog,
    updateChef
  } = useChefStore();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQuickChefModal, setShowQuickChefModal] = useState(false);
  const [editingLog, setEditingLog] = useState<OutreachLog | null>(null);
  const [filterContactMethod, setFilterContactMethod] = useState<string>('all');
  const [filterResponseType, setFilterResponseType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOutreachLogs(workspaceId);
    fetchChefs(workspaceId);
  }, [workspaceId, fetchOutreachLogs, fetchChefs]);

  const filteredLogs = outreachLogs.filter(log => {
    const chef = chefs.find(c => c.id === log.chef_id);
    const chefName = chef?.name || '';
    
    const matchesSearch = chefName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesContactMethod = filterContactMethod === 'all' || log.contact_method === filterContactMethod;
    const matchesResponseType = filterResponseType === 'all' || log.response_type === filterResponseType;
    
    return matchesSearch && matchesContactMethod && matchesResponseType;
  });

  const handleDeleteLog = async (log: OutreachLog) => {
    const chef = chefs.find(c => c.id === log.chef_id);
    const chefName = chef?.name || 'Unknown Chef';
    
    if (confirm(`Are you sure you want to delete this outreach log for ${chefName}?`)) {
      await deleteOutreachLog(log.id);
    }
  };

  // NEW: Handle direct status changes
  const handleStatusChange = async (chefId: string, newStatus: ChefStatus) => {
    await updateChef(chefId, { status: newStatus });
  };

  // NEW: Handle quick chef addition
  const handleQuickChefAdded = (chefId: string) => {
    setShowQuickChefModal(false);
    // Refresh data to show the new chef and outreach log
    fetchChefs(workspaceId);
    fetchOutreachLogs(workspaceId);
  };

  const getUpcomingFollowUps = () => {
    const today = new Date().toISOString().split('T')[0];
    return outreachLogs.filter(log => 
      log.follow_up_date && 
      log.follow_up_date >= today
    ).sort((a, b) => 
      new Date(a.follow_up_date!).getTime() - new Date(b.follow_up_date!).getTime()
    );
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
        <h1 className="text-3xl font-bold text-gray-900">Outreach Log</h1>
        <div className="flex items-center gap-2">
          {/* NEW: Add Chef button */}
          <button
            onClick={() => setShowQuickChefModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <UserPlus className="h-5 w-5" />
            Add Chef
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Log Outreach
          </button>
        </div>
      </div>

      {/* Upcoming Follow-ups */}
      {getUpcomingFollowUps().length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-800 mb-3 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Follow-ups
          </h3>
          <div className="space-y-2">
            {getUpcomingFollowUps().slice(0, 5).map(log => {
              const chef = chefs.find(c => c.id === log.chef_id);
              return (
                <div key={log.id} className="flex items-center justify-between">
                  <span className="text-yellow-700">
                    {chef?.name} - {new Date(log.follow_up_date!).toLocaleDateString()}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full ${RESPONSE_TYPE_CONFIG[log.response_type!]?.color}`}>
                    {RESPONSE_TYPE_CONFIG[log.response_type!]?.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 items-center flex-wrap">
        <div className="flex-1 min-w-64">
          <input
            type="text"
            placeholder="Search by chef name or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-500" />
          <select
            value={filterContactMethod}
            onChange={(e) => setFilterContactMethod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Methods</option>
            {Object.entries(CONTACT_METHOD_CONFIG).map(([method, config]) => (
              <option key={method} value={method}>{config.label}</option>
            ))}
          </select>
        </div>
        
        <div>
          <select
            value={filterResponseType}
            onChange={(e) => setFilterResponseType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Responses</option>
            {Object.entries(RESPONSE_TYPE_CONFIG).map(([response, config]) => (
              <option key={response} value={response}>{config.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{filteredLogs.length}</div>
          <div className="text-sm text-gray-500">Total Outreach</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-green-600">
            {filteredLogs.filter(log => log.response_type === 'interested').length}
          </div>
          <div className="text-sm text-gray-500">Interested</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-yellow-600">
            {filteredLogs.filter(log => log.response_type === 'asked_to_contact_later').length}
          </div>
          <div className="text-sm text-gray-500">Contact Later</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-600">
            {filteredLogs.filter(log => log.response_type === 'no_response').length}
          </div>
          <div className="text-sm text-gray-500">No Response</div>
        </div>
      </div>

      {/* Outreach Log Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chef & Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Outreach Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Response
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Follow-up Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => {
                const chef = chefs.find(c => c.id === log.chef_id);
                const contactMethodConfig = CONTACT_METHOD_CONFIG[log.contact_method];
                const responseTypeConfig = log.response_type ? RESPONSE_TYPE_CONFIG[log.response_type] : null;
                const statusConfig = chef ? CHEF_STATUS_CONFIG[chef.status] : null;
                
                return (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-900">
                          {chef?.name || 'Unknown Chef'}
                        </div>
                        {chef?.city && (
                          <div className="text-sm text-gray-500">{chef.city}</div>
                        )}
                        
                        {/* NEW: Direct status management */}
                        {chef && statusConfig && (
                          <div className="flex items-center gap-2">
                            <select
                              value={chef.status}
                              onChange={(e) => handleStatusChange(chef.id, e.target.value as ChefStatus)}
                              className={`text-xs px-2 py-1 rounded-full border-0 ${statusConfig.bgColor} ${statusConfig.color} font-semibold focus:ring-2 focus:ring-blue-500`}
                            >
                              {Object.entries(CHEF_STATUS_CONFIG).map(([value, config]) => (
                                <option key={value} value={value}>
                                  {config.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(log.outreach_date).toLocaleDateString()}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${contactMethodConfig.color}`}>
                        {contactMethodConfig.label}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      {responseTypeConfig ? (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${responseTypeConfig.color}`}>
                          {responseTypeConfig.label}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">No response yet</span>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.follow_up_date && (
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                          {new Date(log.follow_up_date).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {log.notes || '-'}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingLog(log)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Edit log"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteLog(log)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete log"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              {searchTerm || filterContactMethod !== 'all' || filterResponseType !== 'all'
                ? 'No outreach logs match your filters' 
                : 'No outreach logs yet. Add your first chef and log outreach to get started.'}
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingLog) && (
        <OutreachLogModal
          log={editingLog}
          workspaceId={workspaceId}
          chefs={chefs}
          onClose={() => {
            setShowCreateModal(false);
            setEditingLog(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingLog(null);
            fetchOutreachLogs(workspaceId);
          }}
        />
      )}

      {/* NEW: Quick Chef Addition Modal */}
      {showQuickChefModal && (
        <ChefModal
          workspaceId={workspaceId}
          quickAddMode={true}
          onClose={() => setShowQuickChefModal(false)}
          onSave={handleQuickChefAdded}
        />
      )}
    </div>
  );
};
