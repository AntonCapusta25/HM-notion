import React, { useState, useEffect } from 'react';
import { useChefStore } from '@/hooks/useChefStore';
import { Chef, CreateChefData, UpdateChefData, CHEF_STATUS_CONFIG, CONTACT_METHOD_CONFIG } from '@/types';
import { X } from 'lucide-react';

interface ChefModalProps {
  chef?: Chef | null;
  workspaceId: string;
  onClose: () => void;
  onSave: () => void;
}

export const ChefModal: React.FC<ChefModalProps> = ({ chef, workspaceId, onClose, onSave }) => {
  const { createChef, updateChef, createChefWithInitialOutreach, loading, error, clearError } = useChefStore();
  
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    phone: '',
    email: '',
    status: 'not_started' as const,
    notes: ''
  });

  // NEW: Initial outreach option
  const [logInitialOutreach, setLogInitialOutreach] = useState(false);
  const [initialOutreach, setInitialOutreach] = useState({
    contact_method: 'phonecall' as const,
    notes: ''
  });

  useEffect(() => {
    if (chef) {
      setFormData({
        name: chef.name,
        city: chef.city || '',
        phone: chef.phone || '',
        email: chef.email || '',
        status: chef.status,
        notes: chef.notes || ''
      });
      // Disable initial outreach for existing chefs
      setLogInitialOutreach(false);
    } else {
      // Reset for new chef
      setLogInitialOutreach(false);
      setInitialOutreach({
        contact_method: 'phonecall',
        notes: ''
      });
    }
  }, [chef]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      if (chef) {
        // Update existing chef
        const updateData: UpdateChefData = {
          name: formData.name,
          city: formData.city || undefined,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
          status: formData.status,
          notes: formData.notes || undefined
        };
        await updateChef(chef.id, updateData);
      } else {
        // Create new chef
        const createData: CreateChefData = {
          name: formData.name,
          city: formData.city || undefined,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
          status: formData.status,
          notes: formData.notes || undefined,
          workspace_id: workspaceId
        };

        // NEW: Use enhanced creation with optional initial outreach
        if (logInitialOutreach) {
          await createChefWithInitialOutreach(createData, {
            contact_method: initialOutreach.contact_method,
            notes: initialOutreach.notes || `Initial contact with ${formData.name}`
          });
        } else {
          await createChef(createData);
        }
      }
      onSave();
    } catch (error) {
      // Error is handled by store
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleOutreachChange = (field: string, value: string) => {
    setInitialOutreach(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {chef ? 'Edit Chef' : 'Add New Chef'}
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
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              id="name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Chef's full name"
            />
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              id="city"
              type="text"
              value={formData.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Amsterdam"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="+31123456789"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="chef@example.com"
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {Object.entries(CHEF_STATUS_CONFIG).map(([value, config]) => (
                <option key={value} value={value}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

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
              placeholder="Any additional notes about this chef..."
            />
          </div>

          {/* NEW: Initial Outreach Option (only for new chefs) */}
          {!chef && (
            <div className="border-t pt-4">
              <div className="flex items-center mb-3">
                <input
                  id="log_initial_outreach"
                  type="checkbox"
                  checked={logInitialOutreach}
                  onChange={(e) => setLogInitialOutreach(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="log_initial_outreach" className="ml-2 text-sm font-medium text-gray-700">
                  Log initial outreach attempt
                </label>
              </div>

              {logInitialOutreach && (
                <div className="space-y-3 bg-blue-50 p-3 rounded-lg">
                  <div>
                    <label htmlFor="contact_method" className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Method
                    </label>
                    <select
                      id="contact_method"
                      value={initialOutreach.contact_method}
                      onChange={(e) => handleOutreachChange('contact_method', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {Object.entries(CONTACT_METHOD_CONFIG).map(([method, config]) => (
                        <option key={method} value={method}>
                          {config.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="outreach_notes" className="block text-sm font-medium text-gray-700 mb-1">
                      Outreach Notes
                    </label>
                    <textarea
                      id="outreach_notes"
                      rows={2}
                      value={initialOutreach.notes}
                      onChange={(e) => handleOutreachChange('notes', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Notes about the initial contact..."
                    />
                  </div>
                </div>
              )}
            </div>
          )}

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
              {loading ? 'Saving...' : chef ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
