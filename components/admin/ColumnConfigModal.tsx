import React, { useState, useEffect } from 'react';
import { X, Settings } from 'lucide-react';

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  locked?: boolean; // Some columns like actions should always be visible
}

interface ColumnConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnConfig[];
  onSave: (columns: ColumnConfig[]) => void;
}

export const ColumnConfigModal: React.FC<ColumnConfigModalProps> = ({
  isOpen,
  onClose,
  columns,
  onSave,
}) => {
  const [localColumns, setLocalColumns] = useState<ColumnConfig[]>(columns);

  useEffect(() => {
    setLocalColumns(columns);
  }, [columns]);

  if (!isOpen) return null;

  const handleToggle = (key: string) => {
    setLocalColumns((prev) =>
      prev.map((col) =>
        col.key === key && !col.locked ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const handleSave = () => {
    onSave(localColumns);
    onClose();
  };

  const handleReset = () => {
    setLocalColumns(
      columns.map((col) => ({
        ...col,
        visible: true,
      }))
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Settings className="text-blue-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">Configure the view</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="text-sm text-gray-600 mb-4">
            Select the columns you want to display in the table view
          </p>

          <div className="space-y-2">
            {localColumns.map((column) => (
              <div
                key={column.key}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  column.locked
                    ? 'bg-gray-50 border-gray-200'
                    : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                } transition`}
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={column.visible}
                    onChange={() => handleToggle(column.key)}
                    disabled={column.locked}
                    className={`w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 ${
                      column.locked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                    }`}
                  />
                  <label
                    className={`text-sm font-medium ${
                      column.locked ? 'text-gray-400' : 'text-gray-700'
                    }`}
                  >
                    {column.label}
                  </label>
                </div>
                {column.locked && (
                  <span className="text-xs text-gray-400 italic">Always visible</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition"
          >
            Reset to default
          </button>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
