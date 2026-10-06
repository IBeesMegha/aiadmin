import React, { useState } from 'react';
import { X } from 'lucide-react';

interface CreateCollectionTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; displayName: string; description?: string }) => void;
  type: 'collection' | 'single' | 'component';
}

export const CreateCollectionTypeModal: React.FC<CreateCollectionTypeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  type,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  // Generate table name in snake_case format
  const generateTableName = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '_'); // Replace spaces with underscores
  };

  const handleSubmit = () => {
    if (!displayName.trim()) {
      alert('Please enter a display name');
      return;
    }

    const name = displayName.toLowerCase().replace(/\s+/g, '-');
    onSubmit({ name, displayName, description });
    
    // Reset form
    setDisplayName('');
    setDescription('');
  };

  const getTitle = () => {
    switch (type) {
      case 'collection':
        return 'Create a collection type';
      case 'single':
        return 'Create a single type';
      case 'component':
        return 'Create a component';
      default:
        return 'Create content type';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-sm">
              CT
            </div>
            <h2 className="text-xl font-semibold">{getTitle()}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b sticky top-[73px] bg-white z-10">
          <div className="flex px-6">
            <button className="px-4 py-3 text-sm font-medium text-blue-600 border-b-2 border-blue-600">
              BASIC SETTINGS
            </button>
            <button className="px-4 py-3 text-sm font-medium text-gray-500">
              ADVANCED SETTINGS
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-6">
            A type for modeling data
          </p>

          <div className="grid grid-cols-2 gap-6">
            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="test"
                autoFocus
              />
            </div>

            {/* API ID (Singular) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API ID (Singular)
              </label>
              <input
                type="text"
                value={displayName.toLowerCase().replace(/\s+/g, '-')}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
              <p className="text-xs text-gray-500 mt-1">
                The UID is used to generate the API routes and database tables/collections.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mt-4">
            {/* API ID (Plural) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API ID (Plural)
              </label>
              <input
                type="text"
                value={displayName.toLowerCase().replace(/\s+/g, '-') + 's'}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>

            {/* Table Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Table Name
              </label>
              <input
                type="text"
                value={generateTableName(displayName)}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
              <p className="text-xs text-gray-500 mt-1">
                Database table name in snake_case format.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 bg-gray-50 rounded-b-lg sticky bottom-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};
