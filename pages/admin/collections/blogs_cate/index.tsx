import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/admin/Layout';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Plus, Edit, Trash2, GripVertical, X, Settings, Download } from 'lucide-react';
import { ColumnConfigModal } from '@/components/admin/ColumnConfigModal';
import toast from 'react-hot-toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  locked?: boolean;
}

interface SortableRowProps {
  entry: any;
  index: number;
  fields: any[];
  onDelete: (id: string) => void;
  onImageClick: (images: string[], startIndex: number) => void;
  visibleColumns: ColumnConfig[];
  collectionType: any;
  isSelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
}

const COLLECTION_NAME = 'blogs_cate';
const COLLECTION_API_BASE = `/api/collections/${COLLECTION_NAME}`;

const SortableRow: React.FC<SortableRowProps> = ({ entry, index, fields, onDelete, onImageClick, visibleColumns, collectionType, isSelected, onSelect }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getImageField = () => {
    let singleMediaField = null;

    for (const field of fields) {
      if (field.type === 'media' && field.multiple) {
        const value = entry[field.name];
        if (value) {
          let urls: string[] = [];
          if (Array.isArray(value)) {
            urls = value;
          } else if (typeof value === 'string') {
            try {
              const parsed = JSON.parse(value);
              if (Array.isArray(parsed)) {
                urls = parsed;
              }
            } catch (e) {}
          }
          const validUrls = urls.filter(url => typeof url === 'string' && url.trim());
          if (validUrls.length > 0) {
            return { url: validUrls[0], allUrls: validUrls, isMultiple: true };
          }
        }
      } else if (field.type === 'media' && !field.multiple) {
        const value = entry[field.name];
        if (value && typeof value === 'string' && value.trim() && !singleMediaField) {
          singleMediaField = { url: value, allUrls: [value], isMultiple: false };
        }
      }
    }

    const imageFieldNames = ['images', 'image', 'photos', 'gallery', 'media'];
    for (const fieldName of imageFieldNames) {
      if (entry[fieldName]) {
        const value = entry[fieldName];
        let urls: string[] = [];
        if (Array.isArray(value)) {
          urls = value;
        } else if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              urls = parsed;
            }
          } catch (e) {}
        }
        const validUrls = urls.filter(url => typeof url === 'string' && url.trim());
        if (validUrls.length > 0) {
          return { url: validUrls[0], allUrls: validUrls, isMultiple: true };
        }
      }
    }

    if (singleMediaField) {
      return singleMediaField;
    }

    return null;
  };

  const imageField = getImageField();

  const isColumnVisible = (key: string) => {
    const column = visibleColumns.find((col) => col.key === key);
    return column ? column.visible : true;
  };

  const renderFieldValue = (field: any, value: any): React.ReactNode => {
    if (!value && value !== 0 && value !== false) return '—';

    switch (field.type) {
      case 'media':
        if (field.multiple) {
          let urls: string[] = [];
          if (Array.isArray(value)) {
            urls = value;
          } else if (typeof value === 'string') {
            try {
              const parsed = JSON.parse(value);
              if (Array.isArray(parsed)) {
                urls = parsed;
              }
            } catch (e) {
              urls = [value];
            }
          }
          const validUrls = urls.filter(url => typeof url === 'string' && url.trim());
          if (validUrls.length > 0) {
            return (
              <button
                onClick={() => onImageClick(validUrls, 0)}
                className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-800 hover:ring-2 hover:ring-blue-500 transition flex-shrink-0"
              >
                <img src={validUrls[0]} alt="Thumbnail" className="w-full h-full object-cover" />
                {validUrls.length > 1 && (
                  <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">+{validUrls.length}</span>
                  </div>
                )}
              </button>
            );
          }
          return '—';
        } else {
          if (typeof value === 'string' && value.trim()) {
            return (
              <button
                onClick={() => onImageClick([value], 0)}
                className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 hover:ring-2 hover:ring-blue-500 transition flex-shrink-0"
              >
                <img src={value} alt="Thumbnail" className="w-full h-full object-cover" />
              </button>
            );
          }
          return '—';
        }
      case 'boolean':
        return value ? '✓' : '✗';
      case 'date':
        return <span className="whitespace-nowrap">{new Date(value).toLocaleDateString()}</span>;
      case 'relation':
        if (Array.isArray(value)) {
          if (value.length === 0) {
            return <span className="text-gray-400 text-xs whitespace-nowrap">No items</span>;
          }
          return (
            <div className="flex items-center space-x-1">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap">
                {value.length} {value.length === 1 ? 'item' : 'items'}
              </span>
            </div>
          );
        } else if (typeof value === 'object' && value !== null) {
          const displayName = value.name || value.title || value.displayName || value.id;
          return (
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800 max-w-xs truncate" title={displayName}>
              {displayName}
            </span>
          );
        } else if (value) {
          return (
            <span className="text-gray-500 text-xs font-mono truncate max-w-xs block" title={value}>{value}</span>
          );
        }
        return <span className="text-gray-400 text-xs">—</span>;
      case 'json':
        if (typeof value === 'object') {
          const jsonStr = JSON.stringify(value);
          return <span className="truncate block max-w-xs" title={jsonStr}>{jsonStr}</span>;
        }
        return <span className="truncate block max-w-xs" title={value}>{value}</span>;
      case 'richtext':
      case 'text':
        const textValue = String(value);
        return <span className="truncate block max-w-xs" title={textValue}>{textValue}</span>;
      default:
        const stringValue = String(value);
        return <span className="truncate block max-w-xs" title={stringValue}>{stringValue}</span>;
    }
  };

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-gray-50 border-b border-gray-200">
      {isColumnVisible('drag') && (
        <td className="px-4 py-4 w-12">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
            <GripVertical size={20} />
          </div>
        </td>
      )}
      {isColumnVisible('checkbox') && (
        <td className="px-4 py-4 w-12">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(entry.id, e.target.checked)}
            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        </td>
      )}
      {isColumnVisible('sno') && (
        <td className="px-4 py-4 text-sm text-gray-700 w-16">
          {index + 1}
        </td>
      )}
      {fields.map((field) => {
        if (!isColumnVisible(field.name)) return null;
        const value = entry[field.name];
        return (
          <td key={field.name} className="px-4 py-4 text-sm text-gray-700 max-w-[10rem]">
            <div className="truncate">
              {renderFieldValue(field, value)}
            </div>
          </td>
        );
      })}
      <td className="px-4 py-4 text-right w-24">
        <div className="flex items-center justify-end space-x-2">
          <Link href={`/admin/collections/blogs_cate/${entry.id}`} className="text-blue-600 hover:text-blue-900">
            <Edit size={18} />
          </Link>
          <button onClick={() => onDelete(entry.id)} className="text-red-600 hover:text-red-900">
            <Trash2 size={18} />
          </button>
        </div>
      </td>
    </tr>
  );
};

interface ImageLightboxProps {
  images: string[];
  currentIndex: number;
  onClose: () => void;
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({ images, currentIndex, onClose }) => {
  const [index, setIndex] = useState(currentIndex);

  const goNext = () => setIndex((prev) => (prev + 1) % images.length);
  const goPrev = () => setIndex((prev) => (prev - 1 + images.length) % images.length);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/50 to-transparent flex items-center justify-between px-6 z-10">
        <div className="text-white text-base">{index + 1} / {images.length}</div>
        <button onClick={onClose} className="text-white hover:text-gray-300 transition">
          <X size={24} />
        </button>
      </div>
      {images.length > 1 && (
        <button onClick={goPrev} className="absolute left-6 text-white hover:bg-white/10 rounded-full p-2 transition z-10">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}
      <div className="flex items-center justify-center w-full h-full px-20 py-24">
        <img src={images[index]} alt={`Image ${index + 1}`} className="max-w-full max-h-full object-contain" />
      </div>
      {images.length > 1 && (
        <button onClick={goNext} className="absolute right-6 text-white hover:bg-white/10 rounded-full p-2 transition z-10">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default function BlogscateCollectionList() {
  const router = useRouter();
  const [collectionType, setCollectionType] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxImages, setLightboxImages] = useState<string[] | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false);
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [showExportMenu, setShowExportMenu] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (collectionType) {
      initializeColumnConfig();
    }
  }, [collectionType]);

  const initializeColumnConfig = () => {
    const fields = collectionType.fields?.fields || [];
    const defaultColumns: ColumnConfig[] = [
      { key: 'drag', label: 'Drag Handle', visible: true, locked: false },
      { key: 'checkbox', label: 'Checkbox', visible: true, locked: false },
      { key: 'sno', label: 'ID', visible: true, locked: false },
    ];
    fields.forEach((field: any) => {
      defaultColumns.push({
        key: field.name,
        label: field.displayName.toUpperCase(),
        visible: true,
        locked: false,
      });
    });
    defaultColumns.push({ key: 'actions', label: 'ACTIONS', visible: true, locked: true });
    const saved = localStorage.getItem(`columnConfig_blogs_cate`);
    if (saved) {
      try {
        const savedConfig = JSON.parse(saved);
        const mergedConfig = defaultColumns.map((defaultCol) => {
          const savedCol = savedConfig.find((sc: ColumnConfig) => sc.key === defaultCol.key);
          return savedCol || defaultCol;
        });
        setColumnConfig(mergedConfig);
      } catch (e) {
        setColumnConfig(defaultColumns);
      }
    } else {
      setColumnConfig(defaultColumns);
    }
  };

  const saveColumnConfig = (config: ColumnConfig[]) => {
    setColumnConfig(config);
    localStorage.setItem(`columnConfig_blogs_cate`, JSON.stringify(config));
  };

  const fetchData = async () => {
    try {
      const [typeRes, entriesRes] = await Promise.all([
        fetch(`/api/collection-types/blogs_cate`),
        fetch(`${COLLECTION_API_BASE}`),
      ]);
      const typeData = await typeRes.json();
      const entriesData = await entriesRes.json();
      setCollectionType(typeData.data);
      setEntries(entriesData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setEntries((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    const toastId = toast.loading('Deleting entry...');
    try {
      const response = await fetch(`${COLLECTION_API_BASE}/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setEntries(entries.filter((e) => e.id !== id));
        toast.success('Entry deleted successfully!', { id: toastId });
      } else {
        toast.error('Failed to delete entry', { id: toastId });
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('Failed to delete entry', { id: toastId });
    }
  };

  const handleImageClick = (images: string[], startIndex: number) => {
    setLightboxImages(images);
    setLightboxIndex(startIndex);
  };

  const handleSelectEntry = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedEntries);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedEntries(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEntries(new Set(entries.map(e => e.id)));
    } else {
      setSelectedEntries(new Set());
    }
  };

  const handleBulkDelete = async () => {
    if (selectedEntries.size === 0) {
      toast.error('Please select entries to delete');
      return;
    }
    if (!confirm(`Are you sure you want to delete ${selectedEntries.size} entries?`)) return;
    const toastId = toast.loading(`Deleting ${selectedEntries.size} entries...`);
    try {
      const deletePromises = Array.from(selectedEntries).map(id =>
        fetch(`${COLLECTION_API_BASE}/${id}`, { method: 'DELETE' })
      );
      const results = await Promise.all(deletePromises);
      const successCount = results.filter(r => r.ok).length;
      if (successCount === selectedEntries.size) {
        setEntries(entries.filter(e => !selectedEntries.has(e.id)));
        setSelectedEntries(new Set());
        toast.success(`Successfully deleted ${successCount} entries`, { id: toastId });
      } else {
        toast.error(`Deleted ${successCount} out of ${selectedEntries.size} entries`, { id: toastId });
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting entries:', error);
      toast.error('Failed to delete entries', { id: toastId });
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

  const fields = collectionType.fields?.fields || [];

  return (
    <Layout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">blogs_cate</h1>
          <div className="flex items-center space-x-4">
            {selectedEntries.size > 0 && (
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2"
              >
                <Trash2 size={16} />
                <span>Delete Selected ({selectedEntries.size})</span>
              </button>
            )}
            <Link
              href="/admin/collections/blogs_cate/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Plus size={16} />
              <span>Add New blogs_cate</span>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-auto">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {columnConfig.find(c => c.key === 'drag')?.visible && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12"></th>
                  )}
                  {columnConfig.find(c => c.key === 'checkbox')?.visible && (
                    <th className="px-4 py-3 text-left w-12">
                      <input
                        type="checkbox"
                        checked={selectedEntries.size === entries.length && entries.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </th>
                  )}
                  {columnConfig.find(c => c.key === 'sno')?.visible && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">ID</th>
                  )}
                  {fields.map((field: any) => {
                    const col = columnConfig.find(c => c.key === field.name);
                    if (!col?.visible) return null;
                    return (
                      <th key={field.name} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {field.displayName}
                      </th>
                    );
                  })}
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <SortableContext items={entries.map(e => e.id)} strategy={verticalListSortingStrategy}>
                  {entries.map((entry, index) => (
                    <SortableRow
                      key={entry.id}
                      entry={entry}
                      index={index}
                      fields={fields}
                      onDelete={handleDelete}
                      onImageClick={handleImageClick}
                      visibleColumns={columnConfig}
                      collectionType={collectionType}
                      isSelected={selectedEntries.has(entry.id)}
                      onSelect={handleSelectEntry}
                    />
                  ))}
                </SortableContext>
              </tbody>
            </table>
          </DndContext>
        </div>
      </div>

      {lightboxImages && (
        <ImageLightbox
          images={lightboxImages}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxImages(null)}
        />
      )}

      <ColumnConfigModal
        isOpen={isColumnConfigOpen}
        columns={columnConfig}
        onSave={saveColumnConfig}
        onClose={() => setIsColumnConfigOpen(false)}
      />
    </Layout>
  );
}
