
import React, { useState, useEffect } from 'react';
import { useChefStore } from '@/stores/useChefStore';
import { Chef, CHEF_STATUS_CONFIG } from '@/types/chef';
import { 
  Plus, 
  Phone, 
  Mail, 
  MapPin, 
  Edit, 
  Trash2, 
  MessageCircle,
  Calendar,
  Filter
} from 'lucide-react';

interface ChefListViewProps {
  workspaceId: string;
}

export const ChefListView: React.FC<ChefListViewProps> = ({ workspaceId }) => {
  const { chefs, loading, fetchChefs, deleteChef } = useChefStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingChef, setEditingChef] = useState<Chef | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchChefs(workspaceId);
  }, [workspaceId, fetchChefs]);

  const filteredChefs = chefs.filter(chef => {
    const matchesSearch = chef.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         chef.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         chef.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || chef.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleDeleteChef = async (chef: Chef) => {
    if (confirm(`Are you sure you want to delete ${chef.name}?`)) {
      await deleteChef(chef.id);
    }
  };

  const getOutreachCount = (chef: Chef) => {
    return chef.outreach_logs?.length || 0;
  };

  const getLastOutreachDate = (chef: Chef) => {
    if (!chef.outreach_logs?.length) return null;
    const sortedLogs = chef.outreach_logs.sort((a, b) => 
      new Date(b.outreach_date).getTime() - new Date(a.outreach_date).getTime()
    );
    return sortedLogs[0].outreach_date;
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
        <h1 className="text-3xl font-bold text-gray-900">Chefs</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          New Chef
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search chefs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-500" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="interested_not_now">Interested but not now</option>
            <option value="not_interested">Not Interested</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{filteredChefs.length}</div>
          <div className="text-sm text-gray-500">Total Chefs</div>
        </div>
        {Object.entries(CHEF_STATUS_CONFIG).map(([status, config]) => {
          const count = filteredChefs.filter(chef => chef.status === status).length;
          return (
            <div key={status} className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{count}</div>
              <div className="text-sm text-gray-500">{config.label}</div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chef
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  City
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Outreach
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Contact
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredChefs.map((chef) => {
                const statusConfig = CHEF_STATUS_CONFIG[chef.status];
                const outreachCount = getOutreachCount(chef);
                const lastOutreach = getLastOutreachDate(chef);
                
                return (
                  <tr key={chef.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{chef.name}</div>
                      {chef.email && (
                        <div className="text-sm text-gray-500">{chef.email}</div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      {chef.city && (
                        <div className="flex items-center text-sm text-gray-900">
                          <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                          {chef.city}
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        {chef.phone && (
                          <div className="flex items-center text-sm text-gray-900">
                            <Phone className="h-4 w-4 mr-1 text-gray-400" />
                            {chef.phone}
                          </div>
                        )}
                        {chef.email && (
                          <div className="flex items-center text-sm text-gray-900">
                            <Mail className="h-4 w-4 mr-1 text-gray-400" />
                            {chef.email}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <MessageCircle className="h-4 w-4 mr-1 text-gray-400" />
                        {outreachCount} attempts
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      {lastOutreach && (
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                          {new Date(lastOutreach).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingChef(chef)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Edit chef"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteChef(chef)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete chef"
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
        
        {filteredChefs.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              {searchTerm || filterStatus !== 'all' 
                ? 'No chefs match your filters' 
                : 'No chefs yet. Add your first chef to get started.'}
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingChef) && (
        <ChefModal
          chef={editingChef}
          workspaceId={workspaceId}
          onClose={() => {
            setShowCreateModal(false);
            setEditingChef(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingChef(null);
            fetchChefs(workspaceId);
          }}
        />
      )}
    </div>
  );
};
