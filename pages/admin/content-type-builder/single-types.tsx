import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/admin/Layout';
import Link from 'next/link';
import { Plus, Edit, Trash2, FileText, Settings } from 'lucide-react';
import { SingleTypeConfigModal } from '@/components/admin/SingleTypeConfigModal';

export default function SingleTypesList() {
  const [singleTypes, setSingleTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSingleType, setSelectedSingleType] = useState<any | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  useEffect(() => {
    fetchSingleTypes();
  }, []);

  const fetchSingleTypes = async () => {
    try {
      const response = await fetch('/api/single-types');
      const data = await response.json();
      setSingleTypes(data.data || []);
    } catch (error) {
      console.error('Error fetching single types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/single-types/${name}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSingleTypes(singleTypes.filter((st) => st.name !== name));
        alert('Single type deleted successfully');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting single type:', error);
      alert('Failed to delete single type');
    }
  };

  const handleShowConfig = (singleType: any) => {
    setSelectedSingleType(singleType);
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
            <h1 className="text-3xl font-bold text-gray-900">Single Types</h1>
            <p className="text-gray-600 mt-2">
              Manage your single types (unique pages like Homepage, Settings)
            </p>
          </div>
          <Link
            href="/admin/content-type-builder?type=single"
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus size={20} />
            <span>Create Single Type</span>
          </Link>
        </div>

        {singleTypes.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="flex justify-center mb-4">
              <FileText size={64} className="text-gray-300" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No Single Types Yet
            </h2>
            <p className="text-gray-600 mb-6">
              Create your first single type to get started
            </p>
            <Link
              href="/admin/content-type-builder?type=single"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Plus size={20} />
              <span>Create Single Type</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {singleTypes.map((st) => (
              <div
                key={st.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <FileText size={24} className="text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {st.displayName}
                      </h3>
                      <p className="text-sm text-gray-500">{st.name}</p>
                    </div>
                  </div>
                </div>

                {st.description && (
                  <p className="text-sm text-gray-600 mb-4">{st.description}</p>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span className="text-gray-400">Single Type</span>
                  <span>{new Date(st.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <Link
                    href={`/admin/content-type-builder/single-types/${st.name}`}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    <Edit size={16} />
                    <span>Edit Schema</span>
                  </Link>
                  <button
                    onClick={() => handleShowConfig(st)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="View Configuration"
                  >
                    <Settings size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(st.name)}
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
      {selectedSingleType && (
        <SingleTypeConfigModal
          isOpen={showConfigModal}
          onClose={() => {
            setShowConfigModal(false);
            setSelectedSingleType(null);
          }}
          singleType={selectedSingleType}
        />
      )}
    </Layout>
  );
}
