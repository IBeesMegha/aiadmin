'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';

interface CKEditorFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export const CKEditorField: React.FC<CKEditorFieldProps> = ({ 
  value, 
  onChange,
  placeholder = 'Start typing...',
  minHeight = 500 
}) => {
  const editorRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    let isCancelled = false;

    const initEditor = async () => {
      try {
        // Dynamically import CKEditor modules only on client side
        const { CKEditor } = await import('@ckeditor/ckeditor5-react');
        const { ClassicEditor, Essentials, Paragraph, Heading, Bold, Italic, 
          Underline, Strikethrough, Code, CodeBlock, Link, AutoLink, BlockQuote, 
          List, TodoList, Indent, Image, ImageToolbar, ImageCaption, ImageStyle, 
          ImageResize, Table, TableToolbar, TableProperties, TableCellProperties, 
          SpecialCharacters, SpecialCharactersEssentials, HorizontalLine, 
          PageBreak, Undo, SourceEditing, ShowBlocks 
        } = await import('ckeditor5');

        if (isCancelled) return;

        // Store modules for rendering
        (window as any).__CKEditorModules = {
          CKEditor,
          ClassicEditor,
          plugins: [
            Essentials,
            Paragraph,
            Heading,
            Bold,
            Italic,
            Underline,
            Strikethrough,
            Code,
            CodeBlock,
            Link,
            AutoLink,
            BlockQuote,
            List,
            TodoList,
            Indent,
            Image,
            ImageToolbar,
            ImageCaption,
            ImageStyle,
            ImageResize,
            Table,
            TableToolbar,
            TableProperties,
            TableCellProperties,
            SpecialCharacters,
            SpecialCharactersEssentials,
            HorizontalLine,
            PageBreak,
            Undo,
            SourceEditing,
            ShowBlocks,
          ]
        };

        setIsLoaded(true);
      } catch (err: any) {
        console.error('Failed to load CKEditor:', err);
        if (!isCancelled) {
          setError(err.message || 'Failed to load editor');
        }
      }
    };

    initEditor();

    return () => {
      isCancelled = true;
      if (editorRef.current) {
        editorRef.current.destroy?.().catch(() => {});
        editorRef.current = null;
      }
    };
  }, []);

  const handleEditorReady = useCallback((editor: any) => {
    editorRef.current = editor;
  }, []);

  const handleChange = useCallback(
    (_event: unknown, editor: any) => {
      onChange(editor.getData());
    },
    [onChange]
  );

  useEffect(() => {
    if (editorRef.current && value !== undefined) {
      const currentData = editorRef.current.getData();
      if (currentData !== value) {
        editorRef.current.setData(value || '');
      }
    }
  }, [value]);

  if (error) {
    return (
      <div className="w-full p-4 border border-red-300 rounded bg-red-50 text-red-600">
        Error loading editor: {error}
      </div>
    );
  }

  if (!isLoaded || typeof window === 'undefined') {
    return (
      <div 
        className="w-full border border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center"
        style={{ minHeight: `${minHeight}px` }}
      >
        <span className="text-gray-500">Loading CKEditor...</span>
      </div>
    );
  }

  const modules = (window as any).__CKEditorModules;
  if (!modules) {
    return (
      <div className="w-full p-4 border border-yellow-300 rounded bg-yellow-50 text-yellow-700">
        Editor modules not loaded
      </div>
    );
  }

  const { CKEditor, ClassicEditor, plugins } = modules;

  return (
    <div className="ckeditor-wrapper">
      <CKEditor
        editor={ClassicEditor}
        data={value}
        onReady={handleEditorReady}
        onChange={handleChange}
        config={{
          licenseKey: 'GPL',
          plugins,
          toolbar: {
            items: [
              'undo',
              'redo',
              '|',
              'heading',
              '|',
              'bold',
              'italic',
              'underline',
              'strikethrough',
              'code',
              '|',
              'bulletedList',
              'numberedList',
              'todoList',
              '|',
              'outdent',
              'indent',
              '|',
              'link',
              'insertTable',
              'blockQuote',
              'horizontalLine',
              'pageBreak',
              'specialCharacters',
              '|',
              'codeBlock',
              'sourceEditing',
              'showBlocks',
            ],
          },
          heading: {
            options: [
              { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
              { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
              { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
              { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' },
            ],
          },
          image: {
            toolbar: [
              'imageTextAlternative',
              '|',
              'imageStyle:inline',
              'imageStyle:block',
              'imageStyle:side',
            ],
          },
          table: {
            contentToolbar: [
              'tableColumn',
              'tableRow',
              'mergeTableCells',
              'tableProperties',
              'tableCellProperties',
            ],
          },
          link: {
            addTargetToExternalLinks: true,
          },
          placeholder,
        }}
      />
    </div>
  );
};