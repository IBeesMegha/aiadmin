import React, { useState, useEffect } from 'react';
import { Field } from '@/lib/types';
import { MediaAsset } from '@/lib/media';
import { MediaLibraryModal } from './MediaLibraryModal';
import { ManageMediaModal } from './ManageMediaModal';
import { ComponentFieldRenderer } from './ComponentFieldRenderer';
import { DynamicZoneFieldRenderer } from './DynamicZoneFieldRenderer';
import { MediaFieldController } from './MediaFieldController';
import { MultiSelect } from './MultiSelect';
import { Image as ImageIcon, Plus, X, Link as LinkIcon, Edit, Trash2, Settings } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Controller } from 'react-hook-form';
import Link from 'next/link';

const ReactQuill = dynamic(() => import('react-quill'), { 
  ssr: false,
  loading: () => <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50">Loading editor...</div>
});
import 'react-quill/dist/quill.snow.css';

import { CKEditorField } from './CKEditorField';

interface FormFieldProps {
  field: Field;
  register: any;
  error?: any;
  setValue: any;
  watch: any;
  control: any;
}

export const FormField: React.FC<FormFieldProps> = ({
  field,
  register,
  error,
  setValue,
  watch,
  control,
}) => {
  const value = watch(field.name);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaAsset | MediaAsset[] | null>(null);
  const [relationOptions, setRelationOptions] = useState<any[]>([]);
  const [loadingRelations, setLoadingRelations] = useState(false);

  // Initialize selectedMedia from existing form value
  useEffect(() => {
    if (field.type === 'media' && value && !selectedMedia) {
      if (field.multiple) {
        // Multiple media - handle both array and stringified array
        try {
          let urls: string[] = [];
          if (Array.isArray(value)) {
            urls = value;
          } else if (typeof value === 'string') {
            try {
              const parsed = JSON.parse(value);
              if (Array.isArray(parsed)) {
                urls = parsed;
              }
            } catch {
              // Not JSON, might be a single URL
              if (value.trim()) {
                urls = [value];
              }
            }
          }
          
          if (urls.length > 0) {
            // Create mock MediaAsset objects from URLs
            const mockAssets: MediaAsset[] = urls.map((url, index) => ({
              id: `temp-${index}`,
              name: url.split('/').pop() || 'image',
              url,
              mime: 'image/jpeg',
              size: 0,
              ext: url.split('.').pop() || 'jpg',
              createdAt: new Date(),
              updatedAt: new Date(),
            }));
            setSelectedMedia(mockAssets);
          }
        } catch (e) {
          console.error('Failed to parse media URLs:', e);
        }
      } else {
        // Single media - create mock MediaAsset from URL
        if (typeof value === 'string' && value.trim()) {
          const mockAsset: MediaAsset = {
            id: 'temp-single',
            name: value.split('/').pop() || 'image',
            url: value,
            mime: 'image/jpeg',
            size: 0,
            ext: value.split('.').pop() || 'jpg',
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          setSelectedMedia(mockAsset);
        }
      }
    }
  }, [value, field.type, field.multiple, selectedMedia]);

  // Fetch relation options for relation fields
  useEffect(() => {
    if (field.type === 'relation' && field.relation) {
      fetchRelationOptions();
    }
  }, [field.type, field.relation]);

  const fetchRelationOptions = async () => {
    if (!field.relation) return;
    
    setLoadingRelations(true);
    console.log(`[FormField] Fetching relation options from: /api/collections/${field.relation.targetCollection}`);
    try {
      const response = await fetch(`/api/collections/${field.relation.targetCollection}`);
      const result = await response.json();
      console.log(`[FormField] Relation options response:`, result);
      if (result.data) {
        setRelationOptions(result.data);
        console.log(`[FormField] Loaded ${result.data.length} options for ${field.name}`);
      }
    } catch (error) {
      console.error('Error fetching relation options:', error);
    } finally {
      setLoadingRelations(false);
    }
  };

  const handleMediaSelect = (media: MediaAsset | MediaAsset[]) => {
    setSelectedMedia(media);
    if (Array.isArray(media)) {
      // Multiple media - store as array of URLs (not stringified)
      setValue(field.name, media.map(m => m.url));
    } else {
      // Single media - store URL as string
      setValue(field.name, media.url);
    }
  };

  const handleManageMediaSave = (media: MediaAsset[]) => {
    setSelectedMedia(media);
    // Store as array of URLs (not stringified)
    setValue(field.name, media.map(m => m.url));
  };

  const removeMedia = (index?: number) => {
    if (field.multiple && Array.isArray(selectedMedia) && index !== undefined) {
      const updated = selectedMedia.filter((_, i) => i !== index);
      setSelectedMedia(updated);
      // Store as array of URLs (not stringified)
      setValue(field.name, updated.map(m => m.url));
    } else {
      setSelectedMedia(null);
      setValue(field.name, '');
    }
  };

  console.log("relationOptions11",relationOptions)

  const renderField = () => {
    switch (field.type) {
      case 'string':
      case 'email':
        return (
          <input
            type={field.type === 'email' ? 'email' : 'text'}
            {...register(field.name)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder={`Enter ${field.displayName.toLowerCase()}`}
          />
        );

      case 'text':
        return (
          <textarea
            {...register(field.name)}
            rows={4}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder={`Enter ${field.displayName.toLowerCase()}`}
          />
        );

      case 'richtext':
        return (
          <div className={`border rounded-lg ${error ? 'border-red-500' : 'border-gray-300'}`}>
            {typeof window !== 'undefined' && (
              <ReactQuill
                theme="snow"
                value={value || ''}
                onChange={(content) => setValue(field.name, content)}
                className="bg-white"
              />
            )}
          </div>
        );

      case 'richtext-ckeditor':
        return (
          <div className={`border rounded-lg ${error ? 'border-red-500' : 'border-gray-300'}`}>
            <CKEditorField
              value={value || ''}
              onChange={(content) => setValue(field.name, content)}
            />
          </div>
        );

      case 'number':
        return (
          <input
            type="number"
            {...register(field.name, { 
              valueAsNumber: true,
              setValueAs: (v: any) => v === '' ? undefined : Number(v)
            })}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder={`Enter ${field.displayName.toLowerCase()}`}
          />
        );

      case 'boolean':
        return (
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              {...register(field.name)}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              {field.displayName}
            </span>
          </label>
        );

      case 'date':
        return (
          <input
            type="date"
            {...register(field.name)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        );

      case 'json':
        return (
          <textarea
            {...register(field.name)}
            rows={6}
            className={`w-full px-4 py-2 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder='{"key": "value"}'
          />
        );

      case 'media':
        // Handle both single and multiple media using Controller
        return (
          <Controller
            name={field.name}
            control={control}
            render={({ field: controllerField }) => (
              <MediaFieldController
                fieldName={field.name}
                multiple={field.multiple}
                value={controllerField.value || (field.multiple ? '[]' : '')}
                onChange={controllerField.onChange}
              />
            )}
          />
        );

      case 'component':
        return (
          <ComponentFieldRenderer
            field={field}
            value={value}
            onChange={(newValue) => setValue(field.name, newValue)}
            error={error}
          />
        );

      case 'dynamiczone':
        return (
          <DynamicZoneFieldRenderer
            field={field}
            value={value}
            onChange={(newValue) => setValue(field.name, newValue)}
            error={error}
          />
        );

      case 'relation':
        if (!field.relation) return null;
        
        // For oneToMany relations, this is a virtual field managed from the other side
        // Display it as a nice list with the ability to navigate to related items
        if (field.relation.type === 'oneToMany') {
          // Parse the value if it's populated (array of related objects)
          const relatedItems = Array.isArray(value) ? value : [];
          
          return (
            <div className="space-y-3">
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                {/* Header */}
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {field.relation.targetCollectionDisplay} ({relatedItems.length})
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Managed from the {field.relation.targetCollectionDisplay} side
                      </p>
                    </div>
                    <Link
                      href={`/admin/collections/${field.relation?.targetCollection}/new`}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      + Add new
                    </Link>
                  </div>
                </div>

                {/* List of related items */}
                {relatedItems.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {relatedItems.map((item: any, index: number) => {
                      const displayName = item.name || item.title || item.displayName || item.id;
                      const itemId = item.id;
                      
                      return (
                        <div
                          key={itemId || index}
                          className="px-4 py-3 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              {/* Item icon/number */}
                              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <span className="text-xs font-medium text-blue-600">
                                  {index + 1}
                                </span>
                              </div>
                              
                              {/* Item details */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {displayName}
                                </p>
                                {item.slug && (
                                  <p className="text-xs text-gray-500 truncate">
                                    {item.slug}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center space-x-2 ml-4">
                              <Link
                                href={`/admin/collections/${field.relation?.targetCollection}/${itemId}`}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-4 py-8 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
                      <LinkIcon size={20} className="text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      No {field.relation.targetCollectionDisplay} linked yet
                    </p>
                    <p className="text-xs text-gray-500 mb-4">
                      Create or edit {field.relation.targetCollectionDisplay} to link them to this entry
                    </p>
                    <Link
                      href={`/admin/collections/${field.relation.targetCollection}/new`}
                      className="inline-flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <Plus size={16} />
                      <span>Create {field.relation.targetCollectionDisplay}</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          );
        }
        
        const isMultiple = field.relation.type === 'manyToMany';
        
        // For manyToOne and oneToOne relations, we need to save to the FK column
        // The FK column name is exactly the field name (no Id suffix added)
        // This matches the database column naming convention
        const fieldNameToRegister = field.name;
        
        console.log(`[FormField] Relation field config:`, {
          originalName: field.name,
          registeringAs: fieldNameToRegister,
          relationType: field.relation.type,
          currentValue: value,
          optionsCount: relationOptions.length
        });
        
        // Use setValue to manually set the value when dropdown changes
        const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
          const selectedValue = e.target.value;
          console.log(`[FormField] Dropdown changed:`, {
            field: fieldNameToRegister,
            value: selectedValue
          });
          setValue(fieldNameToRegister, selectedValue);
        };
        
        return (
          <div className="space-y-2">
            {loadingRelations ? (
              <div className="text-sm text-gray-500">Loading {field.relation.targetCollectionDisplay}...</div>
            ) : (
              <>
                {isMultiple ? (
                  <Controller
                    name={fieldNameToRegister}
                    control={control}
                    render={({ field: controllerField }) => {
                      // Parse the current value - it might be an array, string, or undefined
                      let currentValue: (string | number)[] = [];
                      if (Array.isArray(controllerField.value)) {
                        currentValue = controllerField.value;
                      } else if (controllerField.value) {
                        // Try to parse if it's a string
                        try {
                          const parsed = JSON.parse(controllerField.value);
                          if (Array.isArray(parsed)) {
                            currentValue = parsed;
                          }
                        } catch {
                          // If not JSON, might be a single value
                          currentValue = [controllerField.value];
                        }
                      }

                      return (
                        <MultiSelect
                          options={relationOptions.map((option) => ({
                            id: option.id,
                            label: option.name || option.title || option.displayName || option.id,
                          }))}
                          value={currentValue}
                          onChange={(selected) => {
                            console.log(`[FormField] MultiSelect changed:`, {
                              field: fieldNameToRegister,
                              value: selected
                            });
                            controllerField.onChange(selected);
                          }}
                          placeholder={`Select ${field.relation.targetCollectionDisplay}...`}
                          label={field.relation.targetCollectionDisplay}
                          error={!!error}
                          loading={loadingRelations}
                        />
                      );
                    }}
                  />
                ) : (
                  <select
                    {...register(fieldNameToRegister)}
                    onChange={handleSelectChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      error ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select {field.relation.targetCollectionDisplay}</option>
                    {relationOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name || option.title || option.displayName || option.id}
                      </option>
                    ))}
                  </select>
                )}
              </>
            )}
          </div>
        );

      default:
        return (
          <input
            type="text"
            {...register(field.name)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );
    }
  };

  // Check if this is a oneToMany relation (read-only display)
  const isOneToManyRelation = field.type === 'relation' && field.relation?.type === 'oneToMany';

  return (
    <div className="space-y-2">
      {field.type !== 'boolean' && field.type !== 'component' && field.type !== 'dynamiczone' && !isOneToManyRelation && (
        <label className="block text-sm font-medium text-gray-700">
          {field.displayName}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {isOneToManyRelation && (
        <label className="block text-sm font-medium text-gray-700">
          {field.displayName}
          <span className="ml-2 text-xs font-normal text-gray-500">(Read-only)</span>
        </label>
      )}
      {renderField()}
      {error && (
        <p className="text-sm text-red-600 mt-1">
          {error.message || `${field.displayName} is required`}
        </p>
      )}
    </div>
  );
};
