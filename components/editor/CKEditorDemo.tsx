'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import './CKEditor.css';

const CKEditorField = dynamic(
  () => import('./CKEditorField'),
  { ssr: false }
);

export interface CKEditorDemoProps {
  initialValue?: string;
  onChange?: (value: string) => void;
}

export const CKEditorDemo: React.FC<CKEditorDemoProps> = ({
  initialValue = '',
  onChange,
}) => {
  const [content, setContent] = useState(initialValue);
  const [isPreview, setIsPreview] = useState(false);

  const handleChange = (value: string) => {
    setContent(value);
    if (onChange) {
      onChange(value);
    }
  };

  const handleClear = () => {
    setContent('');
  };

  return (
    <div className="ckeditor-demo">
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setIsPreview(false)}
            className={`px-4 py-2 rounded transition-colors ${
              !isPreview
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Editor
          </button>
          <button
            onClick={() => setIsPreview(true)}
            className={`px-4 py-2 rounded transition-colors ${
              isPreview
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Preview HTML
          </button>
          <button
            onClick={handleClear}
            className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600 transition-colors ml-auto"
          >
            Clear Content
          </button>
        </div>
        <div className="text-sm text-gray-500">
          Character count: {content.replace(/<[^>]*>/g, '').length}
        </div>
      </div>

      {isPreview ? (
        <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 min-h-[500px]">
          <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
            {content || 'No content'}
          </pre>
        </div>
      ) : (
        <CKEditorField
          value={content}
          onChange={handleChange}
          placeholder="Start typing your content here..."
          minHeight={500}
        />
      )}
    </div>
  );
};

export default CKEditorDemo;