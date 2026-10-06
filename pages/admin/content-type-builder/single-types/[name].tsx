import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/admin/Layout';
import { useRouter } from 'next/router';
import { Plus, Trash2, Edit, FileText, Type, ChevronDown, ChevronRight } from 'lucide-react';
import { Field } from '@/lib/types';
import { FieldTypeSelector } from '@/components/admin/FieldTypeSelector';
import { AddFieldModal } from '@/components/admin/AddFieldModal';
import { AddRelationModal } from '@/components/admin/AddRelationModal';
import { AddComponentFieldModal } from '@/components/admin/AddComponentFieldModal';
import { AddDynamicZoneModal } from '@/components/admin/AddDynamicZoneModal';
import { MigrationModal } from '@/components/admin/MigrationModal';

export default function EditSingleType() {
  const router = useRouter();
  const { name } = router.query;

  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [showRelationModal, setShowRelationModal] = useState(false);
  const [showComponentModal, setShowComponentModal] = useState(false);
  const [showDynamicZoneModal, setShowDynamicZoneModal] = useState(false);
  const [selectedFieldType, setSelectedFieldType] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [migrationStatus, setMigrationStatus] = useState<{
    isOpen: boolean;
    status: 'migrating' | 'success' | 'error';
    message?: string;
    error?: string;
  }>({
    isOpen: false,
    status: 'migrating',
  });

  const [contentType, setContentType] = useState({
    name: '',
    displayName: '',
    description: '',
  });

  const [fields, setFields] = useState<Field[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedComponents, setExpandedComponents] = useState<Set<number>>(new Set());
  const [componentDefinitions, setComponentDefinitions] = useState<Record<string, any>>({});

  // Load existing single type for editing
  useEffect(() => {
    if (name) {
      setIsLoading(true);
      loadSingleType(name as string);
    }
  }, [name]);

  const loadSingleType = async (itemName: string) => {
    try {
      console.log('[EditSingleType] Loading:', itemName);
      const endpoint = `/api/single-types/${itemName}`;
      
      console.log('[EditSingleType] Fetching from:', endpoint);
      const response = await fetch(endpoint);
      const result = await response.json();
      console.log('[EditSingleType] Response:', result);

      if (response.ok && result.data) {
        const data = result.data;
        setContentType({
          name: data.name,
          displayName: data.displayName,
          description: data.description || '',
        });
        const loadedFields = data.fields?.fields || [];
        setFields(loadedFields);
        
        // Fetch component definitions for any component fields
        loadedFields.forEach((field: Field) => {
          if (field.type === 'component' && field.componentRef) {
            fetchComponentDefinition(field.componentRef);
          }
          if (field.type === 'dynamiczone' && field.componentRef) {
            const componentNames = field.componentRef.split(',');
            componentNames.forEach(compName => fetchComponentDefinition(compName.trim()));
          }
        });
      } else {
        alert('Failed to load single type');
        router.push('/admin/content-type-builder/single-types');
      }
    } catch (error) {
      console.error('Error loading single type:', error);
      alert('Failed to load single type');
      router.push('/admin/content-type-builder/single-types');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchComponentDefinition = async (componentName: string) => {
    if (componentDefinitions[componentName]) return;
    
    try {
      const response = await fetch(`/api/components/${componentName}`);
      const result = await response.json();
      if (response.ok) {
        setComponentDefinitions(prev => ({
          ...prev,
          [componentName]: result.data
        }));
      }
    } catch (error) {
      console.error('Error fetching component definition:', error);
    }
  };

  const toggleComponentExpansion = (index: number, componentRef: string) => {
    const newExpanded = new Set(expandedComponents);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
      if (componentRef && !componentDefinitions[componentRef]) {
        fetchComponentDefinition(componentRef);
      }
    }
    setExpandedComponents(newExpanded);
  };

  const handleSelectFieldType = (fieldType: string) => {
    setSelectedFieldType(fieldType);
    setShowFieldSelector(false);
    
    if (fieldType === 'relation') {
      setShowRelationModal(true);
    } else if (fieldType === 'component') {
      setShowComponentModal(true);
    } else if (fieldType === 'dynamic-zone') {
      setShowDynamicZoneModal(true);
    } else {
      setShowAddFieldModal(true);
    }
  };

  const handleAddField = (field: Field) => {
    setFields([...fields, field]);
    setShowAddFieldModal(false);
    setShowRelationModal(false);
    setShowComponentModal(false);
    setShowDynamicZoneModal(false);
    
    if (field.type === 'component' && field.componentRef) {
      fetchComponentDefinition(field.componentRef);
    }
    
    if (field.type === 'dynamiczone' && field.componentRef) {
      const componentNames = field.componentRef.split(',');
      componentNames.forEach(compName => fetchComponentDefinition(compName.trim()));
    }
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!contentType.name || !contentType.displayName) {
      alert('Invalid single type data');
      return;
    }

    if (fields.length === 0) {
      alert('Please add at least one field');
      return;
    }

    setIsSaving(true);
    setMigrationStatus({
      isOpen: true,
      status: 'migrating',
      message: 'Updating single type...',
    });

    try {
      const endpoint = `/api/single-types/${contentType.name}`;
      const body = {
        name: contentType.name,
        displayName: contentType.displayName,
        description: contentType.description,
        fields: { fields },
      };

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok) {
        setMigrationStatus({
          isOpen: true,
          status: 'success',
          message: `"${contentType.displayName}" has been updated successfully!`,
        });

        setTimeout(() => {
          router.push('/admin/content-type-builder/single-types');
        }, 2000);
      } else {
        setMigrationStatus({
          isOpen: true,
          status: 'error',
          message: 'Failed to update single type',
          error: result.error || 'Unknown error occurred',
        });
      }
    } catch (error: any) {
      console.error('Error saving single type:', error);
      setMigrationStatus({
        isOpen: true,
        status: 'error',
        message: 'Failed to update single type',
        error: error.message || 'Network error occurred',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center">
          <div className="text-center">
            <svg className="animate-spin h-10 w-10 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-600">Loading single type...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <button
                onClick={() => router.push('/admin/content-type-builder/single-types')}
                className="text-blue-600 hover:text-blue-700 mb-2 flex items-center space-x-1"
              >
                <span>←</span>
                <span>Back to Single Types</span>
              </button>
              <h1 className="text-3xl font-bold text-gray-900">
                {contentType.displayName}
              </h1>
              <p className="text-sm text-gray-500 mt-1">Edit schema for {contentType.name}</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFieldSelector(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center space-x-2"
              >
                <Plus size={16} />
                <span>Add Field</span>
              </button>
            </div>
          </div>

          {/* Fields List */}
          {fields.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-24 h-24 bg-blue-50 rounded-lg flex items-center justify-center">
                  <FileText size={48} className="text-blue-300" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Add your first field to this Single Type
              </h2>
              <button
                onClick={() => setShowFieldSelector(true)}
                className="mt-6 px-6 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center space-x-2 mx-auto"
              >
                <Plus size={18} />
                <span>Add new field</span>
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow">
              <div className="divide-y divide-gray-200">
                {fields.map((field, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between p-4 hover:bg-gray-50">
                      <div className="flex items-center space-x-4 flex-1">
                        {field.type === 'component' && field.componentRef && (
                          <button
                            onClick={() => toggleComponentExpansion(index, field.componentRef!)}
                            className="text-gray-600 hover:text-gray-900 focus:outline-none"
                          >
                            {expandedComponents.has(index) ? (
                              <ChevronDown size={18} />
                            ) : (
                              <ChevronRight size={18} />
                            )}
                          </button>
                        )}
                        
                        <div className={`w-10 h-10 rounded flex items-center justify-center ${
                          field.type === 'relation' ? 'bg-blue-100' : 
                          field.type === 'component' ? 'bg-purple-100' : 
                          field.type === 'dynamiczone' ? 'bg-indigo-100' :
                          'bg-green-100'
                        }`}>
                          {field.type === 'dynamiczone' ? (
                            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                          ) : (
                            <Type size={20} className="text-green-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{field.displayName}</h3>
                          <p className="text-sm text-gray-500">
                            {field.name} • {field.type}
                            {field.type === 'component' && field.componentRef && (
                              <> • {field.multiple ? 'Repeatable' : 'Single'} Component ({field.componentRef})</>
                            )}
                            {field.type === 'dynamiczone' && field.componentRef && (
                              <> • {field.componentRef.split(',').length} components available</>
                            )}
                            {field.required && ' • Required'}
                            {field.unique && ' • Unique'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleRemoveField(index)}
                          className="p-2 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Save Button */}
              <div className="p-6 bg-gray-50 border-t flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-3 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isSaving && (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  <span>{isSaving ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <FieldTypeSelector
        isOpen={showFieldSelector}
        onClose={() => setShowFieldSelector(false)}
        onSelectFieldType={handleSelectFieldType}
        collectionName={contentType.displayName || 'Single Type'}
      />

      <AddFieldModal
        isOpen={showAddFieldModal}
        onClose={() => setShowAddFieldModal(false)}
        onSubmit={handleAddField}
        fieldType={selectedFieldType}
        collectionName={contentType.displayName || 'Single Type'}
        existingFieldNames={fields.map(f => f.name.toLowerCase())}
      />

      <AddRelationModal
        isOpen={showRelationModal}
        onClose={() => setShowRelationModal(false)}
        onSubmit={handleAddField}
        currentCollectionName={contentType.name}
        currentCollectionDisplayName={contentType.displayName || 'Single Type'}
        existingFieldNames={fields.map(f => f.name.toLowerCase())}
      />

      <AddComponentFieldModal
        isOpen={showComponentModal}
        onClose={() => setShowComponentModal(false)}
        onSubmit={handleAddField}
        collectionName={contentType.displayName || 'Single Type'}
        existingFieldNames={fields.map(f => f.name.toLowerCase())}
      />

      <AddDynamicZoneModal
        isOpen={showDynamicZoneModal}
        onClose={() => setShowDynamicZoneModal(false)}
        onSubmit={handleAddField}
        collectionName={contentType.displayName || 'Single Type'}
        existingFieldNames={fields.map(f => f.name.toLowerCase())}
      />

      <MigrationModal
        isOpen={migrationStatus.isOpen}
        status={migrationStatus.status}
        message={migrationStatus.message}
        error={migrationStatus.error}
      />
    </Layout>
  );
}
