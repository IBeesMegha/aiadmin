import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/admin/Layout';
import Link from 'next/link';
import { Plus, Edit, Trash2, Database, Settings } from 'lucide-react';
import { CollectionConfigModal } from '@/components/admin/CollectionConfigModal';

export default function CollectionTypesList() {
  const [collectionTypes, setCollectionTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCollection, setSelectedCollection] = useState<any | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  useEffect(() => {
    fetchCollectionTypes();
  }, []);

  const fetchCollectionTypes = async () => {
    try {
      const response = await fetch('/api/collection-types');
      const data = await response.json();
      setCollectionTypes(data.data || []);
    } catch (error) {
      console.error('Error fetching collection types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will also delete the database table and all entries.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/collection-types/${name}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCollectionTypes(collectionTypes.filter((ct) => ct.name !== name));
        alert('Collection type deleted successfully');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting collection type:', error);
      alert('Failed to delete collection type');
    }
  };

  const handleShowConfig = (collectionType: any) => {
    setSelectedCollection(collectionType);
    setShowConfigModal(true);
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
            <h1 className="text-3xl font-bold text-gray-900">Collection Types</h1>
            <p className="text-gray-600 mt-2">
              Manage your collection types and their schemas
            </p>
          </div>
          <Link
            href="/admin/content-type-builder?type=collection"
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            <span>Create Collection Type</span>
          </Link>
        </div>

        {collectionTypes.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="flex justify-center mb-4">
              <Database size={64} className="text-gray-300" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No Collection Types Yet
            </h2>
            <p className="text-gray-600 mb-6">
              Create your first collection type to get started
            </p>
            <Link
              href="/admin/content-type-builder?type=collection"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={20} />
              <span>Create Collection Type</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collectionTypes.map((ct) => (
              <div
                key={ct.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Database size={24} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {ct.displayName}
                      </h3>
                      <p className="text-sm text-gray-500">{ct.name}</p>
                    </div>
                  </div>
                </div>

                {ct.description && (
                  <p className="text-sm text-gray-600 mb-4">{ct.description}</p>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>{ct.fields?.fields?.length || 0} fields</span>
                  <span>{new Date(ct.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <Link
                    href={`/admin/content-type-builder/edit/${ct.name}`}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    <Edit size={16} />
                    <span>Edit Schema</span>
                  </Link>
                  <button
                    onClick={() => handleShowConfig(ct)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="View Configuration"
                  >
                    <Settings size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(ct.name)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Configuration Modal */}
      {selectedCollection && (
        <CollectionConfigModal
          isOpen={showConfigModal}
          onClose={() => {
            setShowConfigModal(false);
            setSelectedCollection(null);
          }}
          collectionType={selectedCollection}
        />
      )}
    </Layout>
  );
}
