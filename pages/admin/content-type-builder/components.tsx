import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/admin/Layout';
import Link from 'next/link';
import { Plus, Edit, Trash2, Component as ComponentIcon } from 'lucide-react';

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
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/components/${name}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setComponents(components.filter((c) => c.name !== name));
        alert('Component deleted successfully');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
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

  return (
    <Layout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Components</h1>
            <p className="text-gray-600 mt-2">
              Manage reusable components (SEO, Hero sections, etc.)
            </p>
          </div>
          <Link
            href="/admin/content-type-builder?type=component"
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Plus size={20} />
            <span>Create Component</span>
          </Link>
        </div>

        {components.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="flex justify-center mb-4">
              <ComponentIcon size={64} className="text-gray-300" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No Components Yet
            </h2>
            <p className="text-gray-600 mb-6">
              Create your first reusable component to get started
            </p>
            <Link
              href="/admin/content-type-builder?type=component"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Plus size={20} />
              <span>Create Component</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {components.map((component) => (
              <div
                key={component.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <ComponentIcon size={24} className="text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {component.displayName}
                      </h3>
                      <p className="text-sm text-gray-500">{component.name}</p>
                    </div>
                  </div>
                </div>

                {component.description && (
                  <p className="text-sm text-gray-600 mb-4">{component.description}</p>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>{component.fields?.fields?.length || 0} fields</span>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                    {component.category || 'default'}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <Link
                    href={`/admin/content-type-builder?type=component&edit=${component.name}`}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    <Edit size={16} />
                    <span>Edit</span>
                  </Link>
                  <button
                    onClick={() => handleDelete(component.name)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
