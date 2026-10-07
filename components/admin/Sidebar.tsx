import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Database,
  FileText,
  Component as ComponentIcon,
  Settings,
  Home,
  Image as ImageIcon,
  Users,
  Shield,
  Palette,
  Key,
  ChevronDown,
  Layers,
  LayoutGrid,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface SidebarProps {
  collectionTypes: any[];
  singleTypes: any[];
  components: any[];
}

interface NavLinkProps {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  size?: 'md' | 'sm';
}

const NavLink = ({ href, label, icon: Icon, active, size = 'md' }: NavLinkProps) => (
  <Link
    href={href}
    className={`group relative flex items-center gap-3 rounded-lg transition-colors ${
      size === 'md' ? 'px-3 py-2 text-sm' : 'px-3 py-1.5 text-[13px]'
    } ${
      active
        ? 'bg-blue-50 text-blue-700 font-medium'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`}
  >
    {active && size === 'md' && (
      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r bg-blue-600" />
    )}
    <Icon
      size={size === 'md' ? 18 : 15}
      className={active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}
    />
    <span className="truncate">{label}</span>
  </Link>
);

interface GroupProps {
  label: string;
  icon: React.ElementType;
  open: boolean;
  onToggle: () => void;
  active?: boolean;
  children: React.ReactNode;
}

const Group = ({ label, icon: Icon, open, onToggle, active, children }: GroupProps) => (
  <div>
    <button
      onClick={onToggle}
      className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
        active ? 'text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <span className="flex items-center gap-3">
        <Icon size={18} className={active ? 'text-blue-600' : 'text-gray-400'} />
        {label}
      </span>
      <ChevronDown
        size={16}
        className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
      />
    </button>
    {open && (
      <div className="mt-1 ml-5 pl-3 border-l border-gray-200 space-y-0.5">{children}</div>
    )}
  </div>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
    {children}
  </p>
);

export const Sidebar: React.FC<SidebarProps> = ({
  collectionTypes,
  singleTypes,
}) => {
  const router = useRouter();
  const { hasPermission, hasAnyPermission } = useAuth();
  const [mounted, setMounted] = React.useState(false);
  const [contentManagerOpen, setContentManagerOpen] = React.useState(true);
  const [collectionTypesOpen, setCollectionTypesOpen] = React.useState(true);
  const [singleTypesOpen, setSingleTypesOpen] = React.useState(true);
  const [contentTypeBuilderOpen, setContentTypeBuilderOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  const path = router.pathname;
  const isActive = (p: string) => path === p;

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted) return;

    if (path.startsWith('/admin/collections/')) {
      setContentManagerOpen(true);
      setCollectionTypesOpen(true);
    }
    if (path.startsWith('/admin/singles/')) {
      setContentManagerOpen(true);
      setSingleTypesOpen(true);
    }
    if (path.startsWith('/admin/content-type-builder')) {
      setContentTypeBuilderOpen(true);
    }
    if (path.startsWith('/admin/settings')) {
      setSettingsOpen(true);
    }
  }, [path, mounted]);

  const canBuild = hasAnyPermission([
    'content_type_builder.read',
    'content_type_builder.create',
    'content_type_builder.update',
    'content_type_builder.delete',
  ]);

  return (
    <aside className="w-64 h-screen flex-shrink-0 flex flex-col bg-white border-r border-gray-200">
      <div className="h-16 px-5 flex items-center gap-3 border-b border-gray-100">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white shadow-sm">
          <Layers size={18} />
        </div>
        <div className="leading-tight">
          <h1 className="text-[15px] font-semibold text-gray-900">CMS Admin</h1>
          <p className="text-[11px] text-gray-400">Content workspace</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        <div>
          <SectionLabel>Overview</SectionLabel>
          <div className="space-y-0.5">
            <NavLink href="/admin" label="Dashboard" icon={Home} active={isActive('/admin')} />
            <NavLink
              href="/admin/media-library"
              label="Media Library"
              icon={ImageIcon}
              active={isActive('/admin/media-library')}
            />
          </div>
        </div>

        <div>
          <SectionLabel>Content</SectionLabel>
          <Group
            label="Content Manager"
            icon={Database}
            open={contentManagerOpen}
            onToggle={() => setContentManagerOpen(!contentManagerOpen)}
            active={path.startsWith('/admin/collections/') || path.startsWith('/admin/singles/')}
          >
            <button
              onClick={() => setCollectionTypesOpen(!collectionTypesOpen)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-600"
            >
              Collection Types
              <ChevronDown
                size={12}
                className={`transition-transform ${collectionTypesOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {collectionTypesOpen &&
              collectionTypes.map((ct) => (
                <NavLink
                  key={ct.id}
                  href={`/admin/collections/${ct.name}`}
                  label={ct.displayName}
                  icon={LayoutGrid}
                  size="sm"
                  active={router.query.name === ct.name && path.startsWith('/admin/collections/')}
                />
              ))}

            <button
              onClick={() => setSingleTypesOpen(!singleTypesOpen)}
              className="w-full flex items-center justify-between px-3 py-1.5 mt-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-600"
            >
              Single Types
              <ChevronDown
                size={12}
                className={`transition-transform ${singleTypesOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {singleTypesOpen &&
              singleTypes.map((st) => (
                <NavLink
                  key={st.id}
                  href={`/admin/singles/${st.name}`}
                  label={st.displayName}
                  icon={FileText}
                  size="sm"
                  active={router.query.name === st.name && path.startsWith('/admin/singles/')}
                />
              ))}
          </Group>
        </div>

        <div>
          <SectionLabel>Configure</SectionLabel>
          <div className="space-y-1">
            {canBuild && (
              <Group
                label="Content-Type Builder"
                icon={ComponentIcon}
                open={contentTypeBuilderOpen}
                onToggle={() => setContentTypeBuilderOpen(!contentTypeBuilderOpen)}
                active={path.startsWith('/admin/content-type-builder')}
              >
                <NavLink
                  href="/admin/content-type-builder/collection-types"
                  label="Collection Types"
                  icon={Database}
                  size="sm"
                  active={
                    path === '/admin/content-type-builder/collection-types' ||
                    path.startsWith('/admin/content-type-builder/edit/')
                  }
                />
                <NavLink
                  href="/admin/content-type-builder/single-types"
                  label="Single Types"
                  icon={FileText}
                  size="sm"
                  active={path === '/admin/content-type-builder/single-types'}
                />
                <NavLink
                  href="/admin/content-type-builder/components"
                  label="Components"
                  icon={ComponentIcon}
                  size="sm"
                  active={path === '/admin/content-type-builder/components'}
                />
              </Group>
            )}

            <Group
              label="Settings"
              icon={Settings}
              open={settingsOpen}
              onToggle={() => setSettingsOpen(!settingsOpen)}
              active={path.startsWith('/admin/settings')}
            >
              {hasPermission('users.read') && (
                <NavLink
                  href="/admin/settings/users"
                  label="Users"
                  icon={Users}
                  size="sm"
                  active={path === '/admin/settings/users'}
                />
              )}
              {hasPermission('roles.read') && (
                <NavLink
                  href="/admin/settings/roles"
                  label="Roles & Permissions"
                  icon={Shield}
                  size="sm"
                  active={path === '/admin/settings/roles'}
                />
              )}
              <NavLink
                href="/admin/settings/theme"
                label="Theme Settings"
                icon={Palette}
                size="sm"
                active={path === '/admin/settings/theme'}
              />
              <NavLink
                href="/admin/settings/api-tokens"
                label="API Tokens"
                icon={Key}
                size="sm"
                active={path.startsWith('/admin/settings/api-tokens')}
              />
            </Group>
          </div>
        </div>
      </nav>
    </aside>
  );
};
