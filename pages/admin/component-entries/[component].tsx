/**
 * Component Entries Manager
 * 
 * This page allows you to create and manage component data instances
 * (not the component schema - that's in content-type-builder)
 */

import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/admin/Layout';
import { useRouter } from 'next/router';
import { Plus, Edit, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { DynamicForm } from '@/components/admin/DynamicForm';

export default function ComponentEntriesPage() {
  const router = useRouter();
  const { component } = router.query;

  const [componentDef, setComponentDef] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);

  useEffect(() => {
    if (component) {
      fetchComponentDefinition();
      fetchEntries();
    }
  }, [component]);

  const fetchComponentDefinition = async () => {
    try {
      const response = await fetch(`/api/components/${component}`);
      const result = await response.json();
      if (response.ok) {
        setComponentDef(result.data);
      } else {
        alert('Component not found');
        router.push('/admin/components');
      }
    } catch (error) {
      console.error('Error fetching component:', error);
    }
  };

  const fetchEntries = async () => {
    try {
      const response = await fetch(`/api/component-entries?component=${component}`);
      const result = await response.json();
      if (response.ok) {
        setEntries(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: Record<string, any>) => {
    try {
      const response = await fetch('/api/component-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          component: component,
          data: data,
        }),
      });

      if (response.ok) {
        setShowCreateModal(false);
        fetchEntries();
      } else {
        const result = await response.json();
        alert(`Failed to create entry: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating entry:', error);
      alert('Failed to create entry');
    }
  };

  const handleUpdate = async (id: string, data: Record<string, any>) => {
    try {
      const response = await fetch(`/api/component-entries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });

      if (response.ok) {
        setEditingEntry(null);
        fetchEntries();
      } else {
        const result = await response.json();
        alert(`Failed to update entry: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating entry:', error);
      alert('Failed to update entry');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      const response = await fetch(`/api/component-entries/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchEntries();
      } else {
        alert('Failed to delete entry');
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Failed to delete entry');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-8">Loading...</div>
      </Layout>
    );
  }

  if (!componentDef) {
    return (
      <Layout>
        <div className="p-8">Component not found</div>
      </Layout>
    );
  }

  const fields = componentDef.fields?.fields || [];

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin/components"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={16} className="mr-1" />
            Back to Components
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {componentDef.displayName} Entries
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage data instances for this component
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={20} />
              <span>Create Entry</span>
            </button>
          </div>
        </div>

        {/* Entries List */}
        {entries.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">No entries yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={20} />
              <span>Create First Entry</span>
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  {fields.slice(0, 3).map((field: any) => (
                    <th
                      key={field.name}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {field.displayName}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.id.substring(0, 8)}...
                    </td>
                    {fields.slice(0, 3).map((field: any) => (
                      <td
                        key={field.name}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                      >
                        {typeof entry.data[field.name] === 'string'
                          ? entry.data[field.name].substring(0, 50)
                          : JSON.stringify(entry.data[field.name])?.substring(0, 50) || '-'}
                      </td>
                    ))}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setEditingEntry(entry)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">
                Create {componentDef.displayName} Entry
              </h2>
            </div>
            <div className="p-6">
              <DynamicForm
                fields={fields}
                onSubmit={handleCreate}
                submitLabel="Create"
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">
                Edit {componentDef.displayName} Entry
              </h2>
            </div>
            <div className="p-6">
              <DynamicForm
                fields={fields}
                defaultValues={editingEntry.data}
                onSubmit={(data) => handleUpdate(editingEntry.id, data)}
                submitLabel="Update"
              />
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
