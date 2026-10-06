import React, { useState, useEffect } from 'react';
import { X, Link2, ArrowRight, ArrowLeft, ArrowLeftRight } from 'lucide-react';
import { Field } from '@/lib/types';

interface AddRelationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (field: Field) => void;
  currentCollectionName: string;
  currentCollectionDisplayName: string;
  existingFieldNames?: string[];
  editingField?: Field | null;
}

type RelationType = 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany';

interface RelationConfig {
  type: RelationType;
  icon: React.ReactNode;
  label: string;
  description: string;
  leftText: string;
  rightText: string;
}

export const AddRelationModal: React.FC<AddRelationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentCollectionName,
  currentCollectionDisplayName,
  existingFieldNames = [],
  editingField = null,
}) => {
  const [availableCollections, setAvailableCollections] = useState<any[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [selectedCollectionDisplay, setSelectedCollectionDisplay] = useState<string>('');
  const [relationType, setRelationType] = useState<RelationType>('manyToOne');
  const [fieldName, setFieldName] = useState('');
  const [targetFieldName, setTargetFieldName] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch available collections
  useEffect(() => {
    if (isOpen) {
      fetchCollections();
    }
  }, [isOpen]);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/collection-types');
      const result = await response.json();
      if (result.data) {
        // Filter out current collection
        const filtered = result.data.filter(
          (col: any) => col.name !== currentCollectionName
        );
        setAvailableCollections(filtered);
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate field names based on selection
  useEffect(() => {
    if (selectedCollection && selectedCollectionDisplay) {
      // Generate field name for current collection
      const baseName = selectedCollectionDisplay.toLowerCase().replace(/\s+/g, '_');
      if (relationType === 'oneToMany' || relationType === 'manyToMany') {
        setFieldName(`${baseName}s`); // Plural
      } else {
        setFieldName(baseName); // Singular
      }

      // Generate field name for target collection
      const currentBaseName = currentCollectionDisplayName.toLowerCase().replace(/\s+/g, '_');
      if (relationType === 'manyToOne' || relationType === 'manyToMany') {
        setTargetFieldName(`${currentBaseName}s`); // Plural
      } else {
        setTargetFieldName(currentBaseName); // Singular
      }
    }
  }, [selectedCollection, selectedCollectionDisplay, relationType, currentCollectionDisplayName]);

  const relationConfigs: Record<RelationType, RelationConfig> = {
    oneToOne: {
      type: 'oneToOne',
      icon: (
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
          <div className="w-8 h-0.5 bg-blue-600"></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
        </div>
      ),
      label: 'One to One',
      description: 'A has one B',
      leftText: 'has one',
      rightText: 'belongs to one',
    },
    oneToMany: {
      type: 'oneToMany',
      icon: (
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
          <div className="w-8 h-0.5 bg-blue-600"></div>
          <div className="flex flex-col space-y-0.5">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
          </div>
        </div>
      ),
      label: 'One to Many',
      description: 'A has many B',
      leftText: 'has many',
      rightText: 'belongs to one',
    },
    manyToOne: {
      type: 'manyToOne',
      icon: (
        <div className="flex items-center space-x-1">
          <div className="flex flex-col space-y-0.5">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
          </div>
          <div className="w-8 h-0.5 bg-blue-600"></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
        </div>
      ),
      label: 'Many to One',
      description: 'Many A belong to one B',
      leftText: 'belongs to one',
      rightText: 'has many',
    },
    manyToMany: {
      type: 'manyToMany',
      icon: (
        <div className="flex items-center space-x-1">
          <div className="flex flex-col space-y-0.5">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
          </div>
          <div className="w-8 h-0.5 bg-blue-600"></div>
          <div className="flex flex-col space-y-0.5">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
          </div>
        </div>
      ),
      label: 'Many to Many',
      description: 'A has many B and B has many A',
      leftText: 'has many',
      rightText: 'has many',
    },
  };

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

    if (existingFieldNames.includes(name.toLowerCase())) {
      return { isValid: false, error: 'A field with this name already exists' };
    }

    return { isValid: true, error: '' };
  };

  const validation = validateFieldName(fieldName);
  const isFormValid = validation.isValid && selectedCollection && fieldName && targetFieldName;

  const handleSubmit = () => {
    if (!isFormValid) return;

    const field: Field = {
      name: fieldName.toLowerCase(),
      displayName: fieldName,
      type: 'relation',
      relation: {
        type: relationType,
        targetCollection: selectedCollection,
        targetCollectionDisplay: selectedCollectionDisplay,
        targetField: targetFieldName.toLowerCase(),
      },
    };

    onSubmit(field);
    
    // Reset form
    setSelectedCollection('');
    setSelectedCollectionDisplay('');
    setRelationType('manyToOne');
    setFieldName('');
    setTargetFieldName('');
  };

  const handleClose = () => {
    // Reset form
    setSelectedCollection('');
    setSelectedCollectionDisplay('');
    setRelationType('manyToOne');
    setFieldName('');
    setTargetFieldName('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-3">
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
            <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-white font-bold text-sm">
              T
            </div>
            <div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Link2 size={14} />
                <span>{currentCollectionDisplayName}</span>
                <span>/</span>
                <span>{currentCollectionDisplayName}_{fieldName || 'field'}</span>
              </div>
            </div>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {/* Title */}
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-xl font-semibold">Edit {currentCollectionDisplayName}_{fieldName || 'field'}</h2>
          <p className="text-sm text-gray-500 mt-1">Refers to a Collection Type</p>
        </div>

        {/* Tabs */}
        <div className="border-b px-6">
          <div className="flex space-x-6">
            <button className="pb-3 text-sm font-medium text-blue-600 border-b-2 border-blue-600">
              BASIC SETTINGS
            </button>
            <button className="pb-3 text-sm font-medium text-gray-500">
              ADVANCED SETTINGS
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-280px)]">
          {/* Relation Builder */}
          <div className="mb-6">
            <div className="flex items-center justify-between gap-4">
              {/* Left Side - Current Collection */}
              <div className="flex-1">
                <div className="text-center">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">{currentCollectionDisplayName}</h4>
                  <div className="mb-3">
                    <label className="block text-xs text-gray-600 mb-1">Field name</label>
                    <input
                      type="text"
                      value={fieldName}
                      onChange={(e) => setFieldName(e.target.value)}
                      className={`w-full px-3 py-2 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        fieldName && !validation.isValid
                          ? 'border-red-500'
                          : 'border-gray-300'
                      }`}
                      placeholder="product_category"
                    />
                    {fieldName && !validation.isValid && (
                      <p className="text-xs text-red-600 mt-1">{validation.error}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Middle - Relation Type Selector */}
              <div className="flex-shrink-0 flex items-center gap-2">
                {Object.values(relationConfigs).map((config) => (
                  <button
                    key={config.type}
                    onClick={() => setRelationType(config.type)}
                    className={`group relative p-2 border rounded transition ${
                      relationType === config.type
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-300'
                    }`}
                    title={config.label}
                  >
                    <div className="flex items-center justify-center">
                      {config.icon}
                    </div>
                    {/* Tooltip */}
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-10 pointer-events-none">
                      <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                        {config.label}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Right Side - Target Collection */}
              <div className="flex-1">
                <div className="text-center">
                  <select
                    value={selectedCollection}
                    onChange={(e) => {
                      const selected = availableCollections.find(c => c.name === e.target.value);
                      setSelectedCollection(e.target.value);
                      setSelectedCollectionDisplay(selected?.displayName || '');
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
                    disabled={loading}
                  >
                    <option value="">Select Collection</option>
                    {availableCollections.map((collection) => (
                      <option key={collection.id} value={collection.name}>
                        {collection.displayName}
                      </option>
                    ))}
                  </select>
                  {selectedCollection && (
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Field name</label>
                      <input
                        type="text"
                        value={targetFieldName}
                        onChange={(e) => setTargetFieldName(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="products"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Relation Description */}
            {selectedCollection && (
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">{currentCollectionDisplayName}</span>
                  {' '}{relationConfigs[relationType].leftText}{' '}
                  <span className="font-medium">{selectedCollectionDisplay}</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSubmit}
              disabled={!isFormValid}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Add another field
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isFormValid}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              Finish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
