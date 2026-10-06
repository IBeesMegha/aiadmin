import React from 'react';
import { X, Copy, Check } from 'lucide-react';

interface CollectionConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  collectionType: {
    name: string;
    displayName: string;
    description?: string;
    fields: {
      fields: Array<{
        name: string;
        type: string;
        displayName: string;
        required?: boolean;
        unique?: boolean;
        relation?: any;
      }>;
    };
  };
}

export const CollectionConfigModal: React.FC<CollectionConfigModalProps> = ({
  isOpen,
  onClose,
  collectionType,
}) => {
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  
  // Generate API routes based on folder structure
  const apiRoutes = {
    getAll: {
      method: 'GET',
      path: `/api/collections/${collectionType.name}`,
      description: 'Get all entries',
      example: `${baseUrl}/api/collections/${collectionType.name}`,
    },
    getOne: {
      method: 'GET',
      path: `/api/collections/${collectionType.name}/[id]`,
      description: 'Get single entry by ID',
      example: `${baseUrl}/api/collections/${collectionType.name}/[id]`,
    },
    create: {
      method: 'POST',
      path: `/api/collections/${collectionType.name}`,
      description: 'Create new entry',
      example: `${baseUrl}/api/collections/${collectionType.name}`,
    },
    update: {
      method: 'PUT',
      path: `/api/collections/${collectionType.name}/[id]`,
      description: 'Update entry by ID',
      example: `${baseUrl}/api/collections/${collectionType.name}/[id]`,
    },
    delete: {
      method: 'DELETE',
      path: `/api/collections/${collectionType.name}/[id]`,
      description: 'Delete entry by ID',
      example: `${baseUrl}/api/collections/${collectionType.name}/[id]`,
    },
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET':
        return 'bg-green-100 text-green-800';
      case 'POST':
        return 'bg-blue-100 text-blue-800';
      case 'PUT':
        return 'bg-yellow-100 text-yellow-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {collectionType.displayName} Configuration
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Collection: {collectionType.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Basic Information
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-start">
                <span className="text-sm font-medium text-gray-600 w-32">Name:</span>
                <span className="text-sm text-gray-900 flex-1">{collectionType.name}</span>
              </div>
              <div className="flex items-start">
                <span className="text-sm font-medium text-gray-600 w-32">Display Name:</span>
                <span className="text-sm text-gray-900 flex-1">{collectionType.displayName}</span>
              </div>
              {collectionType.description && (
                <div className="flex items-start">
                  <span className="text-sm font-medium text-gray-600 w-32">Description:</span>
                  <span className="text-sm text-gray-900 flex-1">{collectionType.description}</span>
                </div>
              )}
              <div className="flex items-start">
                <span className="text-sm font-medium text-gray-600 w-32">Fields Count:</span>
                <span className="text-sm text-gray-900 flex-1">
                  {collectionType.fields?.fields?.length || 0} fields
                </span>
              </div>
            </div>
          </div>

          {/* Fields */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Fields</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-2">
                {collectionType.fields?.fields?.map((field, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 bg-white rounded border border-gray-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{field.displayName}</span>
                        <span className="text-xs text-gray-500">({field.name})</span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                          {field.type}
                        </span>
                        {field.required && (
                          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded">
                            Required
                          </span>
                        )}
                        {field.unique && (
                          <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 rounded">
                            Unique
                          </span>
                        )}
                        {field.relation && (
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded">
                            {field.relation.type} → {field.relation.targetCollection}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* API Routes */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">API Routes</h3>
            <div className="space-y-3">
              {Object.entries(apiRoutes).map(([key, route]) => (
                <div key={key} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${getMethodColor(
                          route.method
                        )}`}
                      >
                        {route.method}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {route.description}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <code className="flex-1 text-sm bg-gray-900 text-green-400 px-3 py-2 rounded font-mono overflow-x-auto">
                      {route.example}
                    </code>
                    <button
                      onClick={() => handleCopy(route.example, key)}
                      className="p-2 hover:bg-gray-200 rounded transition flex-shrink-0"
                      title="Copy to clipboard"
                    >
                      {copiedField === key ? (
                        <Check size={18} className="text-green-600" />
                      ) : (
                        <Copy size={18} className="text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Request/Response Examples */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Request/Response Examples
            </h3>
            
            {/* POST Example */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-3">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                POST - Create Entry
              </h4>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Request Body:</p>
                  <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-x-auto">
{`{
  "data": {
${collectionType.fields?.fields
  ?.filter(f => f.type !== 'relation' || (f.relation?.type === 'manyToOne' || f.relation?.type === 'oneToOne'))
  .slice(0, 3)
  .map(f => {
    if (f.type === 'relation') {
      const sanitizedName = f.name.replace(/[-_]+(.)?/g, (_, char) => char ? char.toUpperCase() : '').replace(/^(.)/, char => char.toLowerCase());
      return `    "${sanitizedName}Id": "string"`;
    }
    return `    "${f.name}": "${f.type === 'number' ? 'number' : f.type === 'boolean' ? 'boolean' : 'string'}"`;
  })
  .join(',\n')}
  }
}`}
                  </pre>
                </div>
              </div>
            </div>

            {/* GET Example */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                GET - Response
              </h4>
              <div>
                <p className="text-xs text-gray-600 mb-1">Response Body:</p>
                <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-x-auto">
{`{
  "data": [
    {
      "id": "string",
${collectionType.fields?.fields
  ?.slice(0, 3)
  .map(f => `      "${f.name}": "${f.type === 'number' ? 'number' : f.type === 'boolean' ? 'boolean' : 'string'}"`)
  .join(',\n')},
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  ]
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
