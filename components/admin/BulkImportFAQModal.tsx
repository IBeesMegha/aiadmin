import React, { useState } from 'react';
import { X, Loader, Upload, FileText, AlertCircle, Download } from 'lucide-react';
import toast from 'react-hot-toast';

interface BulkImportFAQModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkImportFAQModal: React.FC<BulkImportFAQModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [jsonInput, setJsonInput] = useState('');
  const [importMode, setImportMode] = useState<'file' | 'json'>('file');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const faqs = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length < 2) continue;

      const faq: any = {};
      headers.forEach((header, index) => {
        if (header === 'keywords') {
          faq[header] = values[index] ? values[index].split('|').map(k => k.trim()) : [];
        } else if (header === 'priority') {
          faq[header] = parseInt(values[index]) || 0;
        } else {
          faq[header] = values[index]?.trim() || '';
        }
      });

      faqs.push(faq);
    }

    return faqs;
  };

  const handleFileImport = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setLoading(true);

    try {
      const text = await file.text();
      let faqs = [];

      if (file.name.endsWith('.json')) {
        faqs = JSON.parse(text);
      } else if (file.name.endsWith('.csv')) {
        faqs = parseCSV(text);
      } else {
        toast.error('Unsupported file format. Please use CSV or JSON');
        setLoading(false);
        return;
      }

      await performImport(faqs);
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('Failed to read file');
      setLoading(false);
    }
  };

  const handleJsonImport = async () => {
    if (!jsonInput.trim()) {
      toast.error('Please enter JSON data');
      return;
    }

    setLoading(true);

    try {
      const faqs = JSON.parse(jsonInput);
      await performImport(faqs);
    } catch (error) {
      console.error('Error parsing JSON:', error);
      toast.error('Invalid JSON format');
      setLoading(false);
    }
  };

  const performImport = async (faqs: any[]) => {
    try {
      const response = await fetch('/api/faq/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ faqs }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        if (result.data.errors.length > 0) {
          console.warn('Import errors:', result.data.errors);
        }
        onSuccess();
        onClose();
        resetForm();
      } else {
        toast.error(result.error || 'Failed to import FAQs');
        if (result.errors) {
          console.error('Import errors:', result.errors);
        }
      }
    } catch (error) {
      console.error('Error importing FAQs:', error);
      toast.error('Failed to import FAQs');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setJsonInput('');
  };

  const downloadTemplate = () => {
    const csvContent = 'question,answer,status,keywords,category,priority\n' +
      '"What is your refund policy?","We offer a 30-day money-back guarantee",active,"refund|policy|money",Billing,5\n' +
      '"How do I reset my password?","Click on Forgot Password on the login page",active,"password|reset|login",Account,3';

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'faq-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadJsonTemplate = () => {
    const jsonContent = [
      {
        question: "What is your refund policy?",
        answer: "We offer a 30-day money-back guarantee",
        status: "active",
        keywords: ["refund", "policy", "money"],
        category: "Billing",
        priority: 5
      },
      {
        question: "How do I reset my password?",
        answer: "Click on Forgot Password on the login page",
        status: "active",
        keywords: ["password", "reset", "login"],
        category: "Account",
        priority: 3
      }
    ];

    const blob = new Blob([JSON.stringify(jsonContent, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'faq-template.json';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Bulk Import FAQs</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Import Mode Selector */}
          <div className="flex gap-4 border-b border-gray-200 pb-4">
            <button
              onClick={() => setImportMode('file')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                importMode === 'file'
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <FileText className="inline mr-2" size={16} />
              Upload File
            </button>
            <button
              onClick={() => setImportMode('json')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                importMode === 'json'
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Paste JSON
            </button>
          </div>

          {/* Info Alert */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="text-blue-600 mt-0.5 flex-shrink-0" size={20} />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Supported Formats:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>CSV: question, answer, status, keywords (pipe-separated), category, priority</li>
                <li>JSON: Array of FAQ objects with the same fields</li>
              </ul>
            </div>
          </div>

          {/* Template Download */}
          <div className="flex gap-3">
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Download size={16} />
              Download CSV Template
            </button>
            <button
              onClick={downloadJsonTemplate}
              className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Download size={16} />
              Download JSON Template
            </button>
          </div>

          {/* File Upload Mode */}
          {importMode === 'file' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select File (CSV or JSON)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="mx-auto text-gray-400 mb-4" size={48} />
                <input
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                >
                  Choose a file
                </label>
                <p className="text-sm text-gray-500 mt-2">or drag and drop</p>
                {file && (
                  <p className="text-sm text-gray-700 mt-4 font-medium">
                    Selected: {file.name}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* JSON Input Mode */}
          {importMode === 'json' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paste JSON Data
              </label>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='[{"question":"...","answer":"...","status":"active","keywords":[],"category":"","priority":0}]'
                rows={12}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={importMode === 'file' ? handleFileImport : handleJsonImport}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              disabled={loading || (importMode === 'file' && !file) || (importMode === 'json' && !jsonInput.trim())}
            >
              {loading && <Loader size={16} className="animate-spin" />}
              Import FAQs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
