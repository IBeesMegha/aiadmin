import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/admin/Layout';
import Link from 'next/link';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function ComponentsList() {
  const [components, setComponents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComponents();
  }, []);

  const fetchComponents = async () => {
    try {
      const response = await fetch('/api/components');
      const data = await response.json();
      setComponents(data.data || []);
    } catch (error) {
      console.error('Error fetching components:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm('Are you sure you want to delete this component?')) return;

    try {
      const response = await fetch(`/api/components/${name}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setComponents(components.filter((c) => c.name !== name));
      } else {
        alert('Failed to delete component');
      }
    } catch (error) {
      console.error('Error deleting component:', error);
      alert('Failed to delete component');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-8">Loading...</div>
      </Layout>
    );
  }

  // Group components by category
  const groupedComponents = components.reduce((acc, component) => {
    const category = component.category || 'default';
    if (!acc[category]) acc[category] = [];
    acc[category].push(component);
    return acc;
  }, {} as Record<string, any[]>);

  type ComponentType = {
    id: string;
    name: string;
    displayName: string;
    category: string;
    fields: { fields: any[] };
  };

  return (
    <Layout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Components</h1>
          <Link
            href="/admin/content-type-builder?type=component"
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            <span>Create Component</span>
          </Link>
        </div>

        {components.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">No components yet</p>
            <Link
              href="/admin/content-type-builder?type=component"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={20} />
              <span>Create First Component</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedComponents).map(([category, comps]) => (
              <div key={category} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b">
                  <h2 className="text-lg font-semibold text-gray-900 capitalize">
                    {category}
                  </h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {(comps as ComponentType[]).map((component) => (
                    <div
                      key={component.id}
                      className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                    >
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {component.displayName}
                        </h3>
                        <p className="text-sm text-gray-500">{component.name}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {component.fields.fields.length} fields
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Link
                          href={`/admin/component-entries/${component.name}`}
                          className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                        >
                          Manage Entries
                        </Link>
                        <Link
                          href={`/admin/content-type-builder?type=component&edit=${component.name}`}
                          className="text-gray-600 hover:text-gray-900"
                          title="Edit Schema"
                        >
                          <Edit size={18} />
                        </Link>
                        <button
                          onClick={() => handleDelete(component.name)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Component"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
