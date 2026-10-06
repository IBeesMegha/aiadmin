import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface ThemeSettings {
  id: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  successColor: string;
  warningColor: string;
  errorColor: string;
  backgroundColor: string;
  cardBackgroundColor: string;
  sidebarBackgroundColor: string;
  headerBackgroundColor: string;
  textColor: string;
  borderColor: string;
  primaryLogo: string | null;
  darkLogo: string | null;
  favicon: string | null;
  loginLogo: string | null;
  loginBackground: string | null;
  loginTitle: string | null;
  loginSubtitle: string | null;
  fontFamily: string;
  fontScale: string;
  headingWeight: string;
  bodyWeight: string;
  sidebarWidth: string;
  borderRadius: string;
  buttonRadius: string;
  cardRadius: string;
  compactMode: boolean;
  customCss: string | null;
}

interface ThemeContextType {
  theme: ThemeSettings | null;
  loading: boolean;
  updateTheme: (settings: Partial<ThemeSettings>) => Promise<void>;
  resetTheme: () => Promise<void>;
  exportTheme: () => Promise<void>;
  importTheme: (json: string) => Promise<void>;
}

const defaultTheme: ThemeSettings = {
  id: 'default',
  primaryColor: '#2563eb',
  secondaryColor: '#0f172a',
  accentColor: '#14b8a6',
  successColor: '#10b981',
  warningColor: '#f59e0b',
  errorColor: '#ef4444',
  backgroundColor: '#f3f4f6',
  cardBackgroundColor: '#ffffff',
  sidebarBackgroundColor: '#111827',
  headerBackgroundColor: '#ffffff',
  textColor: '#111827',
  borderColor: '#e5e7eb',
  primaryLogo: null,
  darkLogo: null,
  favicon: null,
  loginLogo: null,
  loginBackground: null,
  loginTitle: null,
  loginSubtitle: null,
  fontFamily: 'Inter',
  fontScale: '1rem',
  headingWeight: '700',
  bodyWeight: '400',
  sidebarWidth: '16rem',
  borderRadius: '0.5rem',
  buttonRadius: '0.375rem',
  cardRadius: '0.5rem',
  compactMode: false,
  customCss: null,
};

const defaultValues: ThemeContextType = {
  theme: null,
  loading: true,
  updateTheme: async () => {},
  resetTheme: async () => {},
  exportTheme: async () => {},
  importTheme: async () => {},
};

const ThemeContext = createContext<ThemeContextType>(defaultValues);

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [styleEl, setStyleEl] = useState<HTMLStyleElement | null>(null);

  useEffect(() => {
    const el = document.createElement('style');
    el.id = 'theme-custom-css';
    document.head.appendChild(el);
    setStyleEl(el);
    return () => { el.remove(); };
  }, []);

  const applyTheme = useCallback((settings: ThemeSettings) => {
    const root = document.documentElement;

    root.style.setProperty('--primary-color', settings.primaryColor);
    root.style.setProperty('--secondary-color', settings.secondaryColor);
    root.style.setProperty('--accent-color', settings.accentColor);
    root.style.setProperty('--success-color', settings.successColor);
    root.style.setProperty('--warning-color', settings.warningColor);
    root.style.setProperty('--error-color', settings.errorColor);
    root.style.setProperty('--background-color', settings.backgroundColor);
    root.style.setProperty('--card-background-color', settings.cardBackgroundColor);
    root.style.setProperty('--sidebar-background-color', settings.sidebarBackgroundColor);
    const sidebarText = isLightColor(settings.sidebarBackgroundColor) ? '#111827' : '#f3f4f6';
    root.style.setProperty('--sidebar-text-color', sidebarText);
    root.style.setProperty('--sidebar-text-muted', isLightColor(settings.sidebarBackgroundColor) ? '#4b5563' : '#9ca3af');
    root.style.setProperty('--header-background-color', settings.headerBackgroundColor);
    root.style.setProperty('--text-color', settings.textColor);
    root.style.setProperty('--border-color', settings.borderColor);
    root.style.setProperty('--font-family', settings.fontFamily);
    root.style.setProperty('--font-size-base', settings.fontScale);
    root.style.setProperty('--heading-font-weight', settings.headingWeight);
    root.style.setProperty('--body-font-weight', settings.bodyWeight);
    root.style.setProperty('--sidebar-width', settings.sidebarWidth);
    root.style.setProperty('--border-radius', settings.borderRadius);
    root.style.setProperty('--button-radius', settings.buttonRadius);
    root.style.setProperty('--card-radius', settings.cardRadius);

    root.style.fontFamily = settings.fontFamily;
    root.style.fontSize = settings.fontScale;

    if (settings.favicon) {
      let link = document.querySelector<HTMLLinkElement>('link[rel*="icon"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = settings.favicon;
    }

    if (settings.customCss && styleEl) {
      styleEl.textContent = settings.customCss;
    } else if (styleEl) {
      styleEl.textContent = '';
    }
  }, [styleEl]);

  const fetchTheme = useCallback(async () => {
    try {
      const res = await fetch('/api/theme-settings');
      const result = await res.json();
      if (result.success && result.data) {
        setTheme(result.data);
        applyTheme(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch theme settings:', err);
    } finally {
      setLoading(false);
    }
  }, [applyTheme]);

  useEffect(() => {
    fetchTheme();
  }, [fetchTheme]);

  const updateTheme = useCallback(async (settings: Partial<ThemeSettings>) => {
    try {
      const res = await fetch('/api/theme-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const result = await res.json();
      if (result.success && result.data) {
        setTheme(result.data);
        applyTheme(result.data);
      }
    } catch (err) {
      console.error('Failed to update theme settings:', err);
    }
  }, [applyTheme]);

  const resetTheme = useCallback(async () => {
    const res = await fetch('/api/theme-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(defaultTheme),
    });
    const result = await res.json();
    if (result.success && result.data) {
      setTheme(result.data);
      applyTheme(result.data);
    }
  }, [applyTheme]);

  const exportTheme = useCallback(async () => {
    if (!theme) return;
    const { id: _id, ...exportData } = theme;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'theme-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [theme]);

  const importTheme = useCallback(async (json: string) => {
    try {
      const data = JSON.parse(json);
      await updateTheme(data);
    } catch (err) {
      throw new Error('Invalid JSON file');
    }
  }, [updateTheme]);

  return (
    <ThemeContext.Provider value={{ theme, loading, updateTheme, resetTheme, exportTheme, importTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
