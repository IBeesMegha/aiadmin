import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/admin/Layout';
import { useRouter } from 'next/router';
import { Plus, Trash2, Edit, ArrowLeft, Save, GripVertical } from 'lucide-react';
import { Field } from '@/lib/types';
import { FieldTypeSelector } from '@/components/admin/FieldTypeSelector';
import { AddFieldModal } from '@/components/admin/AddFieldModal';
import { AddRelationModal } from '@/components/admin/AddRelationModal';
import { MigrationModal } from '@/components/admin/MigrationModal';
import Link from 'next/link';

export default function EditCollectionType() {
  const router = useRouter();
  const { name } = router.query;

  const [collectionType, setCollectionType] = useState<any>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [showRelationModal, setShowRelationModal] = useState(false);
  const [selectedFieldType, setSelectedFieldType] = useState('');
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<Field | null>(null);

  const [migrationStatus, setMigrationStatus] = useState<{
    isOpen: boolean;
    status: 'migrating' | 'success' | 'error';
    message?: string;
    error?: string;
  }>({
    isOpen: false,
    status: 'migrating',
  });

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (name) {
      fetchCollectionType();
    }
  }, [name]);

  const fetchCollectionType = async () => {
    try {
      const response = await fetch(`/api/collection-types/${name}`);
      const data = await response.json();
      
      if (data.data) {
        setCollectionType(data.data);
        setFields(data.data.fields?.fields || []);
      }
    } catch (error) {
      console.error('Error fetching collection type:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFieldType = (fieldType: string) => {
    setSelectedFieldType(fieldType);
    setShowFieldSelector(false);
    
    // Show relation modal for relation type, otherwise show regular field modal
    if (fieldType === 'relation') {
      setShowRelationModal(true);
    } else {
      setShowAddFieldModal(true);
    }
  };

  const handleAddField = (field: Field) => {
    if (editingFieldIndex !== null) {
      // Update existing field
      const newFields = [...fields];
      newFields[editingFieldIndex] = field;
      setFields(newFields);
      setEditingFieldIndex(null);
      setEditingField(null);
    } else {
      // Add new field
      setFields([...fields, field]);
    }
    setShowAddFieldModal(false);
    setShowRelationModal(false);
  };

  const handleEditField = (index: number) => {
    const field = fields[index];
    setEditingFieldIndex(index);
    setEditingField(field);
    setSelectedFieldType(field.type);
    
    // Show appropriate modal based on field type
    if (field.type === 'relation') {
      setShowRelationModal(true);
    } else {
      setShowAddFieldModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowAddFieldModal(false);
    setShowRelationModal(false);
    setEditingFieldIndex(null);
    setEditingField(null);
  };

  const handleRemoveField = (index: number) => {
    if (confirm('Are you sure you want to remove this field? This will update the database schema.')) {
      setFields(fields.filter((_, i) => i !== index));
    }
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newFields = [...fields];
    const draggedField = newFields[draggedIndex];
    newFields.splice(draggedIndex, 1);
    newFields.splice(index, 0, draggedField);

    setFields(newFields);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Get field icon styling - matching the FieldTypeSelector popup
  const getFieldIconStyle = (fieldType: string) => {
    switch (fieldType) {
      case 'text':
      case 'string':
        return { 
          bg: 'bg-green-100', 
          icon: (
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
          ),
          color: 'text-green-600' 
        };
      case 'richtext':
        return { 
          bg: 'bg-blue-100', 
          icon: (
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
          color: 'text-blue-600' 
        };
      case 'number':
        return { 
          bg: 'bg-red-100', 
          icon: (
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
          ),
          color: 'text-red-600' 
        };
      case 'boolean':
        return { 
          bg: 'bg-green-100', 
          icon: (
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          color: 'text-green-600' 
        };
      case 'date':
        return { 
          bg: 'bg-orange-100', 
          icon: (
            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ),
          color: 'text-orange-600' 
        };
      case 'email':
        return { 
          bg: 'bg-red-100', 
          icon: (
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          ),
          color: 'text-red-600' 
        };
      case 'media':
        return { 
          bg: 'bg-purple-100', 
          icon: (
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ),
          color: 'text-purple-600' 
        };
      case 'relation':
        return { 
          bg: 'bg-blue-100', 
          icon: (
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          ),
          color: 'text-blue-600' 
        };
      case 'component':
        return { 
          bg: 'bg-gray-100', 
          icon: (
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
          ),
          color: 'text-gray-600' 
        };
      case 'dynamiczone':
        return { 
          bg: 'bg-gray-100', 
          icon: (
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          ),
          color: 'text-gray-600' 
        };
      case 'json':
        return { 
          bg: 'bg-blue-100', 
          icon: (
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          ),
          color: 'text-blue-600' 
        };
      case 'password':
        return { 
          bg: 'bg-orange-100', 
          icon: (
            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          ),
          color: 'text-orange-600' 
        };
      case 'enumeration':
        return { 
          bg: 'bg-pink-100', 
          icon: (
            <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          ),
          color: 'text-pink-600' 
        };
      case 'uid':
        return { 
          bg: 'bg-purple-100', 
          icon: (
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
          ),
          color: 'text-purple-600' 
        };
      default:
        return { 
          bg: 'bg-gray-100', 
          icon: (
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
          color: 'text-gray-600' 
        };
    }
  };

  const handleSave = async () => {
    if (fields.length === 0) {
      alert('Please add at least one field');
      return;
    }

    setIsSaving(true);
    setMigrationStatus({
      isOpen: true,
      status: 'migrating',
      message: 'Updating database schema...',
    });

    try {
      const response = await fetch(`/api/collection-types/${name}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: collectionType.displayName,
          description: collectionType.description,
          fields: { fields },
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMigrationStatus({
          isOpen: true,
          status: 'success',
          message: result.message || 'Schema updated successfully!',
        });

        // If requiresRestart is true, keep modal open for user to read instructions
        // Otherwise, auto-redirect after 3 seconds
        if (!result.requiresRestart) {
          setTimeout(() => {
            router.push('/admin/content-type-builder/collection-types');
          }, 3000);
        }
      } else {
        setMigrationStatus({
          isOpen: true,
          status: 'error',
          message: 'Failed to update schema',
          error: result.error || 'Unknown error occurred',
        });
      }
    } catch (error: any) {
      setMigrationStatus({
        isOpen: true,
        status: 'error',
        message: 'Failed to update schema',
        error: error.message || 'Network error occurred',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-8">Loading...</div>
      </Layout>
    );
  }

  if (!collectionType) {
    return (
      <Layout>
        <div className="p-8">Collection type not found</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin/content-type-builder/collection-types"
            className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft size={20} />
            <span>Back to Collection Types</span>
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {collectionType.displayName}
              </h1>
              <p className="text-gray-600 mt-1">
                Edit schema for {collectionType.name}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFieldSelector(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus size={20} />
                <span>Add Field</span>
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    <span>Save</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Fields List */}
        <div className="bg-white rounded-lg shadow">
          {fields.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-600 mb-4">No fields yet</p>
              <button
                onClick={() => setShowFieldSelector(true)}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus size={20} />
                <span>Add First Field</span>
              </button>
            </div>
          ) : (
            <div>
              <div className="divide-y divide-gray-200">
                {fields.map((field, index) => {
                  const iconStyle = getFieldIconStyle(field.type);
                  return (
                    <div
                      key={index}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center justify-between p-4 hover:bg-gray-50 cursor-move transition ${
                        draggedIndex === index ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        {/* Drag Handle */}
                        <div className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing">
                          <GripVertical size={20} />
                        </div>

                        {/* Field Icon */}
                        <div className={`w-10 h-10 rounded flex items-center justify-center ${iconStyle.bg}`}>
                          {iconStyle.icon}
                        </div>

                        <div>
                          <h3 className="font-medium text-gray-900">
                            {field.displayName}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {field.name} • {field.type}
                            {field.type === 'relation' && field.relation && (
                              <> • {field.relation.type} with {field.relation.targetCollectionDisplay}</>
                            )}
                            {field.required && ' • Required'}
                            {field.unique && ' • Unique'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditField(index)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                          title="Edit field"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleRemoveField(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete field"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Another Field Button */}
              <div className="p-4 bg-blue-50 border-t border-blue-100">
                <button
                  onClick={() => setShowFieldSelector(true)}
                  className="w-full py-3 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-lg flex items-center justify-center space-x-2 transition"
                >
                  <Plus size={18} />
                  <span>Add another field to this collection type</span>
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
        collectionName={collectionType.displayName}
      />

      <AddFieldModal
        isOpen={showAddFieldModal}
        onClose={handleCloseModal}
        onSubmit={handleAddField}
        fieldType={selectedFieldType}
        collectionName={collectionType.displayName}
        existingFieldNames={fields.map(f => f.name.toLowerCase()).filter((_, i) => i !== editingFieldIndex)}
        editingField={editingField}
      />

      <AddRelationModal
        isOpen={showRelationModal}
        onClose={handleCloseModal}
        onSubmit={handleAddField}
        currentCollectionName={collectionType.name}
        currentCollectionDisplayName={collectionType.displayName}
        existingFieldNames={fields.map(f => f.name.toLowerCase()).filter((_, i) => i !== editingFieldIndex)}
        editingField={editingField}
      />

      <MigrationModal
        isOpen={migrationStatus.isOpen}
        status={migrationStatus.status}
        message={migrationStatus.message}
        error={migrationStatus.error}
        onClose={() => {
          setMigrationStatus({ ...migrationStatus, isOpen: false });
          // Redirect to collection types list after closing
          if (migrationStatus.status === 'success') {
            router.push('/admin/content-type-builder/collection-types');
          }
        }}
      />
    </Layout>
  );
}
