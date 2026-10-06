import React, { useState, useEffect } from 'react';
import { MediaAsset } from '@/lib/media';
import { MediaLibraryModal } from './MediaLibraryModal';
import { ManageMediaModal } from './ManageMediaModal';
import { Plus, Edit, Trash2, Settings } from 'lucide-react';

interface MediaFieldControllerProps {
  fieldName: string;
  multiple?: boolean;
  value: any; // Can be string, array, or stringified JSON
  onChange: (value: any) => void; // Can pass string or array
}

export const MediaFieldController: React.FC<MediaFieldControllerProps> = ({
  fieldName,
  multiple = false,
  value,
  onChange,
}) => {
  const [localSelectedMedia, setLocalSelectedMedia] = useState<MediaAsset | MediaAsset[] | null>(null);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);

  // Initialize from field value
  useEffect(() => {
    if (value) {
      console.log(`[MediaFieldController ${fieldName}] Initializing with value:`, value);
      if (multiple) {
        try {
          // Handle both array and stringified array
          let urls: string[] = [];
          if (Array.isArray(value)) {
            urls = value;
          } else if (typeof value === 'string') {
            // Try to parse if it's a JSON string
            try {
              const parsed = JSON.parse(value);
              if (Array.isArray(parsed)) {
                urls = parsed;
              }
            } catch {
              // Not JSON, might be a single URL
              if (value.trim()) {
                urls = [value];
              }
            }
          }
          
          if (urls.length > 0) {
            const mockAssets: MediaAsset[] = urls.map((url, index) => ({
              id: `temp-${index}`,
              name: url.split('/').pop() || 'image',
              url,
              mime: 'image/jpeg',
              size: 0,
              ext: url.split('.').pop() || 'jpg',
              createdAt: new Date(),
              updatedAt: new Date(),
            }));
            setLocalSelectedMedia(mockAssets);
          }
        } catch (e) {
          console.error(`[MediaFieldController ${fieldName}] Failed to parse:`, e);
        }
      } else {
        if (typeof value === 'string' && value.trim()) {
          const mockAsset: MediaAsset = {
            id: 'temp-single',
            name: value.split('/').pop() || 'image',
            url: value,
            mime: 'image/jpeg',
            size: 0,
            ext: value.split('.').pop() || 'jpg',
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          setLocalSelectedMedia(mockAsset);
        }
      }
    }
  }, [value, multiple, fieldName]);

  const handleMediaSelect = (media: MediaAsset | MediaAsset[]) => {
    console.log(`[MediaFieldController ${fieldName}] Media selected:`, media);
    setLocalSelectedMedia(media);
    if (Array.isArray(media)) {
      // Store as array of URLs (not stringified)
      const urlArray = media.map(m => m.url);
      console.log(`[MediaFieldController ${fieldName}] Calling onChange with (multiple):`, urlArray);
      onChange(urlArray as any);
      console.log(`[MediaFieldController ${fieldName}] onChange called successfully`);
    } else {
      console.log(`[MediaFieldController ${fieldName}] Calling onChange with (single):`, media.url);
      onChange(media.url);
      console.log(`[MediaFieldController ${fieldName}] onChange called successfully`);
    }
  };

  const handleManageMediaSave = (media: MediaAsset[]) => {
    setLocalSelectedMedia(media);
    // Store as array of URLs (not stringified)
    const urlArray = media.map(m => m.url);
    onChange(urlArray as any);
  };

  const removeMedia = (index?: number) => {
    if (multiple && Array.isArray(localSelectedMedia) && index !== undefined) {
      const updated = localSelectedMedia.filter((_, i) => i !== index);
      setLocalSelectedMedia(updated);
      // Store as array of URLs (not stringified)
      onChange(updated.map(m => m.url) as any);
    } else {
      setLocalSelectedMedia(null);
      onChange('');
    }
  };

  return (
    <>
      <div className="space-y-3">
        {multiple ? (
          // Multiple media
          <div className="space-y-3">
            {localSelectedMedia && Array.isArray(localSelectedMedia) && localSelectedMedia.length > 0 ? (
              <div className="relative border-2 border-gray-200 rounded-lg overflow-hidden group w-64">
                {/* Main Image Preview */}
                <div className="w-full h-48 bg-gray-100 flex items-center justify-center overflow-hidden">
                  <img
                    src={localSelectedMedia[0].url}
                    alt={localSelectedMedia[0].alternativeText || localSelectedMedia[0].name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Hover Overlay with Actions */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition flex items-center justify-center space-x-2 opacity-0 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => setShowMediaModal(true)}
                    className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
                    title="Add more"
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowManageModal(true)}
                    className="p-2 bg-purple-500 text-white rounded-full hover:bg-purple-600"
                    title="Manage media"
                  >
                    <Settings size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeMedia(0)}
                    className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Footer with count */}
                <div className="bg-white p-2 border-t flex items-center justify-between">
                  <p className="text-xs text-gray-600 truncate">
                    {localSelectedMedia.length} {localSelectedMedia.length === 1 ? 'image' : 'images'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowManageModal(true)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Manage
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowMediaModal(true)}
                className="w-64 h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <Plus size={32} className="text-blue-600 mb-2" />
                <span className="text-sm text-gray-700">Click to add assets</span>
              </button>
            )}
          </div>
        ) : (
          // Single media
          <div>
            {localSelectedMedia && !Array.isArray(localSelectedMedia) ? (
              <div className="relative border-2 border-gray-200 rounded-lg overflow-hidden group w-64">
                <div className="w-full h-48 bg-gray-100 flex items-center justify-center overflow-hidden">
                  <img
                    src={localSelectedMedia.url}
                    alt={localSelectedMedia.alternativeText || localSelectedMedia.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition flex items-center justify-center space-x-2 opacity-0 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => setShowMediaModal(true)}
                    className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeMedia()}
                    className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="bg-white p-2 border-t">
                  <p className="text-xs text-gray-600 truncate">{localSelectedMedia.name}</p>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowMediaModal(true)}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center hover:border-blue-500 hover:bg-blue-50 transition max-w-xs"
              >
                <Plus size={32} className="text-blue-600 mb-2" />
                <span className="text-sm text-gray-700">Click to add an asset or drag and drop one in this area</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Media Library Modal */}
      <MediaLibraryModal
        isOpen={showMediaModal}
        onClose={() => setShowMediaModal(false)}
        onSelect={handleMediaSelect}
        multiple={multiple}
        selectedIds={
          localSelectedMedia
            ? Array.isArray(localSelectedMedia)
              ? localSelectedMedia.map(m => m.id)
              : [localSelectedMedia.id]
            : []
        }
      />

      {/* Manage Media Modal (for multiple media only) */}
      {multiple && Array.isArray(localSelectedMedia) && (
        <ManageMediaModal
          isOpen={showManageModal}
          onClose={() => setShowManageModal(false)}
          media={localSelectedMedia}
          onSave={handleManageMediaSave}
        />
      )}
    </>
  );
};
