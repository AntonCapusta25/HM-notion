
import React, { useState, useEffect } from 'react';
import { useChefStore } from '@/stores/useChefStore';
import { 
  Chef, 
  OutreachLog, 
  CreateOutreachLogData, 
  UpdateOutreachLogData,
  CONTACT_METHOD_CONFIG,
  RESPONSE_TYPE_CONFIG 
} from '@/types/chef';
import { X } from 'lucide-react';

interface OutreachLogModalProps {
  log?: OutreachLog | null;
  workspaceId: string;
  chefs: Chef[];
  onClose: () => void;
  onSave: () => void;
}

export const OutreachLogModal: React.FC<OutreachLogModalProps> = ({ 
  log, 
  workspaceId, 
  chefs, 
  onClose, 
  onSave 
}) => {
  const { createOutreachLog, updateOutreachLog, loading, error, clearError, getFollowUpDate } = useChefStore();
  
  const [formData, setFormData] = useState({
    chef_id: '',
    outreach_date: new Date().toISOString().split('T')[0],
    contact_method: 'phonecall' as const,
    response_type: '' as const,
    follow_up_date: '',
    notes: ''
  });

  useEffect(() => {
    if (log) {
      setFormData({
        chef_id: log.chef_id,
        outreach_date: log.outreach_date,
        contact_method: log.contact_method,
        response_type: log.response_type || '',
        follow_up_date: log.follow_up_date || '',
        notes: log.notes || ''
      });
    }
  }, [log]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      if (log) {
        // Update existing log
        const updateData: UpdateOutreachLogData = {
          outreach_date: formData.outreach_date,
          contact_method: formData.contact_method,
          response_type: formData.response_type || undefined,
          follow_up_date: formData.follow_up_date || undefined,
          notes: formData.notes || undefined
        };
        await updateOutreachLog(log.id, updateData);
      } else {
        // Create new log
        const createData: CreateOutreachLogData = {
          chef_id: formData.chef_id,
          outreach_date: formData.outreach_date,
          contact_method: formData.contact_method,
          response_type: formData.response_type || undefined,
          follow_up_date: formData.follow_up_date || undefined,
          notes: formData.notes || undefined,
          workspace_id: workspaceId
        };
        await createOutreachLog(createData);
      }
      onSave();
    } catch (error) {
      // Error is handled by store
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Auto-calculate follow-up date when response type changes
      if (field === 'response_type' && value) {
        const autoFollowUpDate = getFollowUpDate(value);
        if (autoFollowUpDate && !prev.follow_up_date) {
          newData.follow_up_date = autoFollowUpDate;
        }
      }
      
      return newData;
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {log ? 'Edit Outreach Log' : 'Log New Outreach'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Chef Selection */}
          <div>
            <label htmlFor="chef_id" className="block text-sm font-medium text-gray-700 mb-1">
              Chef *
            </label>
            <select
              id="chef_id"
              required
              value={formData.chef_id}
              onChange={(e) => handleInputChange('chef_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={!!log} // Disable when editing
            >
              <option value="">Select a chef</option>
              {chefs.map(chef => (
                <option key={chef.id} value={chef.id}>
                  {chef.name} {chef.city && `- ${chef.city}`}
                </option>
              ))}
            </select>
          </div>

          {/* Outreach Date */}
          <div>
            <label htmlFor="outreach_date" className="block text-sm font-medium text-gray-700 mb-1">
              Outreach Date *
            </label>
            <input
              id="outreach_date"
              type="date"
              required
              value={formData.outreach_date}
              onChange={(e) => handleInputChange('outreach_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Contact Method */}
          <div>
            <label htmlFor="contact_method" className="block text-sm font-medium text-gray-700 mb-1">
              Contact Method *
            </label>
            <select
              id="contact_method"
              required
              value={formData.contact_method}
              onChange={(e) => handleInputChange('contact_method', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {Object.entries(CONTACT_METHOD_CONFIG).map(([method, config]) => (
                <option key={method} value={method}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          {/* Response Type */}
          <div>
            <label htmlFor="response_type" className="block text-sm font-medium text-gray-700 mb-1">
              Response Type
            </label>
            <select
              id="response_type"
              value={formData.response_type}
              onChange={(e) => handleInputChange('response_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">No response yet</option>
              {Object.entries(RESPONSE_TYPE_CONFIG).map(([response, config]) => (
                <option key={response} value={response}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          {/* Follow-up Date */}
          <div>
            <label htmlFor="follow_up_date" className="block text-sm font-medium text-gray-700 mb-1">
              Follow-up Date
            </label>
            <input
              id="follow_up_date"
              type="date"
              value={formData.follow_up_date}
              onChange={(e) => handleInputChange('follow_up_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="text-xs text-gray-500 mt-1">
              Will be auto-calculated based on response type if left empty
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              rows={3}
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any additional notes about this outreach..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
            >
              {loading ? 'Saving...' : log ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
