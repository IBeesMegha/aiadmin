/**
 * Component Field Renderer
 * 
 * Renders component fields with:
 * - Expandable/collapsible nested components
 * - "Add another" button for repeatable components
 * - Visual hierarchy for nested structures
 */

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2, GripVertical } from 'lucide-react';
import { Field } from '@/lib/types';
import { MediaFieldController } from './MediaFieldController';
import dynamic from 'next/dynamic';

const ReactQuill = dynamic(() => import('react-quill'), { 
  ssr: false,
  loading: () => <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm">Loading editor...</div>
});
import 'react-quill/dist/quill.snow.css';

import { CKEditorField } from './CKEditorField';

interface ComponentFieldRendererProps {
  field: Field;
  value: any;
  onChange: (value: any) => void;
  error?: any;
}

export const ComponentFieldRenderer: React.FC<ComponentFieldRendererProps> = ({
  field,
  value,
  onChange,
  error,
}) => {
  const [componentDef, setComponentDef] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set([0])); // First item expanded by default

  useEffect(() => {
    if (field.componentRef) {
      fetchComponentDefinition();
    }
  }, [field.componentRef]);

  const fetchComponentDefinition = async () => {
    try {
      const response = await fetch(`/api/components/${field.componentRef}`);
      const result = await response.json();
      if (response.ok) {
        setComponentDef(result.data);
      }
    } catch (error) {
      console.error('Error fetching component definition:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const addEntry = () => {
    if (field.multiple) {
      const currentArray = Array.isArray(value) ? value : [];
      const newEntry = createEmptyEntry();
      onChange([...currentArray, newEntry]);
      // Expand the newly added item
      const newSet = new Set(expandedItems);
      newSet.add(currentArray.length);
      setExpandedItems(newSet);
    } else {
      onChange(createEmptyEntry());
    }
  };

  const removeEntry = (index: number) => {
    if (field.multiple && Array.isArray(value)) {
      const newArray = value.filter((_, i) => i !== index);
      onChange(newArray);
      // Remove from expanded set
      const newExpanded = new Set(expandedItems);
      newExpanded.delete(index);
      setExpandedItems(newExpanded);
    } else {
      onChange(null);
    }
  };

  const updateEntry = (index: number, fieldName: string, fieldValue: any) => {
    if (field.multiple && Array.isArray(value)) {
      const newArray = [...value];
      newArray[index] = {
        ...newArray[index],
        [fieldName]: fieldValue,
      };
      onChange(newArray);
    } else {
      onChange({
        ...value,
        [fieldName]: fieldValue,
      });
    }
  };

  const createEmptyEntry = () => {
    if (!componentDef) return {};
    const emptyData: Record<string, any> = {};
    componentDef.fields?.fields?.forEach((f: Field) => {
      emptyData[f.name] = f.type === 'boolean' ? false : '';
    });
    return emptyData;
  };

  const renderFieldInput = (componentField: Field, entryValue: any, onFieldChange: (val: any) => void) => {
    switch (componentField.type) {
      case 'string':
      case 'email':
        return (
          <input
            type={componentField.type === 'email' ? 'email' : 'text'}
            value={entryValue || ''}
            onChange={(e) => onFieldChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={`Enter ${componentField.displayName.toLowerCase()}`}
          />
        );

      case 'text':
        return (
          <textarea
            value={entryValue || ''}
            onChange={(e) => onFieldChange(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={`Enter ${componentField.displayName.toLowerCase()}`}
          />
        );

      case 'richtext':
        return (
          <div className="border border-gray-300 rounded-lg">
            {typeof window !== 'undefined' && (
              <ReactQuill
                theme="snow"
                value={entryValue || ''}
                onChange={onFieldChange}
                className="bg-white"
              />
            )}
          </div>
        );

      case 'richtext-ckeditor':
        return (
          <div className="border border-gray-300 rounded-lg">
            <CKEditorField
              value={entryValue || ''}
              onChange={onFieldChange}
            />
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            value={entryValue || ''}
            onChange={(e) => onFieldChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={entryValue || ''}
            onChange={(e) => onFieldChange(parseFloat(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={`Enter ${componentField.displayName.toLowerCase()}`}
          />
        );

      case 'boolean':
        return (
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={entryValue || false}
              onChange={(e) => onFieldChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{componentField.displayName}</span>
          </label>
        );

      case 'media':
        return (
          <MediaFieldController
            fieldName={componentField.name}
            multiple={componentField.multiple}
            value={entryValue || (componentField.multiple ? '[]' : '')}
            onChange={onFieldChange}
          />
        );

      case 'component':
        // Nested component - show as collapsed by default
        return (
          <div className="pl-4 border-l-2 border-purple-200">
            <ComponentFieldRenderer
              field={componentField}
              value={entryValue}
              onChange={onFieldChange}
            />
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={entryValue || ''}
            onChange={(e) => onFieldChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );
    }
  };

  const renderEntry = (entryData: any, index: number) => {
    const isExpanded = expandedItems.has(index);
    const componentFields = componentDef?.fields?.fields || [];

    // Get preview text (first text field value)
    const previewField = componentFields.find((f: Field) => 
      f.type === 'string' || f.type === 'text'
    );
    const previewText = previewField && entryData?.[previewField.name] 
      ? entryData[previewField.name].substring(0, 50) 
      : 'Empty entry';

    return (
      <div key={index} className="border border-gray-200 rounded-lg bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-3 bg-gray-50 border-b cursor-pointer hover:bg-gray-100"
             onClick={() => toggleExpand(index)}>
          <div className="flex items-center space-x-2 flex-1">
            <GripVertical size={16} className="text-gray-400" />
            <button
              type="button"
              className="text-gray-600 hover:text-gray-900"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(index);
              }}
            >
              {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium text-purple-600 uppercase">
                  {componentDef?.displayName || field.componentRef}
                </span>
                {field.multiple && (
                  <span className="text-xs text-gray-500">#{index + 1}</span>
                )}
              </div>
              {!isExpanded && (
                <p className="text-xs text-gray-500 truncate mt-0.5">{previewText}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeEntry(index);
            }}
            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="p-4 space-y-4">
            {componentFields.map((componentField: Field) => (
              <div key={componentField.name} className="space-y-1">
                {componentField.type !== 'boolean' && (
                  <label className="block text-xs font-medium text-gray-700">
                    {componentField.displayName}
                    {componentField.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                )}
                {renderFieldInput(
                  componentField,
                  entryData?.[componentField.name],
                  (val) => updateEntry(index, componentField.name, val)
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
        <p className="text-sm text-gray-500">Loading component...</p>
      </div>
    );
  }

  if (!componentDef) {
    return (
      <div className="p-4 border border-red-300 rounded-lg bg-red-50">
        <p className="text-sm text-red-600">Component &quot;{field.componentRef}&quot; not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          {field.displayName}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">
            {field.multiple ? 'Repeatable Component' : 'Single Component'} ({componentDef.displayName})
          </span>
        </div>
      </div>

      {/* Entries */}
      <div className="space-y-2">
        {field.multiple ? (
          // Repeatable component
          <>
            {Array.isArray(value) && value.length > 0 ? (
              value.map((entry, index) => renderEntry(entry, index))
            ) : (
              <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                <p className="text-sm text-gray-500">No entries yet</p>
              </div>
            )}
            <button
              type="button"
              onClick={addEntry}
              className="w-full px-4 py-2 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition flex items-center justify-center space-x-2"
            >
              <Plus size={18} />
              <span className="text-sm font-medium">Add another entry</span>
            </button>
          </>
        ) : (
          // Single component
          <>
            {value ? (
              renderEntry(value, 0)
            ) : (
              <button
                type="button"
                onClick={addEntry}
                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition flex items-center justify-center space-x-2"
              >
                <Plus size={18} />
                <span className="text-sm font-medium">Add {componentDef.displayName}</span>
              </button>
            )}
          </>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600">{error.message}</p>
      )}
    </div>
  );
};
