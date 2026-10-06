import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Layout } from '@/components/admin/Layout';
import { ProtectedRoute } from '@/components/admin/auth/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, ThemeSettings } from '@/context/ThemeContext';
import toast from 'react-hot-toast';
import {
  Save, RotateCcw, Download, Upload, Eye, Image as ImageIcon,
  Type, Layout as LayoutIcon, Palette, LogIn, Code,
  ChevronDown, ChevronRight, X, Menu, Search,
} from 'lucide-react';

const COLOR_FIELDS = [
  { key: 'primaryColor', label: 'Primary Color', default: '#2563eb' },
  { key: 'secondaryColor', label: 'Secondary Color', default: '#0f172a' },
  { key: 'accentColor', label: 'Accent Color', default: '#14b8a6' },
  { key: 'successColor', label: 'Success Color', default: '#10b981' },
  { key: 'warningColor', label: 'Warning Color', default: '#f59e0b' },
  { key: 'errorColor', label: 'Error Color', default: '#ef4444' },
  { key: 'backgroundColor', label: 'Background Color', default: '#f3f4f6' },
  { key: 'cardBackgroundColor', label: 'Card Background Color', default: '#ffffff' },
  { key: 'sidebarBackgroundColor', label: 'Sidebar Background Color', default: '#111827' },
  { key: 'headerBackgroundColor', label: 'Header Background Color', default: '#ffffff' },
  { key: 'textColor', label: 'Text Color', default: '#111827' },
  { key: 'borderColor', label: 'Border Color', default: '#e5e7eb' },
];

const FONT_OPTIONS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins',
  'Montserrat', 'Nunito', 'Playfair Display', 'Merriweather',
  'Source Sans Pro', 'System UI', 'Arial', 'Helvetica', 'Georgia',
];

const FONT_SCALE_OPTIONS = ['0.75rem', '0.875rem', '1rem', '1.125rem', '1.25rem'];

const FONT_WEIGHT_OPTIONS = ['300', '400', '500', '600', '700', '800'];

const SIDEBAR_WIDTH_OPTIONS = ['14rem', '16rem', '18rem', '20rem', '22rem'];

const RADIUS_OPTIONS = [
  { value: '0', label: 'None' },
  { value: '0.25rem', label: 'Small' },
  { value: '0.375rem', label: 'Default' },
  { value: '0.5rem', label: 'Medium' },
  { value: '0.75rem', label: 'Large' },
  { value: '1rem', label: 'X-Large' },
  { value: '9999px', label: 'Full' },
];

const TABLE_STYLE_OPTIONS = ['bordered', 'striped', 'minimal', 'clean'];

type SectionKey = 'logos' | 'colors' | 'typography' | 'layout' | 'login' | 'customCss' | 'preview';

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div
          className="w-10 h-10 rounded-lg border-2 border-gray-200 shadow-sm"
          style={{ backgroundColor: value }}
        />
      </div>
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
        />
      </div>
    </div>
  );
}

function ImageUpload({
  label, currentUrl, onUpload, onRemove,
}: {
  label: string;
  currentUrl: string | null;
  onUpload: (url: string) => void;
  onRemove: () => void;
}) {
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { setPreview(currentUrl); }, [currentUrl]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await fetch('/api/theme-settings/upload', { method: 'POST', body: formData });
      const result = await res.json();
      if (result.success) {
        setPreview(result.data.url);
        onUpload(result.data.url);
        toast.success(`${label} uploaded`);
      } else {
        toast.error(result.error || 'Upload failed');
      }
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex items-start gap-4">
        {preview ? (
          <div className="relative w-32 h-20 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 flex-shrink-0">
            <img src={preview} alt={label} className="w-full h-full object-contain" />
            <button
              onClick={() => { setPreview(null); onRemove(); }}
              className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full hover:bg-red-600"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <div className="w-32 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 flex-shrink-0">
            <ImageIcon size={24} className="text-gray-400" />
          </div>
        )}
        <div className="flex-1">
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Choose File'}
          </button>
          <p className="mt-1 text-xs text-gray-500">PNG, JPG, SVG, WEBP. Max 5MB.</p>
        </div>
      </div>
    </div>
  );
}

function LivePreview({ theme, compactMode }: { theme: Partial<ThemeSettings>; compactMode: boolean }) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center gap-2">
        <Eye size={16} className="text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Live Preview</span>
      </div>

      <div className="flex" style={{ minHeight: '400px' }}>
        <div
          style={{
            width: theme.sidebarWidth || '16rem',
            backgroundColor: theme.sidebarBackgroundColor || '#111827',
            padding: '16px',
            flexShrink: 0,
          }}
        >
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: theme.primaryColor || '#2563eb' }} />
            <span className="font-bold text-white text-sm">CMS Admin</span>
          </div>
          {[
            { icon: 'H', label: 'Dashboard' },
            { icon: 'I', label: 'Media Library' },
            { icon: 'D', label: 'Content' },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2 px-3 py-2 rounded-lg mb-1 text-gray-300 text-sm"
              style={item.label === 'Dashboard' ? { backgroundColor: theme.primaryColor || '#2563eb', color: '#fff' } : {}}
            >
              <span className="w-4 text-center text-xs">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
          <div className="mt-6 pt-4 border-t border-gray-700">
            <span className="text-xs text-gray-500 uppercase font-semibold">Settings</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div
            style={{
              backgroundColor: theme.headerBackgroundColor || '#ffffff',
              borderBottom: `1px solid ${theme.borderColor || '#e5e7eb'}`,
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div className="flex items-center gap-3">
              <Menu size={18} style={{ color: theme.textColor || '#111827' }} />
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  readOnly
                  className="pl-9 pr-4 py-1.5 text-sm border rounded-lg bg-gray-50"
                  style={{ borderColor: theme.borderColor || '#e5e7eb' }}
                  placeholder="Search..."
                />
              </div>
            </div>
            <div className="w-8 h-8 rounded-full" style={{ backgroundColor: theme.primaryColor || '#2563eb' }} />
          </div>

          <div
            className="flex-1 p-6"
            style={{ backgroundColor: theme.backgroundColor || '#f3f4f6' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-xl font-bold"
                style={{ color: theme.textColor || '#111827', fontWeight: Number(theme.headingWeight) || 700 }}
              >
                Dashboard
              </h2>
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 text-sm text-white rounded-lg"
                  style={{
                    backgroundColor: theme.primaryColor || '#2563eb',
                    borderRadius: theme.buttonRadius || '0.375rem',
                  }}
                >
                  Primary
                </button>
                <button
                  className="px-4 py-2 text-sm rounded-lg border"
                  style={{
                    borderColor: theme.borderColor || '#e5e7eb',
                    color: theme.textColor || '#111827',
                    borderRadius: theme.buttonRadius || '0.375rem',
                  }}
                >
                  Secondary
                </button>
              </div>
            </div>

            <div
              className="p-4 mb-4"
              style={{
                backgroundColor: theme.cardBackgroundColor || '#ffffff',
                borderRadius: theme.cardRadius || '0.5rem',
                border: `1px solid ${theme.borderColor || '#e5e7eb'}`,
              }}
            >
              <h3
                className="font-semibold mb-3"
                style={{ color: theme.textColor || '#111827', fontWeight: Number(theme.headingWeight) || 700 }}
              >
                Card Title
              </h3>
              <p className="text-sm mb-4" style={{ color: theme.textColor || '#111827', fontWeight: Number(theme.bodyWeight) || 400 }}>
                This is a preview card showing how your theme settings affect the appearance of cards across the application.
              </p>
              <div className="flex gap-2">
                <span
                  className="px-2.5 py-0.5 text-xs font-medium rounded-full"
                  style={{ backgroundColor: theme.successColor || '#10b981', color: '#fff' }}
                >
                  Active
                </span>
                <span
                  className="px-2.5 py-0.5 text-xs font-medium rounded-full"
                  style={{ backgroundColor: theme.warningColor || '#f59e0b', color: '#fff' }}
                >
                  Pending
                </span>
                <span
                  className="px-2.5 py-0.5 text-xs font-medium rounded-full"
                  style={{ backgroundColor: theme.errorColor || '#ef4444', color: '#fff' }}
                >
                  Error
                </span>
              </div>
            </div>

            <div
              className="overflow-hidden"
              style={{
                backgroundColor: theme.cardBackgroundColor || '#ffffff',
                borderRadius: theme.cardRadius || '0.5rem',
                border: `1px solid ${theme.borderColor || '#e5e7eb'}`,
              }}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: theme.headerBackgroundColor || '#ffffff' }}>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: theme.textColor || '#111827', borderBottom: `1px solid ${theme.borderColor || '#e5e7eb'}` }}>Name</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: theme.textColor || '#111827', borderBottom: `1px solid ${theme.borderColor || '#e5e7eb'}` }}>Status</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: theme.textColor || '#111827', borderBottom: `1px solid ${theme.borderColor || '#e5e7eb'}` }}>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'John Doe', status: 'Active', role: 'Admin' },
                    { name: 'Jane Smith', status: 'Active', role: 'Editor' },
                    { name: 'Bob Johnson', status: 'Inactive', role: 'Viewer' },
                  ].map((row, i) => (
                    <tr key={i} className={compactMode ? '' : ''}>
                      <td className="px-4 py-2" style={{ color: theme.textColor || '#111827', borderBottom: `1px solid ${theme.borderColor || '#e5e7eb'}`, fontWeight: Number(theme.bodyWeight) || 400 }}>{row.name}</td>
                      <td className="px-4 py-2" style={{ borderBottom: `1px solid ${theme.borderColor || '#e5e7eb'}` }}>
                        <span
                          className="px-2 py-0.5 text-xs rounded-full"
                          style={{
                            backgroundColor: row.status === 'Active' ? theme.successColor || '#10b981' : theme.warningColor || '#f59e0b',
                            color: '#fff',
                          }}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-2" style={{ color: theme.textColor || '#111827', borderBottom: `1px solid ${theme.borderColor || '#e5e7eb'}`, fontWeight: Number(theme.bodyWeight) || 400 }}>{row.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex gap-2">
              <input
                readOnly
                className="flex-1 px-3 py-2 text-sm border rounded-lg"
                style={{
                  borderColor: theme.borderColor || '#e5e7eb',
                  borderRadius: theme.buttonRadius || '0.375rem',
                  backgroundColor: theme.cardBackgroundColor || '#ffffff',
                  color: theme.textColor || '#111827',
                }}
                placeholder="Form input preview..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ThemeSettingsPage() {
  const router = useRouter();
  const { loading: authLoading } = useAuth();
  const { theme, loading: themeLoading, updateTheme, resetTheme, exportTheme, importTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>('logos');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<Partial<ThemeSettings>>({});

  useEffect(() => {
    if (theme) {
      setForm({ ...theme });
    }
  }, [theme]);

  // Theme Settings is accessible to all users - no permission check

  const updateField = useCallback((key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    updateTheme({ [key]: value });
  }, [updateTheme]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateTheme(form);
      toast.success('Theme settings saved');
    } catch {
      toast.error('Failed to save theme settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all theme settings to default?')) return;
    await resetTheme();
    toast.success('Theme reset to default');
  };

  const handleExport = async () => {
    await exportTheme();
    toast.success('Theme exported');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await importTheme(text);
      toast.success('Theme imported successfully');
    } catch {
      toast.error('Invalid theme file');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sections: { key: SectionKey; label: string; icon: React.ReactNode }[] = [
    { key: 'logos', label: 'Logo Management', icon: <ImageIcon size={18} /> },
    { key: 'colors', label: 'Colors', icon: <Palette size={18} /> },
    { key: 'typography', label: 'Typography', icon: <Type size={18} /> },
    { key: 'layout', label: 'Layout', icon: <LayoutIcon size={18} /> },
    { key: 'login', label: 'Login Page', icon: <LogIn size={18} /> },
    { key: 'customCss', label: 'Custom CSS', icon: <Code size={18} /> },
    { key: 'preview', label: 'Live Preview', icon: <Eye size={18} /> },
  ];

  if (authLoading || themeLoading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="flex h-full">
          <div className="w-64 border-r border-gray-200 bg-white flex-shrink-0 overflow-y-auto">
            <div className="p-4">
              <h1 className="text-lg font-bold text-gray-900">Theme Settings</h1>
              <p className="text-xs text-gray-500 mt-1">Customize your admin panel</p>
            </div>
            <nav className="px-2 space-y-1">
              {sections.map((sec) => (
                <button
                  key={sec.key}
                  onClick={() => setActiveSection(sec.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition ${
                    activeSection === sec.key
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {sec.icon}
                  <span>{sec.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto p-6">
              {/* Logo Management */}
              {activeSection === 'logos' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Logo Management</h2>
                  <p className="text-gray-500 text-sm mb-6">Upload and manage your brand logos</p>
                  <div className="space-y-6">
                    <ImageUpload
                      label="Primary Logo"
                      currentUrl={form.primaryLogo || null}
                      onUpload={(url) => updateField('primaryLogo', url)}
                      onRemove={() => updateField('primaryLogo', null)}
                    />
                    <ImageUpload
                      label="Dark Mode Logo"
                      currentUrl={form.darkLogo || null}
                      onUpload={(url) => updateField('darkLogo', url)}
                      onRemove={() => updateField('darkLogo', null)}
                    />
                    <ImageUpload
                      label="Favicon"
                      currentUrl={form.favicon || null}
                      onUpload={(url) => updateField('favicon', url)}
                      onRemove={() => updateField('favicon', null)}
                    />
                    <ImageUpload
                      label="Login Page Logo"
                      currentUrl={form.loginLogo || null}
                      onUpload={(url) => updateField('loginLogo', url)}
                      onRemove={() => updateField('loginLogo', null)}
                    />
                    <ImageUpload
                      label="Login Background Image"
                      currentUrl={form.loginBackground || null}
                      onUpload={(url) => updateField('loginBackground', url)}
                      onRemove={() => updateField('loginBackground', null)}
                    />
                  </div>
                </div>
              )}

              {/* Colors */}
              {activeSection === 'colors' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Color Management</h2>
                  <p className="text-gray-500 text-sm mb-6">Customize the color scheme of your admin panel</p>
                  <div className="grid grid-cols-2 gap-4">
                    {COLOR_FIELDS.map((field) => (
                      <ColorPicker
                        key={field.key}
                        label={field.label}
                        value={(form as any)[field.key] || field.default}
                        onChange={(v) => updateField(field.key, v)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Typography */}
              {activeSection === 'typography' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Typography Settings</h2>
                  <p className="text-gray-500 text-sm mb-6">Configure fonts and text appearance</p>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Font Family</label>
                      <select
                        value={form.fontFamily || 'Inter'}
                        onChange={(e) => updateField('fontFamily', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        style={{ fontFamily: form.fontFamily || 'Inter' }}
                      >
                        {FONT_OPTIONS.map((f) => (
                          <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Font Size Scale (Base)</label>
                      <select
                        value={form.fontScale || '1rem'}
                        onChange={(e) => updateField('fontScale', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {FONT_SCALE_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Heading Font Weight</label>
                        <select
                          value={form.headingWeight || '700'}
                          onChange={(e) => updateField('headingWeight', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {FONT_WEIGHT_OPTIONS.map((w) => (
                            <option key={w} value={w} style={{ fontWeight: Number(w) }}>{w}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Body Font Weight</label>
                        <select
                          value={form.bodyWeight || '400'}
                          onChange={(e) => updateField('bodyWeight', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {FONT_WEIGHT_OPTIONS.map((w) => (
                            <option key={w} value={w} style={{ fontWeight: Number(w) }}>{w}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Layout */}
              {activeSection === 'layout' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Layout Settings</h2>
                  <p className="text-gray-500 text-sm mb-6">Control the layout and spacing of your admin panel</p>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sidebar Width</label>
                      <select
                        value={form.sidebarWidth || '16rem'}
                        onChange={(e) => updateField('sidebarWidth', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {SIDEBAR_WIDTH_OPTIONS.map((w) => (
                          <option key={w} value={w}>{w}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Border Radius</label>
                        <select
                          value={form.borderRadius || '0.5rem'}
                          onChange={(e) => updateField('borderRadius', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {RADIUS_OPTIONS.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Button Radius</label>
                        <select
                          value={form.buttonRadius || '0.375rem'}
                          onChange={(e) => updateField('buttonRadius', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {RADIUS_OPTIONS.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Card Radius</label>
                        <select
                          value={form.cardRadius || '0.5rem'}
                          onChange={(e) => updateField('cardRadius', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {RADIUS_OPTIONS.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Table Style</label>
                      <select
                        value="bordered"
                        onChange={() => {}}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {TABLE_STYLE_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium text-gray-900">Compact Mode</span>
                        <p className="text-sm text-gray-500">Reduce padding and spacing for a denser layout</p>
                      </div>
                      <button
                        onClick={() => updateField('compactMode', !form.compactMode)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          form.compactMode ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            form.compactMode ? 'translate-x-6' : ''
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Login Page Branding */}
              {activeSection === 'login' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Login Page Branding</h2>
                  <p className="text-gray-500 text-sm mb-6">Customize the look of your login page</p>
                  <div className="space-y-6">
                    <ImageUpload
                      label="Login Logo"
                      currentUrl={form.loginLogo || null}
                      onUpload={(url) => updateField('loginLogo', url)}
                      onRemove={() => updateField('loginLogo', null)}
                    />
                    <ImageUpload
                      label="Login Background Image"
                      currentUrl={form.loginBackground || null}
                      onUpload={(url) => updateField('loginBackground', url)}
                      onRemove={() => updateField('loginBackground', null)}
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Login Title</label>
                      <input
                        type="text"
                        value={form.loginTitle || ''}
                        onChange={(e) => updateField('loginTitle', e.target.value)}
                        placeholder="CMS Admin Panel"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Login Subtitle</label>
                      <input
                        type="text"
                        value={form.loginSubtitle || ''}
                        onChange={(e) => updateField('loginSubtitle', e.target.value)}
                        placeholder="Sign in to access your dashboard"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Custom CSS */}
              {activeSection === 'customCss' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Custom CSS</h2>
                  <p className="text-gray-500 text-sm mb-6">Add custom styles to override the default appearance</p>
                  <textarea
                    value={form.customCss || ''}
                    onChange={(e) => updateField('customCss', e.target.value)}
                    placeholder="/* Add your custom CSS here */
.example-class {
  color: var(--primary-color);
}"
                    className="w-full h-96 px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                    spellCheck={false}
                  />
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                    <Code size={14} />
                    <span>Uses standard CSS syntax. Use CSS variables like <code className="px-1 bg-gray-100 rounded text-xs">var(--primary-color)</code> for dynamic values.</span>
                  </div>
                </div>
              )}

              {/* Live Preview */}
              {activeSection === 'preview' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Live Preview</h2>
                  <p className="text-gray-500 text-sm mb-6">See your changes in real-time</p>
                  <LivePreview theme={form} compactMode={form.compactMode || false} />
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    <Save size={18} />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-2.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition"
                  >
                    <RotateCcw size={18} />
                    Reset to Default
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    <Download size={18} />
                    Export Theme
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    <Upload size={18} />
                    Import Theme
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
