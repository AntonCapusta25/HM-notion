import React, { useState, useEffect } from 'react';
import { useChefStore } from '@/hooks/useChefStore';
import { Chef, CreateChefData, UpdateChefData, CHEF_STATUS_CONFIG, CONTACT_METHOD_CONFIG } from '@/types';
import { X } from 'lucide-react';

interface ChefModalProps {
  chef?: Chef | null;
  workspaceId: string;
  onClose: () => void;
  onSave: () => void;
  quickAddMode?: boolean; // NEW: Optional prop for quick add mode
}

export const ChefModal: React.FC<ChefModalProps> = ({ chef, workspaceId, onClose, onSave, quickAddMode = false }) => {
  const { createChef, updateChef, createChefWithInitialOutreach, loading, error, clearError } = useChefStore();
  
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    phone: '',
    email: '',
    status: 'not_started' as const,
    notes: ''
  });

  // Initial outreach for quick add mode
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
    } else {
      // Reset for new chef
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
          name: formData.name.trim(),
          city: formData.city.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          email: formData.email.trim() || undefined,
          status: formData.status,
          notes: formData.notes || undefined,
          workspace_id: workspaceId
        };

        // NEW: If in quick add mode, automatically create with initial outreach
        if (quickAddMode) {
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
            {chef ? 'Edit Chef' : quickAddMode ? 'Quick Add Chef' : 'Add New Chef'}
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
              autoFocus={quickAddMode}
            />
          </div>

          {/* Conditional layout for quick add mode */}
          {quickAddMode ? (
            <div className="grid grid-cols-2 gap-3">
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
            </div>
          ) : (
            <>
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
            </>
          )}

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

          {/* Only show status field in normal mode */}
          {!quickAddMode && (
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
          )}

          {/* Quick add mode: Contact method */}
          {quickAddMode && (
            <div>
              <label htmlFor="contact_method" className="block text-sm font-medium text-gray-700 mb-1">
                How did you contact them?
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
          )}

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              rows={quickAddMode ? 2 : 3}
              value={quickAddMode ? initialOutreach.notes : formData.notes}
              onChange={(e) => quickAddMode ? handleOutreachChange('notes', e.target.value) : handleInputChange('notes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={quickAddMode ? "Notes about the initial contact..." : "Any additional notes about this chef..."}
            />
          </div>

          {/* Quick add mode notification */}
          {quickAddMode && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm text-blue-800">
                This will create the chef and automatically log the initial outreach attempt.
              </div>
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
              disabled={loading || !formData.name.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
            >
              {loading ? 'Saving...' : chef ? 'Update' : quickAddMode ? 'Add Chef' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
