import React, { useState, useEffect } from 'react';
import { X, Loader, Plus, Trash2, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

interface AddFAQModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  faqToEdit?: FAQ | null;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  status: string;
  keywords: string[];
  category: string | null;
  priority: number;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export const AddFAQModal: React.FC<AddFAQModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  faqToEdit,
}) => {
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState(0);

  useEffect(() => {
    if (faqToEdit) {
      setQuestion(faqToEdit.question);
      setAnswer(faqToEdit.answer);
      setStatus(faqToEdit.status as 'active' | 'inactive');
      setKeywords(faqToEdit.keywords || []);
      setCategory(faqToEdit.category || '');
      setPriority(faqToEdit.priority || 0);
    } else {
      resetForm();
    }
  }, [faqToEdit, isOpen]);

  const resetForm = () => {
    setQuestion('');
    setAnswer('');
    setStatus('active');
    setKeywords([]);
    setKeywordInput('');
    setCategory('');
    setPriority(0);
  };

  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim() || !answer.trim()) {
      toast.error('Question and answer are required');
      return;
    }

    setLoading(true);

    try {
      const endpoint = faqToEdit ? `/api/faq/${faqToEdit.id}` : '/api/faq';
      const method = faqToEdit ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question.trim(),
          answer: answer.trim(),
          status,
          keywords,
          category: category.trim() || null,
          priority,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        resetForm();
        onSuccess();
        onClose();
      } else {
        toast.error(result.error || 'Failed to save FAQ');
      }
    } catch (error) {
      console.error('Error saving FAQ:', error);
      toast.error('Failed to save FAQ');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {faqToEdit ? 'Edit FAQ' : 'Add New FAQ'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Question */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Enter the question"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Answer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Answer <span className="text-red-500">*</span>
            </label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Enter the answer"
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              required
            />
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Keywords
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={handleKeywordKeyDown}
                placeholder="Add keywords for better matching"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleAddKeyword}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                Add
              </button>
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    <Tag size={14} />
                    {keyword}
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(keyword)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Category and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., General, Billing, Technical"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                placeholder="0"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Higher priority shows first</p>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="active"
                  checked={status === 'active'}
                  onChange={(e) => setStatus(e.target.value as 'active')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="inactive"
                  checked={status === 'inactive'}
                  onChange={(e) => setStatus(e.target.value as 'inactive')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Inactive</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              disabled={loading}
            >
              {loading && <Loader size={16} className="animate-spin" />}
              {faqToEdit ? 'Update FAQ' : 'Create FAQ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
