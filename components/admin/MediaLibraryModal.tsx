import React, { useState, useEffect, useCallback } from 'react';
import NextImage from 'next/image';
import { X, Upload, Link as LinkIcon, Image as ImageIcon, Trash2, Edit, Folder, FolderPlus, ChevronRight } from 'lucide-react';
import { MediaAsset, mediaApi } from '@/lib/media';

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (media: MediaAsset | MediaAsset[]) => void;
  multiple?: boolean;
  selectedIds?: string[];
}

export const MediaLibraryModal: React.FC<MediaLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  multiple = false,
  selectedIds = [],
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [uploadTab, setUploadTab] = useState<'computer' | 'url'>('computer');
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<string[]>(selectedIds);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<string>('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  // Upload states
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [urlInput, setUrlInput] = useState('');

  // Load media when modal opens
  useEffect(() => {
    if (isOpen) {
      loadMedia();
    }
  }, [isOpen]);

  // Sync selected media with prop changes (only when explicitly changed)
  useEffect(() => {
    if (isOpen) {
      setSelectedMedia(selectedIds);
    }
  }, [isOpen]);

  const loadMedia = async () => {
    try {
      console.log('[MediaLibraryModal] Loading media...');
      setLoading(true);
      const assets = await mediaApi.getAll();
      console.log('[MediaLibraryModal] Loaded', assets.length, 'media assets');
      setMedia(assets);
    } catch (error) {
      console.error('[MediaLibraryModal] Failed to load media:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      setUploadFiles(prev => [...prev, ...files]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setUploadFiles(prev => [...prev, ...files]);
    }
  };

  const handleUpload = async () => {
    try {
      setLoading(true);
      console.log('[MediaLibraryModal] Starting upload, currentFolder:', currentFolder);
      
      if (uploadTab === 'computer' && uploadFiles.length > 0) {
        // Upload files
        const uploadedAssets: MediaAsset[] = [];
        console.log('[MediaLibraryModal] Uploading', uploadFiles.length, 'files');
        
        for (const file of uploadFiles) {
          try {
            console.log('[MediaLibraryModal] Uploading file:', file.name, 'to folder:', currentFolder);
            const formData = new FormData();
            formData.append('file', file);
            formData.append('name', file.name);
            if (currentFolder) formData.append('folder', currentFolder);
            const asset = await mediaApi.upload(formData);
            console.log('[MediaLibraryModal] File uploaded successfully:', asset);
            uploadedAssets.push(asset);
          } catch (uploadError: any) {
            console.error('[MediaLibraryModal] Error uploading file:', file.name, uploadError);
            console.error('[MediaLibraryModal] Error message:', uploadError.message);
            // Continue with other files even if one fails
          }
        }
        
        if (uploadedAssets.length === 0) {
          alert('Failed to upload any files');
          return;
        }
        
        console.log('[MediaLibraryModal] All files uploaded, clearing upload list');
        setUploadFiles([]);
        
        // Reload media library
        console.log('[MediaLibraryModal] Reloading media library');
        await loadMedia();
        
        // Switch to library tab to show uploaded files
        console.log('[MediaLibraryModal] Switching to library tab');
        setActiveTab('library');
        
        // Don't close modal immediately - let user see the uploaded files
        // They can close it manually or select files
      } else if (uploadTab === 'url' && urlInput.trim()) {
        // Upload from URL
        const fileName = urlInput.split('/').pop() || 'image';
        try {
          console.log('[MediaLibraryModal] Uploading from URL:', urlInput);
          const asset = await mediaApi.uploadUrl({
            url: urlInput,
            name: fileName,
            folder: currentFolder || undefined,
          });
          console.log('[MediaLibraryModal] URL uploaded successfully:', asset);
          setUrlInput('');
          
          // Reload media library
          await loadMedia();
          
          // Switch to library tab to show uploaded file
          setActiveTab('library');
        } catch (uploadError: any) {
          console.error('[MediaLibraryModal] Error uploading from URL:', uploadError);
          console.error('[MediaLibraryModal] Error message:', uploadError.message);
          alert('Failed to upload from URL: ' + uploadError.message);
        }
      }
    } catch (error: any) {
      console.error('[MediaLibraryModal] Upload failed:', error);
      console.error('[MediaLibraryModal] Error message:', error.message);
      alert('Failed to upload media: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMediaSelection = (id: string) => {
    if (multiple) {
      setSelectedMedia(prev =>
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
    } else {
      setSelectedMedia([id]);
    }
  };

  const handleConfirm = () => {
    const selected = media.filter(m => selectedMedia.includes(m.id));
    onSelect(multiple ? selected : selected[0]);
    onClose();
  };

  const removeUploadFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      try {
        const folderPath = currentFolder 
          ? `${currentFolder}/${newFolderName.trim()}`
          : newFolderName.trim();
        
        // Create folder via API
        const response = await fetch('/api/media/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderPath }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to create folder');
        }
        
        setCurrentFolder(folderPath);
        setNewFolderName('');
        setShowCreateFolder(false);
        
        // Reload media to refresh folder list
        await loadMedia();
      } catch (error) {
        console.error('Error creating folder:', error);
        alert('Failed to create folder');
      }
    }
  };

  // Get unique folders from media
  const folders = Array.from(new Set(
    media
      .map(m => m.folder)
      .filter(f => f) // Only folders that exist
      .filter(f => {
        // If we're at root, show all top-level folders
        if (!currentFolder) {
          return !f!.includes('/'); // Top-level folders don't have slashes
        }
        // If we're in a folder, show subfolders
        return f!.startsWith(currentFolder + '/');
      })
      .map(f => {
        if (!currentFolder) {
          return f; // At root, return the folder name as-is
        }
        // In a subfolder, extract the immediate child folder name
        const relativePath = f!.substring(currentFolder.length + 1);
        return relativePath.split('/')[0];
      })
      .filter(Boolean)
  ));

  // Filter media by current folder
  const filteredMedia = media.filter(m => {
    if (!currentFolder) {
      // At root: show only files with no folder
      return !m.folder;
    }
    // In a folder: show only files in this exact folder
    return m.folder === currentFolder;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {activeTab === 'library' ? 'Media Library' : 'Add new assets'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex px-6">
            <button
              type="button"
              onClick={() => setActiveTab('library')}
              className={`px-4 py-3 text-sm font-medium ${
                activeTab === 'library'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Media Library
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-3 text-sm font-medium ${
                activeTab === 'upload'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Upload
            </button>
          </div>
          
          {/* Breadcrumb - Always visible */}
          {currentFolder && (
            <div className="flex items-center space-x-2 px-6 py-2 bg-gray-50 text-sm text-gray-600 border-t">
              <button
                type="button"
                onClick={() => setCurrentFolder('')}
                className="hover:text-blue-600 font-medium"
              >
                Home
              </button>
              {currentFolder.split('/').map((folder, index, arr) => (
                <React.Fragment key={index}>
                  <ChevronRight size={14} />
                  <button
                    type="button"
                    onClick={() => {
                      const path = arr.slice(0, index + 1).join('/');
                      setCurrentFolder(path);
                    }}
                    className={`hover:text-blue-600 ${index === arr.length - 1 ? 'font-medium text-blue-600' : ''}`}
                  >
                    {folder}
                  </button>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'library' ? (
            // Media Library View
            <div>
              {/* Create Folder Button */}
              <div className="mb-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowCreateFolder(true)}
                  className="px-4 py-2 text-sm bg-white border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center space-x-2"
                >
                  <FolderPlus size={18} />
                  <span>Add folder</span>
                </button>
              </div>

              {/* Create Folder Input */}
              {showCreateFolder && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Folder name
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Enter folder name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateFolder();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleCreateFolder}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateFolder(false);
                        setNewFolderName('');
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="text-center py-12 text-gray-500">Loading...</div>
              ) : (
                <div>
                  {/* Folders */}
                  {folders.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Folders ({folders.length})</h3>
                      <div className="grid grid-cols-4 gap-4">
                        {folders.map((folder) => (
                          <div
                            key={folder}
                            onClick={() => {
                              const newPath = currentFolder 
                                ? `${currentFolder}/${folder}`
                                : folder || '';
                              setCurrentFolder(newPath);
                            }}
                            className="border-2 border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition"
                          >
                            <Folder size={48} className="text-blue-500 mb-2" />
                            <p className="text-sm text-gray-700 truncate font-medium">{folder}</p>
                            <p className="text-xs text-gray-400">
                              {media.filter(m => m.folder?.startsWith(currentFolder ? `${currentFolder}/${folder}` : (folder || ''))).length} assets
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assets */}
                  {filteredMedia.length === 0 && folders.length === 0 ? (
                    <div className="text-center py-12">
                      <ImageIcon size={48} className="mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">No media assets yet</p>
                      <button
                        onClick={() => setActiveTab('upload')}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Upload your first asset
                      </button>
                    </div>
                  ) : filteredMedia.length > 0 ? (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Assets ({filteredMedia.length})</h3>
                      <div className="grid grid-cols-4 gap-4">
                        {filteredMedia.map((asset) => (
                          <div
                            key={asset.id}
                            onClick={() => toggleMediaSelection(asset.id)}
                            className={`relative border-2 rounded-lg overflow-hidden cursor-pointer transition ${
                              selectedMedia.includes(asset.id)
                                ? 'border-blue-500 ring-2 ring-blue-200'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="aspect-square bg-gray-100 flex items-center justify-center relative">
                              {asset.mime.startsWith('image/') ? (
                                <NextImage
                                  src={asset.url}
                                  alt={asset.alternativeText || asset.name}
                                  fill
                                  className="object-cover"
                                  sizes="(max-width: 768px) 50vw, 25vw"
                                />
                              ) : (
                                <ImageIcon size={32} className="text-gray-400" />
                              )}
                            </div>
                            <div className="p-2 bg-white">
                              <p className="text-xs text-gray-700 truncate">{asset.name}</p>
                              <p className="text-xs text-gray-400">{asset.ext.toUpperCase()}</p>
                            </div>
                            {selectedMedia.includes(asset.id) && (
                              <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ) : (
            // Upload View
            <div>
              {/* Current Folder Display */}
              {currentFolder && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center space-x-2">
                  <Folder size={18} className="text-blue-600" />
                  <span className="text-sm text-gray-700">
                    Uploading to: <span className="font-medium">{currentFolder}</span>
                  </span>
                  <button
                    onClick={() => setCurrentFolder('')}
                    className="ml-auto text-sm text-blue-600 hover:text-blue-700"
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Add Folder Button */}
              {!showCreateFolder && (
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateFolder(true)}
                    className="px-4 py-2 text-sm bg-white border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center space-x-2"
                  >
                    <FolderPlus size={18} />
                    <span>Add folder</span>
                  </button>
                </div>
              )}

              {/* Create Folder Input */}
              {showCreateFolder && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Folder name
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Enter folder name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateFolder();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleCreateFolder}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateFolder(false);
                        setNewFolderName('');
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Upload Tabs */}
              <div className="flex space-x-4 mb-6">
                <button
                  type="button"
                  onClick={() => setUploadTab('computer')}
                  className={`px-4 py-2 text-sm font-medium ${
                    uploadTab === 'computer'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500'
                  }`}
                >
                  FROM COMPUTER
                </button>
                <button
                  type="button"
                  onClick={() => setUploadTab('url')}
                  className={`px-4 py-2 text-sm font-medium ${
                    uploadTab === 'url'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500'
                  }`}
                >
                  FROM URL
                </button>
              </div>

              {uploadTab === 'computer' ? (
                <div>
                  {/* Drag & Drop Area */}
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-12 text-center ${
                      dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                    }`}
                  >
                    <Upload size={48} className="mx-auto text-blue-600 mb-4" />
                    <p className="text-gray-700 mb-2">Drag & Drop here or</p>
                    <label className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700">
                      Browse files
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileInput}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* File Preview */}
                  {uploadFiles.length > 0 && (
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-gray-700">
                          {uploadFiles.length} asset{uploadFiles.length > 1 ? 's' : ''} ready to upload
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        {uploadFiles.map((file, index) => (
                          <div key={index} className="relative border rounded-lg p-3">
                            <button
                              onClick={() => removeUploadFile(index)}
                              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                            >
                              <X size={14} />
                            </button>
                            <div className="aspect-square bg-gray-100 rounded mb-2 flex items-center justify-center overflow-hidden">
                              {file.type.startsWith('image/') ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={URL.createObjectURL(file)}
                                  alt={file.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <ImageIcon size={32} className="text-gray-400" />
                              )}
                            </div>
                            <p className="text-xs text-gray-700 truncate">{file.name}</p>
                            <p className="text-xs text-gray-400">{file.type.split('/')[1]?.toUpperCase()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <div className="flex items-center space-x-3">
            {activeTab === 'library' && selectedMedia.length > 0 && (
              <span className="text-sm text-gray-600">
                {selectedMedia.length} selected
              </span>
            )}
            {activeTab === 'upload' ? (
              <button
                type="button"
                onClick={handleUpload}
                disabled={loading || (uploadTab === 'computer' ? uploadFiles.length === 0 : !urlInput.trim())}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Uploading...' : `Upload ${uploadTab === 'computer' ? uploadFiles.length : 1} asset${uploadFiles.length > 1 ? 's' : ''} to library`}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={selectedMedia.length === 0}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Select
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
