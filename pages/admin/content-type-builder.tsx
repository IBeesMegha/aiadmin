import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/admin/Layout';
import { useRouter } from 'next/router';
import { Plus, Trash2, Edit, FileText, Type, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { Field } from '@/lib/types';
import { CreateCollectionTypeModal } from '@/components/admin/CreateCollectionTypeModal';
import { FieldTypeSelector } from '@/components/admin/FieldTypeSelector';
import { AddFieldModal } from '@/components/admin/AddFieldModal';
import { AddRelationModal } from '@/components/admin/AddRelationModal';
import { AddComponentFieldModal } from '@/components/admin/AddComponentFieldModal';
import { AddDynamicZoneModal } from '@/components/admin/AddDynamicZoneModal';
import { MigrationModal } from '@/components/admin/MigrationModal';
import toast from 'react-hot-toast';

export default function ContentTypeBuilder() {
  const router = useRouter();
  const { type = 'collection', name, edit } = router.query;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [showRelationModal, setShowRelationModal] = useState(false);
  const [showComponentModal, setShowComponentModal] = useState(false);
  const [showDynamicZoneModal, setShowDynamicZoneModal] = useState(false);
  const [selectedFieldType, setSelectedFieldType] = useState('');
  const [isEditing, setIsEditing] = useState(false);
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
    category: 'default',
  });

  const [fields, setFields] = useState<Field[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedComponents, setExpandedComponents] = useState<Set<number>>(new Set());
  const [componentDefinitions, setComponentDefinitions] = useState<Record<string, any>>({});
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Load existing component/collection for editing
  useEffect(() => {
    if (edit && type) {
      setIsEditing(true);
      setIsLoading(true);
      loadContentType(edit as string, type as string);
    }
  }, [edit, type]);

  const loadContentType = async (itemName: string, itemType: string) => {
    try {
      console.log('[ContentTypeBuilder] Loading:', { itemName, itemType });
      let endpoint = '';
      if (itemType === 'component') {
        endpoint = `/api/components/${itemName}`;
      } else if (itemType === 'collection') {
        endpoint = `/api/collection-types/${itemName}`;
      } else if (itemType === 'single') {
        endpoint = `/api/single-types/${itemName}`;
      }

      console.log('[ContentTypeBuilder] Fetching from:', endpoint);
      const response = await fetch(endpoint);
      const result = await response.json();
      console.log('[ContentTypeBuilder] Response:', result);

      if (response.ok && result.data) {
        const data = result.data;
        setContentType({
          name: data.name,
          displayName: data.displayName,
          description: data.description || '',
          category: data.category || 'default',
        });
        const loadedFields = data.fields?.fields || [];
        setFields(loadedFields);
        
        // Fetch component definitions for any component fields
        loadedFields.forEach((field: Field) => {
          if (field.type === 'component' && field.componentRef) {
            fetchComponentDefinition(field.componentRef);
          }
        });
      } else {
        toast.error('Failed to load content type');
        router.push('/admin/content-type-builder');
      }
    } catch (error) {
      console.error('Error loading content type:', error);
      toast.error('Failed to load content type');
      router.push('/admin/content-type-builder');
    } finally {
      setIsLoading(false);
    }
  };

  // Show create modal on mount if no name/edit in query
  useEffect(() => {
    if (!name && !edit && type) {
      setShowCreateModal(true);
    }
  }, [name, edit, type]);

  const handleCreateContentType = (data: { name: string; displayName: string; description?: string }) => {
    setContentType({
      ...data,
      description: data.description || '',
      category: 'default',
    });
    setShowCreateModal(false);
    // Update URL to include name
    router.push(`/admin/content-type-builder?type=${type}&name=${data.name}`, undefined, { shallow: true });
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    // If no content type created yet, go back to content-type-builder without params
    if (!name && !edit) {
      router.push('/admin/content-type-builder', undefined, { shallow: true });
    }
  };

  const handleSelectFieldType = (fieldType: string) => {
    setSelectedFieldType(fieldType);
    setShowFieldSelector(false);
    
    // Show appropriate modal based on field type
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
    
    // If it's a component field, fetch its definition
    if (field.type === 'component' && field.componentRef) {
      fetchComponentDefinition(field.componentRef);
    }
    
    // If it's a dynamic zone field, fetch all component definitions
    if (field.type === 'dynamiczone' && field.componentRef) {
      const componentNames = field.componentRef.split(',');
      componentNames.forEach(name => fetchComponentDefinition(name.trim()));
    }
  };

  const fetchComponentDefinition = async (componentName: string) => {
    if (componentDefinitions[componentName]) return; // Already fetched
    
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
      // Fetch component definition if not already fetched
      if (componentRef && !componentDefinitions[componentRef]) {
        fetchComponentDefinition(componentRef);
      }
    }
    setExpandedComponents(newExpanded);
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
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
    if (!contentType.name || !contentType.displayName) {
      toast.error('Please create a content type first');
      return;
    }

    if (fields.length === 0) {
      toast.error('Please add at least one field');
      return;
    }

    setIsSaving(true);
    
    // For editing, show different message
    if (isEditing) {
      setMigrationStatus({
        isOpen: true,
        status: 'migrating',
        message: 'Updating content type...',
      });
    } else {
      setMigrationStatus({
        isOpen: true,
        status: 'migrating',
        message: 'Creating table and running database migration...',
      });
    }

    try {
      let endpoint = '';
      const body: any = {
        name: contentType.name,
        displayName: contentType.displayName,
        description: contentType.description,
        fields: { fields },
      };

      if (type === 'collection') {
        endpoint = isEditing 
          ? `/api/collection-types/${contentType.name}`
          : '/api/collection-types';
      } else if (type === 'single') {
        endpoint = isEditing
          ? `/api/single-types/${contentType.name}`
          : '/api/single-types';
      } else if (type === 'component') {
        endpoint = isEditing
          ? `/api/components/${contentType.name}`
          : '/api/components';
        body.category = contentType.category;
      }

      const response = await fetch(endpoint, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok) {
        setMigrationStatus({
          isOpen: true,
          status: 'success',
          message: isEditing
            ? `"${contentType.displayName}" has been updated successfully!`
            : `Table "${contentType.displayName}" has been created successfully!`,
        });

        toast.success(
          isEditing
            ? `"${contentType.displayName}" updated successfully!`
            : `"${contentType.displayName}" created successfully!`
        );

        // Wait 2 seconds then redirect
        setTimeout(() => {
          if (type === 'component') {
            router.push('/admin/content-type-builder/components');
          } else {
            router.push('/admin');
          }
        }, 2000);
      } else {
        setMigrationStatus({
          isOpen: true,
          status: 'error',
          message: isEditing ? 'Failed to update content type' : 'Failed to create content type',
          error: result.error || 'Unknown error occurred',
        });
        toast.error(result.error || 'Failed to save content type');
      }
    } catch (error: any) {
      console.error('Error saving content type:', error);
      setMigrationStatus({
        isOpen: true,
        status: 'error',
        message: isEditing ? 'Failed to update content type' : 'Failed to create content type',
        error: error.message || 'Network error occurred',
      });
      toast.error(error.message || 'Network error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Loading state */}
        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <div className="text-center">
              <svg className="animate-spin h-10 w-10 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-600">Loading content type...</p>
            </div>
          </div>
        ) : /* Show field builder if content type is created or being edited */
        (name || edit) && contentType.displayName ? (
          <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {contentType.displayName || name || edit}
                </h1>
                {isEditing && (
                  <p className="text-sm text-gray-500 mt-1">Editing existing {type}</p>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg flex items-center space-x-2">
                  <span>⚙️</span>
                  <span>Configure the view</span>
                </button>
                <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg flex items-center space-x-2">
                  <Edit size={16} />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => setShowFieldSelector(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center space-x-2"
                >
                  <Plus size={16} />
                  <span>Add new field</span>
                </button>
              </div>
            </div>

            {/* Fields List or Empty State */}
            {fields.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="flex justify-center mb-6">
                  <div className="w-24 h-24 bg-blue-50 rounded-lg flex items-center justify-center">
                    <FileText size={48} className="text-blue-300" />
                  </div>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Add your first field to this Collection-Type
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
                  {fields.map((field, index) => {
                    const iconStyle = getFieldIconStyle(field.type);
                    return (
                      <div key={index}>
                        {/* Main Field Row */}
                        <div
                          draggable
                          onDragStart={() => handleDragStart(index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragEnd={handleDragEnd}
                          className={`flex items-center justify-between p-4 hover:bg-gray-50 cursor-move transition ${
                            draggedIndex === index ? 'opacity-50' : ''
                          }`}
                        >
                          <div className="flex items-center space-x-4 flex-1">
                            {/* Drag Handle */}
                            <div className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing">
                              <GripVertical size={20} />
                            </div>

                            {/* Expand/Collapse Button for Component Fields */}
                            {field.type === 'component' && field.componentRef ? (
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
                            ) : (
                              <div className="w-[18px]" /> // Spacer for alignment
                            )}

                            {/* Field Icon */}
                            <div className={`w-10 h-10 rounded flex items-center justify-center ${iconStyle.bg}`}>
                              {iconStyle.icon}
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
                                {field.type === 'relation' && field.relation && (
                                  <> • {field.relation.type} with {field.relation.targetCollectionDisplay}</>
                                )}
                                {field.required && ' • Required'}
                                {field.unique && ' • Unique'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button className="p-2 text-gray-400 hover:text-gray-600">
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleRemoveField(index)}
                              className="p-2 text-gray-400 hover:text-red-600"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>

                        {/* Expanded Component Structure */}
                        {field.type === 'component' &&
                          field.componentRef &&
                          expandedComponents.has(index) &&
                          componentDefinitions[field.componentRef] && (
                            <div className="bg-purple-50 border-l-4 border-purple-400 ml-16 mr-4 mb-2 rounded">
                              <div className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-sm font-semibold text-purple-900 uppercase">
                                    {componentDefinitions[field.componentRef].displayName} Structure
                                  </h4>
                                  <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
                                    {componentDefinitions[field.componentRef].fields?.fields?.length || 0} fields
                                  </span>
                                </div>
                                <div className="space-y-2">
                                  {componentDefinitions[field.componentRef].fields?.fields?.map(
                                    (subField: Field, subIndex: number) => {
                                      const subIconStyle = getFieldIconStyle(subField.type);
                                      return (
                                        <div
                                          key={subIndex}
                                          className="flex items-center space-x-3 p-2 bg-white rounded border border-purple-200"
                                        >
                                          <div
                                            className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${subIconStyle.bg}`}
                                          >
                                            <div className="scale-75">{subIconStyle.icon}</div>
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                              {subField.displayName}
                                              {subField.required && <span className="text-red-500 ml-1">*</span>}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">
                                              {subField.name} • {subField.type}
                                              {subField.type === 'component' && subField.componentRef && (
                                                <> • {subField.multiple ? 'Repeatable' : 'Single'} ({subField.componentRef})</>
                                              )}
                                            </p>
                                          </div>
                                        </div>
                                      );
                                    }
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
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

                {/* Save Button */}
                <div className="p-6 bg-gray-50 border-t flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isSaving && (
                      <svg
                        className="animate-spin h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    )}
                    <span>{isSaving ? (isEditing ? 'Updating...' : 'Saving...') : isEditing ? 'Update' : 'Save'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : !showCreateModal ? (
          <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">
              Content-Type Builder
            </h1>
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600 mb-6">
                Click the + button in the sidebar to create a new content type
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => {
                    router.push('/admin/content-type-builder?type=collection', undefined, { shallow: true });
                    setShowCreateModal(true);
                  }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                >
                  <Plus size={20} />
                  <span>Create Collection Type</span>
                </button>
                <button
                  onClick={() => {
                    router.push('/admin/content-type-builder?type=single', undefined, { shallow: true });
                    setShowCreateModal(true);
                  }}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                >
                  <Plus size={20} />
                  <span>Create Single Type</span>
                </button>
                <button
                  onClick={() => {
                    router.push('/admin/content-type-builder?type=component', undefined, { shallow: true });
                    setShowCreateModal(true);
                  }}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center space-x-2"
                >
                  <Plus size={20} />
                  <span>Create Component</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Modals */}
      <CreateCollectionTypeModal
        isOpen={showCreateModal}
        onClose={handleCloseCreateModal}
        onSubmit={handleCreateContentType}
        type={type as 'collection' | 'single' | 'component'}
      />

      <FieldTypeSelector
        isOpen={showFieldSelector}
        onClose={() => setShowFieldSelector(false)}
        onSelectFieldType={handleSelectFieldType}
        collectionName={contentType.displayName || 'Collection'}
      />

      <AddFieldModal
        isOpen={showAddFieldModal}
        onClose={() => setShowAddFieldModal(false)}
        onSubmit={handleAddField}
        fieldType={selectedFieldType}
        collectionName={contentType.displayName || 'Collection'}
        existingFieldNames={fields.map(f => f.name.toLowerCase())}
      />

      <AddRelationModal
        isOpen={showRelationModal}
        onClose={() => setShowRelationModal(false)}
        onSubmit={handleAddField}
        currentCollectionName={contentType.name}
        currentCollectionDisplayName={contentType.displayName || 'Collection'}
        existingFieldNames={fields.map(f => f.name.toLowerCase())}
      />

      <AddComponentFieldModal
        isOpen={showComponentModal}
        onClose={() => setShowComponentModal(false)}
        onSubmit={handleAddField}
        collectionName={contentType.displayName || 'Collection'}
        existingFieldNames={fields.map(f => f.name.toLowerCase())}
      />

      <AddDynamicZoneModal
        isOpen={showDynamicZoneModal}
        onClose={() => setShowDynamicZoneModal(false)}
        onSubmit={handleAddField}
        collectionName={contentType.displayName || 'Collection'}
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
