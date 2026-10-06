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
  name: string;
  fields: any[];
  onDelete: (id: string) => void;
  onImageClick: (images: string[], startIndex: number) => void;
  visibleColumns: ColumnConfig[];
  collectionType: any;
  isSelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
}

const SortableRow: React.FC<SortableRowProps> = ({ entry, index, name, fields, onDelete, onImageClick, visibleColumns, collectionType, isSelected, onSelect }) => {
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

  // Find the first field that contains an image
  const getImageField = () => {
    console.log('=== Checking entry for images ===');
    console.log('Entry ID:', entry.id);
    console.log('Entry keys:', Object.keys(entry));
    console.log('Entry data:', JSON.stringify(entry, null, 2));
    console.log('Available fields from collection type:', fields);

    let singleMediaField = null;

    // First pass: Look for MULTIPLE media fields (prioritize these)
    for (const field of fields) {
      console.log(`Checking field: ${field.name}, type: ${field.type}, multiple: ${field.multiple}`);

      if (field.type === 'media' && field.multiple) {
        const value = entry[field.name];
        console.log(`  Multiple media field "${field.name}" value:`, value);
        console.log(`  Value type:`, typeof value);
        console.log(`  Is array:`, Array.isArray(value));

        if (value) {
          let urls: string[] = [];

          if (Array.isArray(value)) {
            urls = value;
            console.log(`  ✓ Already an array with ${urls.length} items`);
          } else if (typeof value === 'string') {
            console.log(`  Attempting to parse string value...`);
            try {
              const parsed = JSON.parse(value);
              console.log(`  Parsed result:`, parsed);
              if (Array.isArray(parsed)) {
                urls = parsed;
                console.log(`  ✓ Parsed to array with ${urls.length} items`);
              }
            } catch (e) {
              console.error('  ✗ Failed to parse JSON:', e);
            }
          }

          const validUrls = urls.filter(url => typeof url === 'string' && url.trim());
          console.log(`  Valid URLs after filtering:`, validUrls);

          if (validUrls.length > 0) {
            console.log(`  ✓✓✓ SUCCESS: Found ${validUrls.length} images in field "${field.name}":`, validUrls);
            return { url: validUrls[0], allUrls: validUrls, isMultiple: true };
          }
        }
      } else if (field.type === 'media' && !field.multiple) {
        // Store single media field for later
        const value = entry[field.name];
        console.log(`  Single media field "${field.name}" value:`, value);
        if (value && typeof value === 'string' && value.trim() && !singleMediaField) {
          singleMediaField = { url: value, allUrls: [value], isMultiple: false };
          console.log(`  ✓ Stored single media field for later`);
        }
      }
    }

    // Fallback: Check for common image field names in the entry data itself
    console.log('=== FALLBACK: Checking entry data directly for image fields ===');
    const imageFieldNames = ['images', 'image', 'photos', 'gallery', 'media'];

    for (const fieldName of imageFieldNames) {
      if (entry[fieldName]) {
        const value = entry[fieldName];
        console.log(`Found "${fieldName}" in entry:`, value);
        console.log(`  Type:`, typeof value);
        console.log(`  Is array:`, Array.isArray(value));

        let urls: string[] = [];

        if (Array.isArray(value)) {
          urls = value;
          console.log(`  ✓ Already an array with ${urls.length} items`);
        } else if (typeof value === 'string') {
          console.log(`  Attempting to parse string...`);
          try {
            const parsed = JSON.parse(value);
            console.log(`  Parsed result:`, parsed);
            if (Array.isArray(parsed)) {
              urls = parsed;
              console.log(`  ✓ Parsed to array with ${urls.length} items`);
            }
          } catch (e) {
            console.error('  ✗ Not valid JSON');
          }
        }

        const validUrls = urls.filter(url => typeof url === 'string' && url.trim());
        console.log(`  Valid URLs:`, validUrls);

        if (validUrls.length > 0) {
          console.log(`  ✓✓✓ FALLBACK SUCCESS: Found ${validUrls.length} images in "${fieldName}":`, validUrls);
          return { url: validUrls[0], allUrls: validUrls, isMultiple: true };
        }
      }
    }

    // If we found a single media field, return it
    if (singleMediaField) {
      console.log('=== Returning single media field ===', singleMediaField);
      return singleMediaField;
    }

    console.log('=== No image field found ===');
    return null;
  };

  const imageField = getImageField();

  // Get the heading field (first text field)
  const getHeading = () => {
    for (const field of fields) {
      if (field.type === 'string' || field.type === 'text') {
        return entry[field.name] || 'Untitled';
      }
    }
    return entry.id.substring(0, 8);
  };

  // Count images
  const getImageCount = () => {
    if (!imageField) return 0;
    return imageField.allUrls.length;
  };

  // Helper to check if column is visible
  const isColumnVisible = (key: string) => {
    const column = visibleColumns.find((col) => col.key === key);
    return column ? column.visible : true;
  };

  // Helper to render field value
  const renderFieldValue = (field: any, value: any): React.ReactNode => {
    if (!value && value !== 0 && value !== false) return '—';

    switch (field.type) {
      case 'media':
        if (field.multiple) {
          // Multiple media field
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
              // Not JSON, might be single URL
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
                <img
                  src={validUrls[0]}
                  alt="Thumbnail"
                  className="w-full h-full object-cover"
                />
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
          // Single media field
          if (typeof value === 'string' && value.trim()) {
            return (
              <button
                onClick={() => onImageClick([value], 0)}
                className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 hover:ring-2 hover:ring-blue-500 transition flex-shrink-0"
              >
                <img
                  src={value}
                  alt="Thumbnail"
                  className="w-full h-full object-cover"
                />
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
        // For relations, show the related data in a nice format
        if (Array.isArray(value)) {
          // oneToMany relation - show count with tooltip
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
          // manyToOne or oneToOne relation - show name
          const displayName = value.name || value.title || value.displayName || value.id;
          return (
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800 max-w-xs truncate" title={displayName}>
              {displayName}
            </span>
          );
        } else if (value) {
          // Just an ID
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
      {/* Drag Handle */}
      {isColumnVisible('drag') && (
        <td className="px-4 py-4 w-12">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
          >
            <GripVertical size={20} />
          </div>
        </td>
      )}

      {/* Checkbox */}
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

      {/* ID (S.No) */}
      {isColumnVisible('sno') && (
        <td className="px-4 py-4 text-sm text-gray-700 w-16">
          {index + 1}
        </td>
      )}

      {/* Dynamic Fields */}
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

      {/* Actions */}
      <td className="px-4 py-4 text-right w-24">
        <div className="flex items-center justify-end space-x-2">
          <Link
            href={`/admin/collections/${name}/${entry.id}`}
            className="text-blue-600 hover:text-blue-900"
          >
            <Edit size={18} />
          </Link>
          <button
            onClick={() => onDelete(entry.id)}
            className="text-red-600 hover:text-red-900"
          >
            <Trash2 size={18} />
          </button>
          <button className="text-gray-600 hover:text-gray-900">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
};

// Image Lightbox Component
interface ImageLightboxProps {
  images: string[];
  currentIndex: number;
  onClose: () => void;
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({ images, currentIndex, onClose }) => {
  const [index, setIndex] = useState(currentIndex);

  const goNext = () => {
    setIndex((prev) => (prev + 1) % images.length);
  };

  const goPrev = () => {
    setIndex((prev) => (prev - 1 + images.length) % images.length);
  };

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
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/50 to-transparent flex items-center justify-between px-6 z-10">
        {/* Counter */}
        <div className="text-white text-base">
          {index + 1} / {images.length}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-4">
          <button className="text-white hover:text-gray-300 transition">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </button>
          <button className="text-white hover:text-gray-300 transition">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          </button>
          <button className="text-white hover:text-gray-300 transition">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
          </button>
          <button className="text-white hover:text-gray-300 transition">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
            </svg>
          </button>
          <button className="text-white hover:text-gray-300 transition">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 transition"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Previous Button */}
      {images.length > 1 && (
        <button
          onClick={goPrev}
          className="absolute left-6 text-white hover:bg-white/10 rounded-full p-2 transition z-10"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}

      {/* Image Container */}
      <div className="flex items-center justify-center w-full h-full px-20 py-24">
        <img
          src={images[index]}
          alt={`Image ${index + 1}`}
          className="max-w-full max-h-full object-contain"
        />
      </div>

      {/* Next Button */}
      {images.length > 1 && (
        <button
          onClick={goNext}
          className="absolute right-6 text-white hover:bg-white/10 rounded-full p-2 transition z-10"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10 bg-black/30 backdrop-blur-sm rounded-lg p-2">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`w-16 h-16 rounded overflow-hidden transition ${i === index
                  ? 'ring-2 ring-white scale-110'
                  : 'opacity-60 hover:opacity-100 hover:scale-105'
                }`}
            >
              <img src={img} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default function CollectionList() {
  const router = useRouter();
  const { name } = router.query;

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
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (name) {
      fetchData();
    }
  }, [name]);

  useEffect(() => {
    if (collectionType) {
      initializeColumnConfig();
    }
  }, [collectionType]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showExportMenu && !target.closest('.export-menu-container')) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu]);

  const initializeColumnConfig = () => {
    const fields = collectionType.fields?.fields || [];

    // Build default column config based on actual fields
    const defaultColumns: ColumnConfig[] = [
      { key: 'drag', label: 'Drag Handle', visible: true, locked: false },
      { key: 'checkbox', label: 'Checkbox', visible: true, locked: false },
      { key: 'sno', label: 'ID', visible: true, locked: false },
    ];

    // Add columns for each field in the collection type
    fields.forEach((field: any) => {
      defaultColumns.push({
        key: field.name,
        label: field.displayName.toUpperCase(),
        visible: true,
        locked: false,
      });
    });

    // Always add actions column at the end
    defaultColumns.push({ key: 'actions', label: 'ACTIONS', visible: true, locked: true });

    // Try to load saved config from localStorage
    const saved = localStorage.getItem(`columnConfig_${name}`);
    if (saved) {
      try {
        const savedConfig = JSON.parse(saved);
        // Merge saved config with default (in case new fields were added)
        const mergedConfig = defaultColumns.map((defaultCol) => {
          const savedCol = savedConfig.find((sc: ColumnConfig) => sc.key === defaultCol.key);
          return savedCol || defaultCol;
        });
        setColumnConfig(mergedConfig);
      } catch (e) {
        console.error('Failed to load column config:', e);
        setColumnConfig(defaultColumns);
      }
    } else {
      setColumnConfig(defaultColumns);
    }
  };

  const saveColumnConfig = (config: ColumnConfig[]) => {
    setColumnConfig(config);
    localStorage.setItem(`columnConfig_${name}`, JSON.stringify(config));
  };

  const fetchData = async () => {
    try {
      const [typeRes, entriesRes] = await Promise.all([
        fetch(`/api/collection-types/${name}`),
        fetch(`/api/collections/${name}`),
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
      const response = await fetch(`/api/collections/${name}/${id}`, {
        method: 'DELETE',
      });

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

    if (!confirm(`Are you sure you want to delete ${selectedEntries.size} entries?`)) {
      return;
    }

    const toastId = toast.loading(`Deleting ${selectedEntries.size} entries...`);

    try {
      const deletePromises = Array.from(selectedEntries).map(id =>
        fetch(`/api/collections/${name}/${id}`, { method: 'DELETE' })
      );

      const results = await Promise.all(deletePromises);
      const successCount = results.filter(r => r.ok).length;

      if (successCount === selectedEntries.size) {
        setEntries(entries.filter(e => !selectedEntries.has(e.id)));
        setSelectedEntries(new Set());
        toast.success(`Successfully deleted ${successCount} entries`, { id: toastId });
      } else {
        toast.error(`Deleted ${successCount} out of ${selectedEntries.size} entries`, { id: toastId });
        fetchData(); // Refresh to get current state
      }
    } catch (error) {
      console.error('Error deleting entries:', error);
      toast.error('Failed to delete entries', { id: toastId });
    }
  };

  const exportToCSV = (data: any[]) => {
    if (data.length === 0) {
      toast.error('No data to export');
      return;
    }

    const fields = collectionType.fields?.fields || [];

    // Create CSV header
    const headers = ['ID', ...fields.map((f: any) => f.displayName)];
    const csvRows = [headers.join(',')];

    // Add data rows
    data.forEach(entry => {
      const row = [
        entry.id,
        ...fields.map((field: any) => {
          let value = entry[field.name];

          // Handle different field types
          if (value === null || value === undefined) {
            return '';
          }

          if (field.type === 'media') {
            if (field.multiple && Array.isArray(value)) {
              return `"${value.join('; ')}"`;
            }
            return `"${value}"`;
          }

          if (typeof value === 'object') {
            return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          }

          // Escape quotes and wrap in quotes if contains comma
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }

          return stringValue;
        })
      ];
      csvRows.push(row.join(','));
    });

    // Create and download file
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${name}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${data.length} entries to CSV`);
  };

  const exportToExcel = (data: any[]) => {
    if (data.length === 0) {
      toast.error('No data to export');
      return;
    }

    const fields = collectionType.fields?.fields || [];

    // Create HTML table for Excel
    let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
    html += '<head><meta charset="utf-8"/></head><body>';
    html += '<table border="1">';

    // Header row
    html += '<tr>';
    html += '<th>ID</th>';
    fields.forEach((field: any) => {
      html += `<th>${field.displayName}</th>`;
    });
    html += '</tr>';

    // Data rows
    data.forEach(entry => {
      html += '<tr>';
      html += `<td>${entry.id}</td>`;
      fields.forEach((field: any) => {
        let value = entry[field.name];

        if (value === null || value === undefined) {
          html += '<td></td>';
          return;
        }

        if (field.type === 'media') {
          if (field.multiple && Array.isArray(value)) {
            html += `<td>${value.join('; ')}</td>`;
          } else {
            html += `<td>${value}</td>`;
          }
        } else if (typeof value === 'object') {
          html += `<td>${JSON.stringify(value)}</td>`;
        } else {
          html += `<td>${String(value).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`;
        }
      });
      html += '</tr>';
    });

    html += '</table></body></html>';

    // Create and download file
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${name}_${new Date().toISOString().split('T')[0]}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${data.length} entries to Excel`);
  };

  const handleExport = (format: 'csv' | 'excel', scope: 'selected' | 'all') => {
    let dataToExport: any[];

    if (scope === 'selected') {
      if (selectedEntries.size === 0) {
        toast.error('Please select entries to export');
        return;
      }
      dataToExport = entries.filter(e => selectedEntries.has(e.id));
    } else {
      dataToExport = entries;
    }

    if (format === 'csv') {
      exportToCSV(dataToExport);
    } else {
      exportToExcel(dataToExport);
    }

    setShowExportMenu(false);
  };

  // Helper to check if column is visible
  const isColumnVisible = (key: string) => {
    const column = columnConfig.find((col) => col.key === key);
    return column ? column.visible : true;
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
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {collectionType.displayName}
            </h1>
            {collectionType.description && (
              <p className="text-gray-600 mt-2">{collectionType.description}</p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {selectedEntries.size > 0 && (
              <>
                <div className="text-sm text-gray-600 px-3 py-2 bg-blue-50 rounded-lg">
                  {selectedEntries.size} selected
                </div>
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  <Trash2 size={20} />
                  <span>Delete Selected</span>
                </button>
              </>
            )}
            <div className="relative export-menu-container">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                <Download size={20} />
                <span>Export</span>
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <div className="py-2">
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Export as CSV</div>
                    <button
                      onClick={() => handleExport('csv', 'selected')}
                      disabled={selectedEntries.size === 0}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Export Selected ({selectedEntries.size})
                    </button>
                    <button
                      onClick={() => handleExport('csv', 'all')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Export All ({entries.length})
                    </button>
                    <div className="border-t border-gray-200 my-2"></div>
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Export as Excel</div>
                    <button
                      onClick={() => handleExport('excel', 'selected')}
                      disabled={selectedEntries.size === 0}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Export Selected ({selectedEntries.size})
                    </button>
                    <button
                      onClick={() => handleExport('excel', 'all')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Export All ({entries.length})
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setIsColumnConfigOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              title="Configure the view"
            >
              <Settings size={20} />
              <span>Configure view</span>
            </button>
            <Link
              href={`/admin/collections/${name}/new`}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={20} />
              <span>Create New Entry</span>
            </Link>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">
              No entries yet
            </p>
            <Link
              href={`/admin/collections/${name}/new`}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={20} />
              <span>Create First Entry</span>
            </Link>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full table-fixed">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {isColumnVisible('drag') && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12"></th>
                  )}
                  {isColumnVisible('checkbox') && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                      <input
                        type="checkbox"
                        checked={selectedEntries.size === entries.length && entries.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </th>
                  )}
                  {isColumnVisible('sno') && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16">ID</th>
                  )}
                  {/* Dynamic field headers */}
                  {fields.map((field: any) => {
                    if (!isColumnVisible(field.name)) return null;
                    return (
                      <th key={field.name} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase truncate" style={{ maxWidth: '300px' }}>
                        <div className="truncate" title={field.displayName.toUpperCase()}>
                          {field.displayName.toUpperCase()}
                        </div>
                      </th>
                    );
                  })}
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-24">ACTIONS</th>
                </tr>
              </thead>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={entries.map((e) => e.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody className="bg-white">
                    {entries.map((entry, index) => (
                      <SortableRow
                        key={entry.id}
                        entry={entry}
                        index={index}
                        name={name as string}
                        fields={fields}
                        onDelete={handleDelete}
                        onImageClick={handleImageClick}
                        visibleColumns={columnConfig}
                        collectionType={collectionType}
                        isSelected={selectedEntries.has(entry.id)}
                        onSelect={handleSelectEntry}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </DndContext>
            </table>
          </div>
          </>
        )}
      </div>

      {/* Column Configuration Modal */}
      <ColumnConfigModal
        isOpen={isColumnConfigOpen}
        onClose={() => setIsColumnConfigOpen(false)}
        columns={columnConfig}
        onSave={saveColumnConfig}
      />

      {/* Image Lightbox */}
      {lightboxImages && (
        <ImageLightbox
          images={lightboxImages}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxImages(null)}
        />
      )}
    </Layout>
  );
}
