import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';

interface ComponentInstance {
  id: string;
  componentName: string;
  data: Record<string, any>;
}

interface ComponentBuilderProps {
  components: ComponentInstance[];
  availableComponents: any[];
  onChange: (components: ComponentInstance[]) => void;
}

export const ComponentBuilder: React.FC<ComponentBuilderProps> = ({
  components,
  availableComponents,
  onChange,
}) => {
  const [selectedComponent, setSelectedComponent] = useState('');

  const handleAddComponent = () => {
    if (!selectedComponent) return;

    const newComponent: ComponentInstance = {
      id: `${selectedComponent}-${Date.now()}`,
      componentName: selectedComponent,
      data: {},
    };

    onChange([...components, newComponent]);
    setSelectedComponent('');
  };

  const handleRemoveComponent = (id: string) => {
    onChange(components.filter((c) => c.id !== id));
  };

  const handleUpdateComponent = (id: string, data: Record<string, any>) => {
    onChange(
      components.map((c) => (c.id === id ? { ...c, data } : c))
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex space-x-3">
        <select
          value={selectedComponent}
          onChange={(e) => setSelectedComponent(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">Select a component...</option>
          {availableComponents.map((comp) => (
            <option key={comp.name} value={comp.name}>
              {comp.displayName}
            </option>
          ))}
        </select>
        <button
          onClick={handleAddComponent}
          disabled={!selectedComponent}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Add Component
        </button>
      </div>

      <div className="space-y-3">
        {components.map((component, index) => {
          const componentDef = availableComponents.find(
            (c) => c.name === component.componentName
          );

          return (
            <div
              key={component.id}
              className="border border-gray-300 rounded-lg p-4 bg-white"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <GripVertical className="text-gray-400 cursor-move" size={20} />
                  <h4 className="font-medium">
                    {componentDef?.displayName || component.componentName}
                  </h4>
                </div>
                <button
                  onClick={() => handleRemoveComponent(component.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {componentDef && (
                <div className="space-y-3 pl-7">
                  {componentDef.fields.fields.map((field: any) => (
                    <div key={field.name}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.displayName}
                      </label>
                      <input
                        type="text"
                        value={component.data[field.name] || ''}
                        onChange={(e) =>
                          handleUpdateComponent(component.id, {
                            ...component.data,
                            [field.name]: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {components.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No components added yet. Select a component above to get started.
        </div>
      )}
    </div>
  );
};
