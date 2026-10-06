import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Search } from 'lucide-react';

interface Option {
  id: string | number;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  value: (string | number)[];
  onChange: (selected: (string | number)[]) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  error?: boolean;
  loading?: boolean;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  value = [],
  onChange,
  placeholder = 'Select items...',
  label = 'items',
  disabled = false,
  error = false,
  loading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Filter options based on search term
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get selected options for display
  const selectedOptions = options.filter((option) => value.includes(option.id));

  // Toggle option selection
  const toggleOption = (optionId: string | number) => {
    if (disabled) return;
    
    const newValue = value.includes(optionId)
      ? value.filter((id) => id !== optionId)
      : [...value, optionId];
    
    onChange(newValue);
  };

  // Remove specific selected item
  const removeItem = (optionId: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onChange(value.filter((id) => id !== optionId));
  };

  // Clear all selections
  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onChange([]);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Main input/trigger */}
      <div
        onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
        className={`
          min-h-[42px] w-full px-3 py-2 border rounded-lg 
          focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent
          transition-all cursor-pointer
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-gray-400'}
          ${error ? 'border-red-500' : 'border-gray-300'}
          ${isOpen ? 'ring-2 ring-blue-500 border-transparent' : ''}
        `}
      >
        <div className="flex items-center justify-between gap-2">
          {/* Selected items display */}
          <div className="flex-1 flex flex-wrap gap-1.5 min-h-[26px] items-center">
            {loading ? (
              <span className="text-sm text-gray-500">Loading...</span>
            ) : selectedOptions.length > 0 ? (
              selectedOptions.map((option) => (
                <span
                  key={option.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-sm font-medium"
                >
                  <span className="max-w-[200px] truncate">{option.label}</span>
                  <button
                    type="button"
                    onClick={(e) => removeItem(option.id, e)}
                    disabled={disabled}
                    className="hover:bg-blue-200 rounded-sm p-0.5 transition-colors disabled:opacity-50"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))
            ) : (
              <span className="text-sm text-gray-400">{placeholder}</span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {selectedOptions.length > 0 && !disabled && (
              <button
                type="button"
                onClick={clearAll}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Clear all"
              >
                <X size={16} className="text-gray-400" />
              </button>
            )}
            <ChevronDown
              size={18}
              className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-200 bg-gray-50">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Search ${label}...`}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              <div className="py-1">
                {filteredOptions.map((option) => {
                  const isSelected = value.includes(option.id);
                  return (
                    <div
                      key={option.id}
                      onClick={() => toggleOption(option.id)}
                      className={`
                        px-3 py-2 cursor-pointer transition-colors
                        ${isSelected
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm">{option.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-3 py-8 text-center text-sm text-gray-500">
                No {label} found
                {searchTerm && (
                  <>
                    {' '}matching "<span className="font-medium">{searchTerm}</span>"
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer with selection count */}
          {selectedOptions.length > 0 && (
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
              {selectedOptions.length} {label} selected
            </div>
          )}
        </div>
      )}
    </div>
  );
};
