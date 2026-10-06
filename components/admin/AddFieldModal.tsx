import React, { useState } from 'react';
import { X, Type } from 'lucide-react';
import { Field, FieldType } from '@/lib/types';

interface AddFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (field: Field) => void;
  fieldType: string;
  collectionName: string;
  existingFieldNames?: string[];
  editingField?: Field | null;
}

export const AddFieldModal: React.FC<AddFieldModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  fieldType,
  collectionName,
  existingFieldNames = [],
  editingField = null,
}) => {
  const [fieldName, setFieldName] = useState('');
  const [textType, setTextType] = useState<'short' | 'long'>('short');
  const [mediaType, setMediaType] = useState<'multiple' | 'single'>('multiple');
  const [dateFormat, setDateFormat] = useState<'date' | 'datetime' | 'time'>('date');
  const [numberFormat, setNumberFormat] = useState<'integer' | 'biginteger' | 'decimal'>('integer');
  const [required, setRequired] = useState(false);
  const [unique, setUnique] = useState(false);
  const [isUid, setIsUid] = useState(false);

  // Load editing field data when modal opens
  React.useEffect(() => {
    if (isOpen && editingField) {
      setFieldName(editingField.displayName);
      setRequired(editingField.required || false);
      setUnique(editingField.unique || false);
      setIsUid(editingField.unique || false); // UID is same as unique
      
      if (editingField.type === 'text') {
        setTextType('long');
      } else if (editingField.type === 'string') {
        setTextType('short');
      }
      
      if (editingField.type === 'media') {
        setMediaType(editingField.multiple ? 'multiple' : 'single');
      }
    } else if (isOpen && !editingField) {
      // Reset for new field
      setFieldName('');
      setTextType('short');
      setMediaType('multiple');
      setDateFormat('date');
      setNumberFormat('integer');
      setRequired(false);
      setUnique(false);
      setIsUid(false);
    }
  }, [isOpen, editingField]);

  if (!isOpen) return null;

  // Validate field name - only letters, numbers, and underscores allowed
  const validateFieldName = (name: string): { isValid: boolean; error: string } => {
    if (!name.trim()) {
      return { isValid: false, error: 'Field name is required' };
    }

    // Check if starts with a letter
    if (!/^[a-zA-Z]/.test(name)) {
      return { isValid: false, error: 'Field name must start with a letter' };
    }

    // Check for invalid characters (anything except letters, numbers, underscores)
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
      return { 
        isValid: false, 
        error: 'Field name can only contain letters, numbers, and underscores. Hyphens (-) and spaces are not allowed' 
      };
    }

    // Check length
    if (name.length < 2) {
      return { isValid: false, error: 'Field name must be at least 2 characters long' };
    }

    if (name.length > 50) {
      return { isValid: false, error: 'Field name must be less than 50 characters' };
    }

    // Check for duplicate field names
    if (existingFieldNames.includes(name.toLowerCase())) {
      return { isValid: false, error: 'A field with this name already exists' };
    }

    return { isValid: true, error: '' };
  };

  const validation = validateFieldName(fieldName);
  const isFormValid = validation.isValid;

  const handleSubmit = () => {
    if (!isFormValid) {
      return;
    }

    const field: Field = {
      name: editingField ? editingField.name : fieldName.toLowerCase(), // Keep original name when editing
      displayName: fieldName,
      type: fieldType === 'text' && textType === 'long' ? 'text' : (fieldType as FieldType),
      required,
      unique: unique || isUid || fieldType === 'uid', // If UID is checked or field type is UID, unique is automatically true
      // Add multiple property for media fields
      ...(fieldType === 'media' && { multiple: mediaType === 'multiple' }),
    };

    onSubmit(field);
    
    // Reset form only if not editing
    if (!editingField) {
      setFieldName('');
      setTextType('short');
      setMediaType('multiple');
      setDateFormat('date');
      setNumberFormat('integer');
      setRequired(false);
      setUnique(false);
      setIsUid(false);
    }
  };

  const getFieldTitle = () => {
    switch (fieldType) {
      case 'text':
        return 'Text';
      case 'richtext':
        return 'Rich text';
      case 'number':
        return 'Number';
      case 'boolean':
        return 'Boolean';
      case 'date':
        return 'Date';
      case 'email':
        return 'Email';
      case 'media':
        return 'Media';
      default:
        return fieldType;
    }
  };

  const getFieldDescription = () => {
    switch (fieldType) {
      case 'text':
        return 'Small or long text like title or description';
      case 'richtext':
        return 'Rich text editor for content';
      case 'number':
        return 'Numbers (integer, float, decimal)';
      case 'boolean':
        return 'Yes or no, true or false';
      case 'date':
        return 'A date picker with hours, minutes and seconds';
      case 'email':
        return 'Email field with validation';
      case 'media':
        return 'Files like images, videos, etc';
      default:
        return '';
    }
  };

  const getFieldIcon = () => {
    switch (fieldType) {
      case 'date':
        return { bg: 'bg-orange-100', color: 'text-orange-600' };
      case 'number':
        return { bg: 'bg-red-100', color: 'text-red-600' };
      case 'text':
        return { bg: 'bg-green-100', color: 'text-green-600' };
      case 'boolean':
        return { bg: 'bg-green-100', color: 'text-green-600' };
      case 'email':
        return { bg: 'bg-red-100', color: 'text-red-600' };
      case 'media':
        return { bg: 'bg-purple-100', color: 'text-purple-600' };
      default:
        return { bg: 'bg-gray-100', color: 'text-gray-600' };
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <button onClick={onClose} className="text-blue-600 hover:text-blue-700">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <div className={`w-8 h-8 ${getFieldIcon().bg} rounded flex items-center justify-center`}>
              <Type size={20} className={getFieldIcon().color} />
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
          <h3 className="text-2xl font-semibold mb-2">Add new {getFieldTitle()} field</h3>
          <p className="text-sm text-gray-600 mb-6">{getFieldDescription()}</p>

          {/* Field Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name
            </label>
            <input
              type="text"
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              disabled={!!editingField} // Disable name editing when editing existing field
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                fieldName && !validation.isValid
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-blue-500'
              } ${editingField ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              placeholder="e.g., title, description, user_name"
              autoFocus={!editingField}
            />
            {editingField ? (
              <p className="text-xs text-gray-500 mt-1">
                Field name cannot be changed after creation
              </p>
            ) : fieldName && !validation.isValid ? (
              <p className="text-xs text-red-600 mt-1 flex items-center">
                <span className="mr-1">⚠️</span>
                {validation.error}
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">
                Only letters, numbers, and underscores (_) are allowed. Must start with a letter.
              </p>
            )}
          </div>

          {/* Text Type Selection (only for text fields) */}
          {fieldType === 'text' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Type
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setTextType('short')}
                  className={`p-4 border-2 rounded-lg text-left transition ${
                    textType === 'short'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center mb-2">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      textType === 'short' ? 'border-blue-500' : 'border-gray-300'
                    }`}>
                      {textType === 'short' && (
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      )}
                    </div>
                    <span className="ml-3 font-medium text-blue-600">Short text</span>
                  </div>
                  <p className="text-sm text-gray-600 ml-8">
                    Best for titles, names, links (URL). It also enables exact search on field.
                  </p>
                </button>

                <button
                  onClick={() => setTextType('long')}
                  className={`p-4 border-2 rounded-lg text-left transition ${
                    textType === 'long'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center mb-2">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      textType === 'long' ? 'border-blue-500' : 'border-gray-300'
                    }`}>
                      {textType === 'long' && (
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      )}
                    </div>
                    <span className="ml-3 font-medium">Long text</span>
                  </div>
                  <p className="text-sm text-gray-600 ml-8">
                    Best for descriptions, biography. Exact search is disabled.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Media Type Selection (only for media fields) */}
          {fieldType === 'media' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Type
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setMediaType('multiple')}
                  className={`p-4 border-2 rounded-lg text-left transition ${
                    mediaType === 'multiple'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center mb-2">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      mediaType === 'multiple' ? 'border-blue-500' : 'border-gray-300'
                    }`}>
                      {mediaType === 'multiple' && (
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      )}
                    </div>
                    <span className="ml-3 font-medium text-blue-600">Multiple media</span>
                  </div>
                  <p className="text-sm text-gray-600 ml-8">
                    Best for sliders, carousels or multiple files download
                  </p>
                </button>

                <button
                  onClick={() => setMediaType('single')}
                  className={`p-4 border-2 rounded-lg text-left transition ${
                    mediaType === 'single'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center mb-2">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      mediaType === 'single' ? 'border-blue-500' : 'border-gray-300'
                    }`}>
                      {mediaType === 'single' && (
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      )}
                    </div>
                    <span className="ml-3 font-medium">Single media</span>
                  </div>
                  <p className="text-sm text-gray-600 ml-8">
                    Best for avatar, profile picture or cover
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Date Format Selection (only for date fields) */}
          {fieldType === 'date' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <div className="relative">
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value as 'date' | 'datetime' | 'time')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white cursor-pointer"
                >
                  <option value="">Choose here</option>
                  <option value="date">date (ex: 01/01/2026)</option>
                  <option value="datetime">datetime (ex: 01/01/2026 00:00 AM)</option>
                  <option value="time">time (ex: 00:00 AM)</option>
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                    <path d="M1 1L6 6L11 1" stroke="#666" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Number Format Selection (only for number fields) */}
          {fieldType === 'number' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number format
              </label>
              <div className="relative">
                <select
                  value={numberFormat}
                  onChange={(e) => setNumberFormat(e.target.value as 'integer' | 'biginteger' | 'decimal')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white cursor-pointer"
                >
                  <option value="">Choose here</option>
                  <option value="integer">integer (ex: 10)</option>
                  <option value="biginteger">big integer (ex: 123456789)</option>
                  <option value="decimal">decimal (ex: 2.22)</option>
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                    <path d="M1 1L6 6L11 1" stroke="#666" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Options */}
          <div className="space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Required field</span>
            </label>

            {fieldType === 'text' && (
              <>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={unique}
                    onChange={(e) => {
                      setUnique(e.target.checked);
                      if (!e.target.checked) {
                        setIsUid(false); // Uncheck UID if unique is unchecked
                      }
                    }}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Unique field</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isUid}
                    onChange={(e) => {
                      setIsUid(e.target.checked);
                      if (e.target.checked) {
                        setUnique(true); // Auto-check unique when UID is checked
                      }
                    }}
                    className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-700">UID (Unique Identifier)</span>
                    <span className="text-xs text-gray-500">
                      This field will be unique across the entire table and validated on creation
                    </span>
                  </div>
                </label>
              </>
            )}
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
              {editingField ? 'Update' : 'Finish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
