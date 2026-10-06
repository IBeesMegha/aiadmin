import React, { useState, useEffect } from 'react';
import { X, Layers } from 'lucide-react';
import { Field } from '@/lib/types';

interface Component {
  id: string;
  name: string;
  displayName: string;
  category: string;
}

interface AddDynamicZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (field: Field) => void;
  collectionName: string;
  existingFieldNames?: string[];
}

export const AddDynamicZoneModal: React.FC<AddDynamicZoneModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  collectionName,
  existingFieldNames = [],
}) => {
  const [fieldName, setFieldName] = useState('');
  const [displayLabel, setDisplayLabel] = useState('');
  const [components, setComponents] = useState<Component[]>([]);
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch available components
  useEffect(() => {
    if (isOpen) {
      fetchComponents();
    }
  }, [isOpen]);

  const fetchComponents = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/components');
      if (!response.ok) throw new Error('Failed to fetch components');
      const data = await response.json();
      setComponents(data.data || []);
    } catch (err) {
      setError('Failed to load components');
      console.error('Error fetching components:', err);
    } finally {
      setLoading(false);
    }
  };

  // Validate field name
  const validateFieldName = (name: string): { isValid: boolean; error: string } => {
    if (!name.trim()) {
      return { isValid: false, error: 'Field name is required' };
    }

    if (!/^[a-zA-Z]/.test(name)) {
      return { isValid: false, error: 'Field name must start with a letter' };
    }

    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
      return { 
        isValid: false, 
        error: 'Field name can only contain letters, numbers, and underscores' 
      };
    }

    if (name.length < 2) {
      return { isValid: false, error: 'Field name must be at least 2 characters long' };
    }

    if (name.length > 50) {
      return { isValid: false, error: 'Field name must be less than 50 characters' };
    }

    if (existingFieldNames.includes(name.toLowerCase())) {
      return { isValid: false, error: 'A field with this name already exists' };
    }

    return { isValid: true, error: '' };
  };

  const validation = validateFieldName(fieldName);
  const isFormValid = validation.isValid && selectedComponents.length > 0;

  // Toggle component selection
  const toggleComponent = (componentName: string) => {
    setSelectedComponents(prev => 
      prev.includes(componentName)
        ? prev.filter(c => c !== componentName)
        : [...prev, componentName]
    );
  };

  // Group components by category
  const groupedComponents = components.reduce((acc, component) => {
    const category = component.category || 'GENERAL';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(component);
    return acc;
  }, {} as Record<string, Component[]>);

  const handleSubmit = () => {
    if (!isFormValid) return;

    const field: Field = {
      name: fieldName.toLowerCase(),
      displayName: displayLabel || fieldName,
      type: 'dynamiczone',
      required: false,
      // Store selected component names in the field metadata
      componentRef: selectedComponents.join(','), // Store as comma-separated string
    };

    onSubmit(field);
    
    // Reset form
    setFieldName('');
    setDisplayLabel('');
    setSelectedComponents([]);
  };

  const handleClose = () => {
    setFieldName('');
    setDisplayLabel('');
    setSelectedComponents([]);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
            <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
              <Layers size={20} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold">{collectionName}</h2>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <h3 className="text-2xl font-semibold mb-2">Add new Dynamic zone field</h3>
          <p className="text-sm text-gray-600 mb-6">
            Dynamically pick components when editing content
          </p>

          {/* Field Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                fieldName && !validation.isValid
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300'
              }`}
              placeholder="e.g. dynamic_sections, dynamicContent"
              autoFocus
            />
            {fieldName && !validation.isValid ? (
              <p className="text-xs text-red-600 mt-1 flex items-center">
                <span className="mr-1">⚠️</span>
                {validation.error}
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">
                Database field name (no spaces)
              </p>
            )}
          </div>

          {/* Display Label */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Label <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={displayLabel}
              onChange={(e) => setDisplayLabel(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g. Dynamic Sections, Content Blocks"
            />
            <p className="text-xs text-gray-500 mt-1">
              Display label for this field
            </p>
          </div>

          {/* Component Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select the components <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-600 mb-3">
              Choose which components can be used in this dynamic zone
            </p>

            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading components...</div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">{error}</div>
            ) : components.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No components available. Create components first.
              </div>
            ) : (
              <div className="border border-gray-300 rounded-lg max-h-96 overflow-y-auto">
                {Object.entries(groupedComponents).map(([category, categoryComponents]) => (
                  <div key={category} className="border-b last:border-b-0">
                    <div className="bg-gray-50 px-4 py-2 font-medium text-sm text-blue-600 uppercase">
                      {category}
                    </div>
                    <div className="divide-y">
                      {categoryComponents.map((component) => (
                        <label
                          key={component.id}
                          className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedComponents.includes(component.name)}
                            onChange={() => toggleComponent(component.name)}
                            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="ml-3 flex-1">
                            <div className="font-medium text-gray-900">
                              {component.displayName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {component.category}.{component.name}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedComponents.length > 0 && (
              <div className="mt-3 text-sm text-gray-600">
                Selected: {selectedComponents.length} component{selectedComponents.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isFormValid}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            Finish
          </button>
        </div>
      </div>
    </div>
  );
};
