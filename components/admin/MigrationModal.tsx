import React from 'react';
import { Loader2 } from 'lucide-react';

interface MigrationModalProps {
  isOpen: boolean;
  status: 'migrating' | 'success' | 'error';
  message?: string;
  error?: string;
  onClose?: () => void; // Optional close handler
}

export const MigrationModal: React.FC<MigrationModalProps> = ({
  isOpen,
  status,
  message,
  error,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        {status === 'migrating' && (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Loader2 className="animate-spin text-blue-600" size={48} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Updating Database Schema
            </h2>
            <p className="text-gray-600 mb-4">
              {message || 'Creating table and running migration...'}
            </p>
            <p className="text-sm text-gray-500">
              Please wait, this may take a few moments.
            </p>
            <div className="mt-6">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
              </div>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Schema Updated Successfully!
            </h2>
            <p className="text-gray-600 mb-4">
              {message || 'Database schema has been updated successfully.'}
            </p>
            
            {/* Restart Instructions */}
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-yellow-800 mb-2">
                    ⚠️ Restart Required
                  </p>
                  <p className="text-xs text-yellow-700 mb-3">
                    To use the updated Prisma Client with your new relations, please restart your development server:
                  </p>
                  <div className="bg-yellow-100 border border-yellow-200 rounded p-3 mb-2">
                    <p className="text-xs font-mono text-yellow-900 mb-1">
                      1. Go to your terminal
                    </p>
                    <p className="text-xs font-mono text-yellow-900 mb-1">
                      2. Press <kbd className="px-2 py-1 bg-yellow-200 rounded">Ctrl+C</kbd> to stop the server
                    </p>
                    <p className="text-xs font-mono text-yellow-900">
                      3. Run: <code className="px-2 py-1 bg-yellow-200 rounded">npm run dev</code>
                    </p>
                  </div>
                  <p className="text-xs text-yellow-600 italic">
                    This is required on Windows to avoid file locking issues with Prisma Client.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-center space-x-2 text-sm text-green-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Database updated • Relations synchronized</span>
            </div>
            
            {/* Close button */}
            {onClose && (
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Got it
              </button>
            )}
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Migration Failed
            </h2>
            <p className="text-gray-600 mb-4">
              There was an error updating the database schema.
            </p>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-800 font-mono text-left whitespace-pre-wrap">
                  {error}
                </p>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Reload Page
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
