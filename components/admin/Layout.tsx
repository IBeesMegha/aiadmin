import React, { ReactNode, useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ProtectedRoute } from './auth/ProtectedRoute';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [collectionTypes, setCollectionTypes] = useState([]);
  const [singleTypes, setSingleTypes] = useState([]);
  const [components, setComponents] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchContentTypes();
  }, []);

  const fetchContentTypes = async () => {
    try {
      const [collectionsRes, singlesRes, componentsRes] = await Promise.all([
        fetch('/api/collection-types', { credentials: 'include' }),
        fetch('/api/single-types', { credentials: 'include' }),
        fetch('/api/components', { credentials: 'include' }),
      ]);

      const collections = await collectionsRes.json();
      const singles = await singlesRes.json();
      const comps = await componentsRes.json();

      setCollectionTypes(collections.data || []);
      setSingleTypes(singles.data || []);
      setComponents(comps.data || []);
    } catch (error) {
      console.error('Error fetching content types:', error);
    }
  };

  if (!mounted) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen" style={{ backgroundColor: 'var(--background-color)' }}>
          <div className="w-64" style={{ backgroundColor: 'var(--sidebar-background-color)' }}></div>
          <div className="flex-1 flex flex-col overflow-hidden">
            <div style={{ backgroundColor: 'var(--header-background-color)', borderBottom: '1px solid var(--border-color)' }} className="h-16"></div>
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen" style={{ backgroundColor: 'var(--background-color)' }}>
        <Sidebar
          collectionTypes={collectionTypes}
          singleTypes={singleTypes}
          components={components}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
};
