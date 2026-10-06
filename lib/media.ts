export interface MediaAsset {
  id: string;
  name: string;
  alternativeText?: string | null;
  caption?: string | null;
  url: string;
  mime: string;
  size: number;
  width?: number | null;
  height?: number | null;
  ext: string;
  folder?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

async function getAll(folder?: string): Promise<MediaAsset[]> {
  const params = new URLSearchParams();
  if (folder !== undefined) params.set('folder', folder);
  const query = params.toString();
  const res = await fetch(`/api/media${query ? `?${query}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch media');
  return res.json();
}

async function getById(id: string): Promise<MediaAsset> {
  const res = await fetch(`/api/media/${id}`);
  if (!res.ok) throw new Error('Failed to fetch media');
  return res.json();
}

async function upload(formData: FormData): Promise<MediaAsset> {
  const res = await fetch('/api/media', { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Failed to upload media');
  return res.json();
}

async function uploadUrl(data: { url: string; name?: string; folder?: string }): Promise<MediaAsset> {
  const formData = new FormData();
  formData.append('url', data.url);
  if (data.name) formData.append('name', data.name);
  if (data.folder) formData.append('folder', data.folder);
  const res = await fetch('/api/media', { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Failed to upload media');
  return res.json();
}

async function update(id: string, data: { name?: string; alternativeText?: string | null; caption?: string | null }): Promise<MediaAsset> {
  const res = await fetch(`/api/media/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update media');
  return res.json();
}

async function remove(id: string): Promise<void> {
  const res = await fetch(`/api/media/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete media');
}

async function getFolders(): Promise<string[]> {
  const res = await fetch('/api/media/folders');
  if (!res.ok) throw new Error('Failed to fetch folders');
  const data = await res.json();
  return data.folders || [];
}

async function createFolder(folderPath: string): Promise<void> {
  const res = await fetch('/api/media/folders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folderPath }),
  });
  if (!res.ok) throw new Error('Failed to create folder');
}

export const mediaApi = {
  getAll,
  getById,
  upload,
  uploadUrl,
  update,
  remove,
  getFolders,
  createFolder,
};
