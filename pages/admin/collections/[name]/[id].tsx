import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/admin/Layout';
import { DynamicForm } from '@/components/admin/DynamicForm';
import { useRouter } from 'next/router';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { fetchWithAuth } from '@/lib/api-client';

export default function EditCollectionEntry() {
  const router = useRouter();
  const { name, id } = router.query;
  const { hasPermission } = useAuth();

  const [collectionType, setCollectionType] = useState<any>(null);
  const [entry, setEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState<{ field: string; message: string } | null>(null);

  useEffect(() => {
    if (name && id) {
      fetchData();
    }
  }, [name, id]);

  const fetchData = async () => {
    try {
      const [typeRes, entryRes] = await Promise.all([
        fetchWithAuth(`/api/collection-types/${name}`),
        fetchWithAuth(`/api/collections/${name}/${id}`),
      ]);

      const typeData = await typeRes.json();
      const entryData = await entryRes.json();

      setCollectionType(typeData.data);
      
      // Format dates for HTML date inputs (YYYY-MM-DD)
      // Also handle JSON fields for media
      // Also handle relation fields - extract IDs from populated objects
      const formattedEntry = { ...entryData.data };
      const fields = (typeData.data.fields as any)?.fields || [];
      
      console.log('[Edit Page] Raw entry data:', entryData.data);
      console.log('[Edit Page] Fields:', fields);
      
      Object.keys(formattedEntry).forEach(key => {
        const value = formattedEntry[key];
        const field = fields.find((f: any) => f.name === key);
        
        // Handle relation fields
        if (field && field.type === 'relation' && field.relation) {
          console.log(`[Edit Page] Processing relation field: ${key}`, value);
          
          if (field.relation.type === 'manyToOne' || field.relation.type === 'oneToOne') {
            // For manyToOne and oneToOne, the field name IS the FK column (no Id suffix)
            // We need to extract the ID from populated object and set it to the same field
            if (typeof value === 'object' && value !== null && value.id) {
              // Extract the ID and set it directly to the field name
              formattedEntry[key] = value.id;
              console.log(`[Edit Page] Set FK field ${key} = ${value.id} (from object)`);
            } else if (typeof value === 'string') {
              // Already an ID string, keep it as-is
              formattedEntry[key] = value;
              console.log(`[Edit Page] FK field ${key} = ${value} (already string)`);
            } else if (value === null || value === undefined) {
              // No relation set, keep as null
              formattedEntry[key] = null;
              console.log(`[Edit Page] FK field ${key} = null (no relation)`);
            }
          } else if (field.relation.type === 'manyToMany') {
            // For manyToMany, extract IDs from populated array
            if (Array.isArray(value)) {
              formattedEntry[key] = value.map((item: any) => {
                if (typeof item === 'object' && item !== null && item.id) {
                  return item.id;
                }
                return item;
              });
              console.log(`[Edit Page] Set manyToMany field ${key} =`, formattedEntry[key]);
            } else {
              formattedEntry[key] = [];
              console.log(`[Edit Page] Set manyToMany field ${key} = [] (empty)`);
            }
          } else if (field.relation.type === 'oneToMany') {
            // For oneToMany, keep the populated array as-is for display
            console.log(`[Edit Page] Keeping oneToMany field ${key} as-is`);
          }
        }
        // Handle media fields - ensure they're in the correct format
        else if (field && field.type === 'media') {
          if (field.multiple) {
            // Multiple media - should be JSON string of array
            if (Array.isArray(value)) {
              formattedEntry[key] = JSON.stringify(value);
            } else if (typeof value === 'object' && value !== null) {
              formattedEntry[key] = JSON.stringify(value);
            } else if (typeof value === 'string') {
              // Already a string, keep as is
              formattedEntry[key] = value;
            }
          } else {
            // Single media - should be a URL string
            if (typeof value === 'string') {
              formattedEntry[key] = value;
            }
          }
        }
        // Handle date fields
        else if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
          const date = new Date(value);
          // Check if it's a valid date and format it
          if (!isNaN(date.getTime())) {
            // Format as YYYY-MM-DD for date inputs
            formattedEntry[key] = date.toISOString().split('T')[0];
          }
        }
      });
      
      console.log('[Edit Page] Formatted entry for form:', formattedEntry);
      setEntry(formattedEntry);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: Record<string, any>) => {
    const toastId = toast.loading('Updating entry...');
    setServerError(null); // Clear previous errors
    
    try {
      console.log('[Edit Form] Original data:', data);
      
      // Get collection type fields to identify relation fields
      const fields = collectionType?.fields?.fields || [];
      
      const cleanedData: Record<string, any> = {};
      Object.keys(data).forEach(key => {
        const value = data[key];
        
        // Check if this is a relation field (not checking for 'Id' suffix anymore)
        const relationField = fields.find((f: any) => {
          if (f.type !== 'relation') return false;
          // Check if the key matches the field name exactly
          return f.name === key;
        });
        
        // For relation FK fields, explicitly set null if empty
        if (relationField && (value === '' || value === null || value === undefined)) {
          cleanedData[key] = null;
          console.log(`[Edit Form] Setting relation FK ${key} to null`);
        }
        // For other fields, only include non-empty values
        else if (value !== '' && value !== null && value !== undefined) {
          cleanedData[key] = value;
        }
      });
      
      console.log('[Edit Form] Cleaned data:', cleanedData);
      
      // Update existing entry
      const response = await fetchWithAuth(`/api/collections/${name}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: cleanedData }),
      });

      if (response.ok) {
        toast.success('Entry updated successfully!', { id: toastId });
        router.push(`/admin/collections/${name}`);
      } else {
        const error = await response.json();
        const errorMessage = error.error || 'Failed to update entry';
        
        // Check if error is about a unique field
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
      console.error('Error saving entry:', error);
      toast.error('Failed to save entry', { id: toastId });
    }
  };

  const handlePublish = async () => {
    const toastId = toast.loading(entry.published ? 'Unpublishing...' : 'Publishing...');
    
    try {
      // Extract only the field data (exclude metadata)
      const fieldNames = collectionType.fields.fields.map((f: any) => f.name);
      const fieldData: Record<string, any> = {};
      fieldNames.forEach((fieldName: string) => {
        if (entry[fieldName] !== undefined) {
          fieldData[fieldName] = entry[fieldName];
        }
      });

      const response = await fetch(`/api/collections/${name}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: fieldData, published: !entry.published }),
      });

      if (response.ok) {
        setEntry({ ...entry, published: !entry.published });
        toast.success(entry.published ? 'Entry unpublished!' : 'Entry published!', { id: toastId });
      } else {
        toast.error('Failed to update publish status', { id: toastId });
      }
    } catch (error) {
      console.error('Error toggling publish:', error);
      toast.error('Failed to update publish status', { id: toastId });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-8">Loading...</div>
      </Layout>
    );
  }

  if (!collectionType || !entry) {
    return (
      <Layout>
        <div className="p-8">Entry not found</div>
      </Layout>
    );
  }

  console.log("fieldsfields", collectionType.fields.fields);

  return (
    <Layout>
      <div className="p-8">
        <Link
          href={`/admin/collections/${name}`}
          className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 mb-6"
        >
          <ArrowLeft size={20} />
          <span>Back to {collectionType.displayName}</span>
        </Link>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Edit {collectionType.displayName}
          </h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={handlePublish}
              className={`px-4 py-2 rounded-lg ${
                entry.published
                  ? 'bg-yellow-600 hover:bg-yellow-700'
                  : 'bg-green-600 hover:bg-green-700'
              } text-white`}
            >
              {entry.published ? 'Unpublish' : 'Publish'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <DynamicForm
            fields={collectionType.fields.fields}
            defaultValues={entry}
            onSubmit={handleSubmit}
            submitLabel="Update Entry"
            collectionName={name as string}
            entryId={id as string}
            serverError={serverError}
          />
        </div>
      </div>
    </Layout>
  );
}
