
import React, { useState, useEffect } from 'react';
import { useChefStore } from '@/hooks/useChefStore';
import { Chef, ChefStatus, CHEF_STATUS_CONFIG } from '@/types';
import { Phone, Mail, MapPin, MessageCircle, Plus } from 'lucide-react';
import { ChefModal } from './ChefModal';

interface ChefStatusBoardProps {
  workspaceId: string;
}

export const ChefStatusBoard: React.FC<ChefStatusBoardProps> = ({ workspaceId }) => {
  const { chefs, loading, fetchChefs, updateChef } = useChefStore();
  const [draggedChef, setDraggedChef] = useState<Chef | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchChefs(workspaceId);
  }, [workspaceId, fetchChefs]);

  const getChefsByStatus = (status: ChefStatus) => {
    return chefs.filter(chef => chef.status === status);
  };

  const handleDragStart = (chef: Chef) => {
    setDraggedChef(chef);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: ChefStatus) => {
    e.preventDefault();
    
    if (draggedChef && draggedChef.status !== newStatus) {
      await updateChef(draggedChef.id, { status: newStatus });
      setDraggedChef(null);
    }
  };

  const getOutreachCount = (chef: Chef) => {
    return chef.outreach_logs?.length || 0;
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
        <h1 className="text-3xl font-bold text-gray-900">Chef Status Board</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          New Chef
        </button>
      </div>

      {/* Status Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(CHEF_STATUS_CONFIG).map(([status, config]) => {
          const statusChefs = getChefsByStatus(status as ChefStatus);
          
          return (
            <div
              key={status}
              className="bg-gray-50 rounded-lg p-4"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status as ChefStatus)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bgColor} ${config.color}`}>
                    {config.label}
                  </span>
                  <span className="text-sm text-gray-500">
                    ({statusChefs.length})
                  </span>
                </div>
              </div>

              {/* Chef Cards */}
              <div className="space-y-3">
                {statusChefs.map((chef) => (
                  <div
                    key={chef.id}
                    draggable
                    onDragStart={() => handleDragStart(chef)}
                    className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-move"
                  >
                    <div className="space-y-2">
                      {/* Chef Name */}
                      <div className="font-medium text-gray-900">{chef.name}</div>
                      
                      {/* Contact Info */}
                      <div className="space-y-1">
                        {chef.city && (
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="h-3 w-3 mr-1" />
                            {chef.city}
                          </div>
                        )}
                        
                        {chef.phone && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="h-3 w-3 mr-1" />
                            {chef.phone}
                          </div>
                        )}
                        
                        {chef.email && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Mail className="h-3 w-3 mr-1" />
                            {chef.email}
                          </div>
                        )}
                      </div>

                      {/* Outreach Count */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <div className="flex items-center text-xs text-gray-500">
                          <MessageCircle className="h-3 w-3 mr-1" />
                          {getOutreachCount(chef)} attempts
                        </div>
                        
                        {chef.notes && (
                          <div className="w-2 h-2 bg-yellow-400 rounded-full" title="Has notes" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Empty State */}
                {statusChefs.length === 0 && (
                  <div className="text-center text-gray-400 text-sm py-8">
                    No chefs in this status
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{chefs.length}</div>
            <div className="text-sm text-gray-500">Total Chefs</div>
          </div>
          {Object.entries(CHEF_STATUS_CONFIG).map(([status, config]) => {
            const count = getChefsByStatus(status as ChefStatus).length;
            return (
              <div key={status} className="text-center">
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-sm text-gray-500">{config.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Drag Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="text-sm text-blue-800">
          💡 <strong>Tip:</strong> Drag and drop chef cards between columns to update their status.
        </div>
      </div>
    </div>
  );
};
