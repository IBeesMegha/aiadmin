import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/admin/Layout';
import { DynamicForm } from '@/components/admin/DynamicForm';
import { useRouter } from 'next/router';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { fetchWithAuth } from '@/lib/api-client';

const COLLECTION_NAME = 'blogs';
const COLLECTION_API_BASE = `/api/collections/${COLLECTION_NAME}`;

export default function NewBlogsEntry() {
  const router = useRouter();
  const { hasPermission } = useAuth();

  const [collectionType, setCollectionType] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState<{ field: string; message: string } | null>(null);

  const fetchCollectionType = async () => {
    try {
      const response = await fetchWithAuth(`/api/collection-types/${COLLECTION_NAME}`);
      const data = await response.json();
      setCollectionType(data.data);
    } catch (error) {
      console.error('Error fetching collection type:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollectionType();
  }, []);

  const handleSubmit = async (data: Record<string, any>) => {
    const toastId = toast.loading('Creating entry...');
    setServerError(null);
    
    try {
      const cleanedData: Record<string, any> = {};
      Object.keys(data).forEach(key => {
        const value = data[key];
        if (value !== '' && value !== null && value !== undefined) {
          cleanedData[key] = value;
        }
      });
      
      console.log('[Create Form] Original data:', data);
      console.log('[Create Form] Cleaned data:', cleanedData);
      
      const response = await fetchWithAuth(`${COLLECTION_API_BASE}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: cleanedData }),
      });

      if (response.ok) {
        toast.success('Entry created successfully!', { id: toastId });
        router.push(`/admin/collections/${COLLECTION_NAME}`);
      } else {
        const error = await response.json();
        const errorMessage = error.error || 'Failed to create entry';
        
        const uniqueFieldMatch = errorMessage.match(/This (.+?) already exists/);
        if (uniqueFieldMatch) {
          const fieldDisplayName = uniqueFieldMatch[1];
          const field = collectionType?.fields?.fields?.find(
            (f: any) => f.displayName === fieldDisplayName
          );
          
          if (field) {
            setServerError({
              field: field.name,
              message: errorMessage
            });
            toast.error('Please fix the errors below', { id: toastId });
            return;
          }
        }
        
        toast.error(errorMessage, { id: toastId });
      }
    } catch (error) {
      console.error('Error creating entry:', error);
      toast.error('Failed to create entry', { id: toastId });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-8">Loading...</div>
      </Layout>
    );
  }

  if (!collectionType) {
    return (
      <Layout>
        <div className="p-8">Collection type not found</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8">
        <Link
          href="/admin/collections/blogs"
          className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 mb-6"
        >
          <ArrowLeft size={20} />
          <span>Back to blogs</span>
        </Link>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Create New blogs
          </h1>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <DynamicForm
            fields={collectionType.fields.fields}
            onSubmit={handleSubmit}
            submitLabel="Create Entry"
            collectionName={COLLECTION_NAME}
            serverError={serverError}
          />
        </div>
      </div>
    </Layout>
  );
}
