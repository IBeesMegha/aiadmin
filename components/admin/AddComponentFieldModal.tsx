/**
 * Add Component Field Modal
 * 
 * Modal for adding a component field to a collection/component
 * Allows selecting existing components and choosing single/repeatable type
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Field } from '@/lib/types';

interface AddComponentFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (field: Field) => void;
  collectionName: string;
  existingFieldNames?: string[];
}

export const AddComponentFieldModal: React.FC<AddComponentFieldModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  collectionName,
  existingFieldNames = [],
}) => {
  const [fieldName, setFieldName] = useState('');
  const [selectedComponent, setSelectedComponent] = useState('');
  const [componentType, setComponentType] = useState<'repeatable' | 'single'>('repeatable');
  const [required, setRequired] = useState(false);
  const [availableComponents, setAvailableComponents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchComponents();
    }
  }, [isOpen]);

  const fetchComponents = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/components');
      const result = await response.json();
      if (response.ok) {
        setAvailableComponents(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching components:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Validate field name
  const validateFieldName = (name: string): { isValid: boolean; error: string } => {
    if (!name.trim()) {
      return { isValid: false, error: 'Field name is required' };
    }

    // Check if starts with a letter
    if (!/^[a-zA-Z]/.test(name)) {
      return { isValid: false, error: 'Field name must start with a letter' };
    }

    // Check for invalid characters
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
      return { 
        isValid: false, 
        error: 'No space is allowed for the name of the attribute' 
      };
    }

    // Check for duplicate field names
    if (existingFieldNames.includes(name.toLowerCase())) {
      return { isValid: false, error: 'A field with this name already exists' };
    }

    return { isValid: true, error: '' };
  };

  const validation = validateFieldName(fieldName);
  const isFormValid = validation.isValid && selectedComponent !== '';

  const handleSubmit = () => {
    if (!isFormValid) return;

    const field: Field = {
      name: fieldName.toLowerCase(),
      displayName: fieldName,
      type: 'component',
      componentRef: selectedComponent,
      multiple: componentType === 'repeatable',
      required,
    };

    onSubmit(field);
    
    // Reset form
    setFieldName('');
    setSelectedComponent('');
    setComponentType('repeatable');
    setRequired(false);
  };

  // Get selected component details
  const selectedComponentData = availableComponents.find(c => c.name === selectedComponent);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold">{collectionName}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
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
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-240px)]">
          <h3 className="text-2xl font-semibold mb-2">Add new component (2/2)</h3>
          <p className="text-sm text-gray-600 mb-6">Group of fields that you can repeat or reuse</p>

          <div className="grid grid-cols-2 gap-6">
            {/* Left Column - Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name
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
                placeholder="e.g., banner, sections, hero"
                autoFocus
              />
              {fieldName && !validation.isValid ? (
                <p className="text-xs text-red-600 mt-1">
                  {validation.error}
                </p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">
                  No space is allowed for the name of the attribute
                </p>
              )}

              {/* Type Selection */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Type
                </label>
                <div className="space-y-3">
                  <button
                    onClick={() => setComponentType('repeatable')}
                    className={`w-full p-4 border-2 rounded-lg text-left transition ${
                      componentType === 'repeatable'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${
                        componentType === 'repeatable' ? 'border-blue-500' : 'border-gray-300'
                      }`}>
                        {componentType === 'repeatable' && (
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        )}
                      </div>
                      <div className="ml-3">
                        <span className="font-medium text-blue-600 block mb-1">
                          Repeatable component
                        </span>
                        <p className="text-sm text-gray-600">
                          Best for multiple instances (array) of ingredients, meta tags, etc..
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setComponentType('single')}
                    className={`w-full p-4 border-2 rounded-lg text-left transition ${
                      componentType === 'single'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${
                        componentType === 'single' ? 'border-blue-500' : 'border-gray-300'
                      }`}>
                        {componentType === 'single' && (
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        )}
                      </div>
                      <div className="ml-3">
                        <span className="font-medium block mb-1">
                          Single component
                        </span>
                        <p className="text-sm text-gray-600">
                          Best for grouping fields like full address, main information, etc...
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column - Select Component */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select a component
              </label>
              {loading ? (
                <div className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-500">
                  Loading components...
                </div>
              ) : availableComponents.length === 0 ? (
                <div className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-500">
                  No components available. Create a component first.
                </div>
              ) : (
                <select
                  value={selectedComponent}
                  onChange={(e) => setSelectedComponent(e.target.value)}
                  className="w-full px-4 py-2 border border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select...</option>
                  {availableComponents.map((component) => (
                    <option key={component.id} value={component.name}>
                      {component.category} - {component.displayName}
                    </option>
                  ))}
                </select>
              )}

              {/* Show selected component details */}
              {selectedComponentData && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    {selectedComponentData.displayName}
                  </h4>
                  <p className="text-xs text-gray-600 mb-2">
                    Category: {selectedComponentData.category}
                  </p>
                  <p className="text-xs text-gray-600">
                    Fields: {selectedComponentData.fields?.fields?.length || 0}
                  </p>
                  {selectedComponentData.fields?.fields && (
                    <ul className="mt-2 space-y-1">
                      {selectedComponentData.fields.fields.slice(0, 5).map((field: any) => (
                        <li key={field.name} className="text-xs text-gray-500">
                          • {field.displayName} ({field.type})
                        </li>
                      ))}
                      {selectedComponentData.fields.fields.length > 5 && (
                        <li className="text-xs text-gray-400">
                          ... and {selectedComponentData.fields.fields.length - 5} more
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Advanced Options */}
          <div className="mt-6">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Required field</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSubmit}
              disabled={!isFormValid}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              <span>+ Add another field</span>
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
    </div>
  );
};
