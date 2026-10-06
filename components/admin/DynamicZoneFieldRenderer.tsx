import React, { useState, useEffect } from 'react';
import { Field } from '@/lib/types';
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { ComponentFieldRenderer } from './ComponentFieldRenderer';

interface DynamicZoneFieldRendererProps {
  field: Field;
  value: any;
  onChange: (value: any) => void;
  error?: any;
}

interface ComponentInstance {
  __component: string; // Component name (e.g., "general.list")
  id: string; // Unique instance ID
  data: any; // Component data
}

interface ComponentDefinition {
  id: string;
  name: string;
  displayName: string;
  category: string;
  fields: { fields: Field[] };
}

export const DynamicZoneFieldRenderer: React.FC<DynamicZoneFieldRendererProps> = ({
  field,
  value,
  onChange,
  error,
}) => {
  const [instances, setInstances] = useState<ComponentInstance[]>([]);
  const [availableComponents, setAvailableComponents] = useState<ComponentDefinition[]>([]);
  const [showComponentSelector, setShowComponentSelector] = useState(false);
  const [expandedInstances, setExpandedInstances] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Parse allowed component names from field.componentRef
  const allowedComponents = field.componentRef ? field.componentRef.split(',').map(c => c.trim()) : [];

  // Load available components
  useEffect(() => {
    loadComponents();
  }, []);

  // Initialize instances from value
  useEffect(() => {
    if (value) {
      try {
        // Handle both array and stringified array
        let parsed: any[] = [];
        if (Array.isArray(value)) {
          parsed = value;
        } else if (typeof value === 'string') {
          try {
            parsed = JSON.parse(value);
          } catch {
            console.error('Failed to parse dynamic zone value as JSON:', value);
            parsed = [];
          }
        }
        
        if (Array.isArray(parsed)) {
          setInstances(parsed);
          // Expand all instances by default
          setExpandedInstances(new Set(parsed.map(inst => inst.id)));
        }
      } catch (e) {
        console.error('Failed to parse dynamic zone value:', e);
        setInstances([]);
      }
    } else {
      setInstances([]);
    }
  }, [value]);

  const loadComponents = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/components');
      const result = await response.json();
      if (result.data) {
        // Filter to only allowed components
        const filtered = result.data.filter((comp: ComponentDefinition) => 
          allowedComponents.includes(comp.name)
        );
        setAvailableComponents(filtered);
      }
    } catch (error) {
      console.error('Error loading components:', error);
    } finally {
      setLoading(false);
    }
  };

  const addComponentInstance = (componentName: string) => {
    const component = availableComponents.find(c => c.name === componentName);
    if (!component) return;

    const newInstance: ComponentInstance = {
      __component: componentName,
      id: `${componentName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      data: {},
    };

    const updated = [...instances, newInstance];
    setInstances(updated);
    // Store as array (not stringified)
    onChange(updated as any);
    setExpandedInstances(prev => {
      const newSet = new Set(prev);
      newSet.add(newInstance.id);
      return newSet;
    });
    setShowComponentSelector(false);
  };

  const removeInstance = (instanceId: string) => {
    const updated = instances.filter(inst => inst.id !== instanceId);
    setInstances(updated);
    // Store as array (not stringified)
    onChange(updated as any);
  };

  const updateInstanceData = (instanceId: string, data: any) => {
    const updated = instances.map(inst => 
      inst.id === instanceId ? { ...inst, data } : inst
    );
    setInstances(updated);
    // Store as array (not stringified)
    onChange(updated as any);
  };

  const toggleExpanded = (instanceId: string) => {
    setExpandedInstances(prev => {
      const newSet = new Set(prev);
      if (newSet.has(instanceId)) {
        newSet.delete(instanceId);
      } else {
        newSet.add(instanceId);
      }
      return newSet;
    });
  };

  const moveInstance = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === instances.length - 1)
    ) {
      return;
    }

    const updated = [...instances];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
    
    setInstances(updated);
    // Store as array (not stringified)
    onChange(updated as any);
  };

  const getComponentDefinition = (componentName: string): ComponentDefinition | undefined => {
    return availableComponents.find(c => c.name === componentName);
  };

  // Group components by category
  const groupedComponents = availableComponents.reduce((acc, component) => {
    const category = component.category || 'GENERAL';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(component);
    return acc;
  }, {} as Record<string, ComponentDefinition[]>);

  if (loading) {
    return <div className="text-sm text-gray-500">Loading dynamic zone...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          {field.displayName}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <button
          type="button"
          onClick={() => setShowComponentSelector(!showComponentSelector)}
          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center space-x-1"
        >
          <Plus size={16} />
          <span>Add component</span>
        </button>
      </div>

      {/* Component Selector */}
      {showComponentSelector && (
        <div className="border border-gray-300 rounded-lg bg-white shadow-lg max-h-96 overflow-y-auto">
          <div className="p-3 border-b bg-gray-50">
            <h4 className="text-sm font-semibold text-gray-700">Select a component</h4>
          </div>
          {Object.entries(groupedComponents).map(([category, components]) => (
            <div key={category} className="border-b last:border-b-0">
              <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-blue-600 uppercase">
                {category}
              </div>
              <div className="divide-y">
                {components.map((component) => (
                  <button
                    key={component.id}
                    type="button"
                    onClick={() => addComponentInstance(component.name)}
                    className="w-full px-4 py-3 text-left hover:bg-blue-50 transition flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{component.displayName}</div>
                      <div className="text-xs text-gray-500">
                        {component.category}.{component.name}
                      </div>
                    </div>
                    <Plus size={16} className="text-blue-600" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Component Instances */}
      {instances.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <p className="text-sm text-gray-500">No components added yet</p>
        <p className="text-xs text-gray-400 mt-1">Click &quot;Add component&quot; to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {instances.map((instance, index) => {
            const componentDef = getComponentDefinition(instance.__component);
            const isExpanded = expandedInstances.has(instance.id);

            return (
              <div
                key={instance.id}
                className="border border-gray-300 rounded-lg bg-white overflow-hidden"
              >
                {/* Instance Header */}
                <div className="flex items-center justify-between p-3 bg-indigo-50 border-b">
                  <div className="flex items-center space-x-2 flex-1">
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-600 cursor-move"
                      title="Drag to reorder"
                    >
                      <GripVertical size={18} />
                    </button>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-gray-900">
                        {componentDef?.displayName || instance.__component}
                      </h4>
                      <p className="text-xs text-gray-500">{instance.__component}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {/* Move Up/Down */}
                    <button
                      type="button"
                      onClick={() => moveInstance(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveInstance(index, 'down')}
                      disabled={index === instances.length - 1}
                      className="p-1.5 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <ChevronDown size={16} />
                    </button>
                    {/* Expand/Collapse */}
                    <button
                      type="button"
                      onClick={() => toggleExpanded(instance.id)}
                      className="p-1.5 text-gray-600 hover:text-gray-900"
                      title={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => removeInstance(instance.id)}
                      className="p-1.5 text-red-600 hover:text-red-800"
                      title="Remove"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Instance Content */}
                {isExpanded && componentDef && (
                  <div className="p-4 bg-gray-50">
                    <ComponentFieldRenderer
                      field={{
                        name: instance.id,
                        displayName: componentDef.displayName,
                        type: 'component',
                        componentRef: instance.__component,
                        multiple: false,
                      }}
                      value={instance.data}
                      onChange={(newData) => updateInstanceData(instance.id, newData)}
                      error={error}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error.message}</p>
      )}
    </div>
  );
};
