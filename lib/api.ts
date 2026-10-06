// API utility functions for frontend
import toast from 'react-hot-toast';
import { fetchWithAuth } from './api-client';

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
    showToast: boolean = false,
    successMessage?: string
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetchWithAuth(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.error || 'API request failed';
        if (showToast) {
          toast.error(errorMessage);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (showToast && successMessage) {
        toast.success(successMessage);
      }

      return data;
    } catch (error: any) {
      if (showToast && !error.message.includes('API request failed')) {
        toast.error(error.message || 'Network error occurred');
      }
      throw error;
    }
  }

  // Collection Types
  async getCollectionTypes() {
    return this.request('/collection-types');
  }

  async getCollectionType(name: string) {
    return this.request(`/collection-types/${name}`);
  }

  async createCollectionType(data: any) {
    return this.request(
      '/collection-types',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      true,
      `Collection "${data.displayName}" created successfully!`
    );
  }

  async updateCollectionType(name: string, data: any) {
    return this.request(
      `/collection-types/${name}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
      true,
      `Collection "${data.displayName}" updated successfully!`
    );
  }

  async deleteCollectionType(name: string) {
    return this.request(
      `/collection-types/${name}`,
      {
        method: 'DELETE',
      },
      true,
      'Collection deleted successfully!'
    );
  }

  // Collection Entries
  async getCollectionEntries(collectionName: string) {
    return this.request(`/collections/${collectionName}`);
  }

  async getCollectionEntry(collectionName: string, id: string) {
    return this.request(`/collections/${collectionName}/${id}`);
  }

  async createCollectionEntry(collectionName: string, data: any) {
    return this.request(
      `/collections/${collectionName}`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      true,
      'Entry created successfully!'
    );
  }

  async updateCollectionEntry(
    collectionName: string,
    id: string,
    data: any
  ) {
    return this.request(
      `/collections/${collectionName}/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
      true,
      'Entry updated successfully!'
    );
  }

  async deleteCollectionEntry(collectionName: string, id: string) {
    return this.request(
      `/collections/${collectionName}/${id}`,
      {
        method: 'DELETE',
      },
      true,
      'Entry deleted successfully!'
    );
  }

  // Single Types
  async getSingleTypes() {
    return this.request('/single-types');
  }

  async getSingleType(name: string) {
    return this.request(`/single-types/${name}`);
  }

  async createSingleType(data: any) {
    return this.request(
      '/single-types',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      true,
      `Single type "${data.displayName}" created successfully!`
    );
  }

  async updateSingleType(name: string, data: any) {
    return this.request(
      `/single-types/${name}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
      true,
      'Single type updated successfully!'
    );
  }

  async deleteSingleType(name: string) {
    return this.request(
      `/single-types/${name}`,
      {
        method: 'DELETE',
      },
      true,
      'Single type deleted successfully!'
    );
  }

  // Components
  async getComponents() {
    return this.request('/components');
  }

  async getComponent(name: string) {
    return this.request(`/components/${name}`);
  }

  async createComponent(data: any) {
    return this.request(
      '/components',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      true,
      `Component "${data.displayName}" created successfully!`
    );
  }

  async updateComponent(name: string, data: any) {
    return this.request(
      `/components/${name}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
      true,
      'Component updated successfully!'
    );
  }

  async deleteComponent(name: string) {
    return this.request(
      `/components/${name}`,
      {
        method: 'DELETE',
      },
      true,
      'Component deleted successfully!'
    );
  }

  // Media
  async deleteMedia(id: string) {
    return this.request(
      `/media/${id}`,
      {
        method: 'DELETE',
      },
      true,
      'Media deleted successfully!'
    );
  }

  async updateMedia(id: string, data: any) {
    return this.request(
      `/media/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
      true,
      'Media updated successfully!'
    );
  }
}

// Export singleton instance
export const api = new ApiClient();
