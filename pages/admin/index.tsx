import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/admin/Layout';
import { DashboardSkeleton } from '@/components/admin/DashboardSkeleton';
import { useAuth } from '@/hooks/useAuth';
import {
  Database,
  FileText,
  Component,
  Users,
  Shield,
  Image as ImageIcon,
  HardDrive,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { format } from 'date-fns';

interface DashboardStats {
  overview: {
    collections: number;
    singles: number;
    components: number;
    users: number;
    roles: number;
    media: number;
    storageUsedMB: number;
  };
  growth: {
    users: number;
    media: number;
  };
  recentUsers: Array<{
    id: string;
    name: string;
    email: string;
    createdAt: string;
    role: { name: string } | null;
  }>;
  recentMedia: Array<{
    id: string;
    name: string;
    url: string;
    mime: string;
    size: number;
    createdAt: string;
  }>;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

type Tone = 'blue' | 'violet' | 'emerald' | 'amber' | 'rose' | 'sky' | 'orange';

const TONES: Record<Tone, { card: string; icon: string }> = {
  blue: { card: 'bg-blue-100/70 border-blue-200', icon: 'bg-white text-blue-600 shadow-sm' },
  violet: { card: 'bg-violet-100/70 border-violet-200', icon: 'bg-white text-violet-600 shadow-sm' },
  emerald: { card: 'bg-emerald-100/70 border-emerald-200', icon: 'bg-white text-emerald-600 shadow-sm' },
  amber: { card: 'bg-amber-100/70 border-amber-200', icon: 'bg-white text-amber-600 shadow-sm' },
  rose: { card: 'bg-rose-100/70 border-rose-200', icon: 'bg-white text-rose-600 shadow-sm' },
  sky: { card: 'bg-sky-100/70 border-sky-200', icon: 'bg-white text-sky-600 shadow-sm' },
  orange: { card: 'bg-orange-100/70 border-orange-200', icon: 'bg-white text-orange-600 shadow-sm' },
};

interface StatProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  tone: Tone;
  growth?: number;
}

const Stat = ({ label, value, icon: Icon, tone, growth }: StatProps) => (
  <div className={`rounded-xl border p-5 ${TONES[tone].card}`}>
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${TONES[tone].icon}`}>
        <Icon size={16} />
      </span>
    </div>
    <div className="flex items-end justify-between">
      <span className="text-2xl font-semibold text-gray-900">{value}</span>
      {growth !== undefined && (
        <span
          className={`inline-flex items-center text-xs font-medium ${
            growth >= 0 ? 'text-green-600' : 'text-red-600'
          }`}
          title="vs previous 30 days"
        >
          {growth >= 0 ? (
            <TrendingUp size={14} className="mr-1" />
          ) : (
            <TrendingDown size={14} className="mr-1" />
          )}
          {growth > 0 ? '+' : ''}
          {growth}%
        </span>
      )}
    </div>
  </div>
);

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/dashboard/stats');
        const result = await response.json();
        if (result.success) {
          setStats(result.data);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <Layout>
        <DashboardSkeleton />
      </Layout>
    );
  }

  if (!stats) {
    return (
      <Layout>
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Failed to load dashboard statistics</p>
          </div>
        </div>
      </Layout>
    );
  }

  const firstName = user?.name?.trim().split(' ')[0] || 'there';

  return (
    <Layout>
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-gray-900">
              {getGreeting()}, {firstName}
            </h1>
            <p className="text-gray-500 mt-1">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <Stat label="Collection Types" value={stats.overview.collections} icon={Database} tone="blue" />
            <Stat label="Single Types" value={stats.overview.singles} icon={FileText} tone="violet" />
            <Stat label="Components" value={stats.overview.components} icon={Component} tone="sky" />
            <Stat label="Roles" value={stats.overview.roles} icon={Shield} tone="rose" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Stat
              label="Users"
              value={stats.overview.users}
              icon={Users}
              tone="emerald"
              growth={stats.growth.users}
            />
            <Stat
              label="Media Files"
              value={stats.overview.media}
              icon={ImageIcon}
              tone="amber"
              growth={stats.growth.media}
            />
            <Stat
              label="Storage Used"
              value={`${stats.overview.storageUsedMB} MB`}
              icon={HardDrive}
              tone="orange"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-base font-semibold text-gray-900 mb-4">New users this week</h3>
              {stats.recentUsers.length > 0 ? (
                <ul className="divide-y divide-gray-100">
                  {stats.recentUsers.map((u) => (
                    <li key={u.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-9 h-9 shrink-0 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
                          <p className="text-xs text-gray-500 truncate">{u.email}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        {u.role && (
                          <span className="inline-block px-2 py-0.5 text-xs bg-violet-100 text-violet-700 rounded">
                            {u.role.name}
                          </span>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {format(new Date(u.createdAt), 'MMM d')}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400 py-6 text-center">No new users this week</p>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Latest uploads</h3>
              {stats.recentMedia.length > 0 ? (
                <ul className="divide-y divide-gray-100">
                  {stats.recentMedia.slice(0, 5).map((m) => (
                    <li key={m.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-9 h-9 shrink-0 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                          {m.mime.startsWith('image/') ? (
                            <img src={m.url} alt={m.name} className="w-full h-full object-cover" />
                          ) : (
                            <FileText size={16} className="text-gray-400" />
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 ml-3">
                        {format(new Date(m.createdAt), 'MMM d')}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400 py-6 text-center">No media uploaded yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
