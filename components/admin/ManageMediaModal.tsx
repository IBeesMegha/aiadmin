import React, { useState } from 'react';
import { X, GripVertical, Trash2 } from 'lucide-react';
import { MediaAsset } from '@/lib/media';
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

interface ManageMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: MediaAsset[];
  onSave: (media: MediaAsset[]) => void;
}

interface SortableItemProps {
  media: MediaAsset;
  index: number;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}

const SortableItem: React.FC<SortableItemProps> = ({ media, index, isSelected, onToggleSelect }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: media.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center space-x-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition"
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
      >
        <GripVertical size={20} />
      </div>

      {/* Checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onToggleSelect(media.id)}
        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      />

      {/* Image Preview */}
      <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
        <img
          src={media.url}
          alt={media.alternativeText || media.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{media.name}</p>
        <p className="text-xs text-gray-500">{media.ext.toUpperCase()}</p>
      </div>
    </div>
  );
};

export const ManageMediaModal: React.FC<ManageMediaModalProps> = ({
  isOpen,
  onClose,
  media: initialMedia,
  onSave,
}) => {
  const [media, setMedia] = useState<MediaAsset[]>(initialMedia);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setMedia((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    
    if (confirm(`Delete ${selectedIds.size} selected image(s)?`)) {
      const filtered = media.filter((m) => !selectedIds.has(m.id));
      setMedia(filtered);
      setSelectedIds(new Set());
    }
  };

  const handleSave = () => {
    onSave(media);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Manage Media ({media.length})</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {media.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No media selected
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={media.map((m) => m.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {media.map((item, index) => (
                    <SortableItem
                      key={item.id}
                      media={item}
                      index={index}
                      isSelected={selectedIds.has(item.id)}
                      onToggleSelect={toggleSelect}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t">
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              CANCEL
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={selectedIds.size === 0}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              DELETE SELECTED ({selectedIds.size})
            </button>
          </div>
          <button
            onClick={handleSave}
            className="px-6 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg"
          >
            SAVE ORDER
          </button>
        </div>
      </div>
    </div>
  );
};
