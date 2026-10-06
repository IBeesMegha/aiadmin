import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Layout } from '@/components/admin/Layout';
import { DashboardSkeleton } from '@/components/admin/DashboardSkeleton';
import {
  Database,
  FileText,
  Component,
  Users,
  Shield,
  Image,
  TrendingUp,
  TrendingDown,
  Activity,
  HardDrive,
  Clock,
  ArrowUpRight,
  Download,
  Printer,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import {
  exportDashboardAsCSV,
  exportDashboardAsJSON,
  printDashboardReport,
} from '@/lib/dashboard-export';

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
  collectionTypes: Array<{
    id: string;
    name: string;
    displayName: string;
    entryCount: number;
  }>;
  userDistribution: Array<{
    role: string;
    count: number;
  }>;
  mediaDistribution: Array<{
    type: string;
    count: number;
  }>;
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
  activityChart: Array<{
    date: string;
    activity: number;
  }>;
}

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899'];

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

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

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    growth,
  }: {
    title: string;
    value: number | string;
    icon: any;
    color: string;
    growth?: number;
  }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {growth !== undefined && (
            <div className="flex items-center mt-2">
              {growth >= 0 ? (
                <TrendingUp className="text-green-500 mr-1" size={16} />
              ) : (
                <TrendingDown className="text-red-500 mr-1" size={16} />
              )}
              <span
                className={`text-sm font-medium ${
                  growth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {growth > 0 ? '+' : ''}
                {growth}%
              </span>
              <span className="text-xs text-gray-500 ml-1">vs last month</span>
            </div>
          )}
        </div>
        <div className={`p-4 rounded-xl ${color}`}>
          <Icon size={28} className="text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="p-8 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
            <p className="text-gray-600">
              Welcome back! Here&apos;s what&apos;s happening with your CMS today.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => printDashboardReport(stats)}
              className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title="Print Report"
            >
              <Printer size={18} />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={() => exportDashboardAsCSV(stats)}
              className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title="Export as CSV"
            >
              <Download size={18} />
              <span className="hidden sm:inline">CSV</span>
            </button>
            <button
              onClick={() => exportDashboardAsJSON(stats)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              title="Export as JSON"
            >
              <Download size={18} />
              <span className="hidden sm:inline">JSON</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Collection Types"
            value={stats.overview.collections}
            icon={Database}
            color="bg-gradient-to-br from-blue-500 to-blue-600"
          />
          <StatCard
            title="Total Users"
            value={stats.overview.users}
            icon={Users}
            color="bg-gradient-to-br from-green-500 to-green-600"
            growth={stats.growth.users}
          />
          <StatCard
            title="Media Files"
            value={stats.overview.media}
            icon={Image}
            color="bg-gradient-to-br from-purple-500 to-purple-600"
            growth={stats.growth.media}
          />
          <StatCard
            title="Storage Used"
            value={`${stats.overview.storageUsedMB} MB`}
            icon={HardDrive}
            color="bg-gradient-to-br from-orange-500 to-orange-600"
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Single Types</h3>
              <FileText className="text-gray-400" size={20} />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.overview.singles}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Components</h3>
              <Component className="text-gray-400" size={20} />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.overview.components}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Roles</h3>
              <Shield className="text-gray-400" size={20} />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.overview.roles}</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Activity Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Activity (Last 14 Days)</h3>
              <Activity className="text-gray-400" size={20} />
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={stats.activityChart}>
                <defs>
                  <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => format(new Date(date), 'MMM dd')}
                  stroke="#9CA3AF"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  labelFormatter={(date) => format(new Date(date), 'MMM dd, yyyy')}
                />
                <Area
                  type="monotone"
                  dataKey="activity"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorActivity)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* User Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">User Distribution</h3>
              <Users className="text-gray-400" size={20} />
            </div>
            {stats.userDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={stats.userDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ role, percent }) =>
                      `${role}: ${percent ? (percent * 100).toFixed(0) : 0}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {stats.userDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-gray-400">
                No user data available
              </div>
            )}
          </div>
        </div>

        {/* Collection Types & Media Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Collection Types */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Collection Entries</h3>
              <Database className="text-gray-400" size={20} />
            </div>
            {stats.collectionTypes.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.collectionTypes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="displayName"
                    stroke="#9CA3AF"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="entryCount" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-gray-400">
                No collections created yet
              </div>
            )}
          </div>

          {/* Media Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Media by Type</h3>
              <Image className="text-gray-400" size={20} />
            </div>
            {stats.mediaDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.mediaDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="type"
                    stroke="#9CA3AF"
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill="#10B981" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-gray-400">
                No media uploaded yet
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Users */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Recent Users</h3>
              <Clock className="text-gray-400" size={20} />
            </div>
            <div className="space-y-4">
              {stats.recentUsers.length > 0 ? (
                stats.recentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {format(new Date(user.createdAt), 'MMM dd')}
                      </p>
                      {user.role && (
                        <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                          {user.role.name}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center py-8">No recent users</p>
              )}
            </div>
          </div>

          {/* Recent Media */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Recent Media</h3>
              <Image className="text-gray-400" size={20} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              {stats.recentMedia.length > 0 ? (
                stats.recentMedia.map((media) => (
                  <div
                    key={media.id}
                    className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100 hover:shadow-lg transition-shadow"
                  >
                    {media.mime.startsWith('image/') ? (
                      <img
                        src={media.url}
                        alt={media.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileText className="text-gray-400" size={32} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-end p-2">
                      <p className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity truncate">
                        {media.name}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-3 text-gray-400 text-center py-8">
                  No media uploaded yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-8 text-white">
          <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/admin/content-type-builder"
              className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-4 transition-all flex items-center justify-between group"
            >
              <span className="font-medium">Create Content Type</span>
              <ArrowUpRight className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </Link>
            <Link
              href="/admin/settings/users"
              className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-4 transition-all flex items-center justify-between group"
            >
              <span className="font-medium">Manage Users</span>
              <ArrowUpRight className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </Link>
            <Link
              href="/admin/media-library"
              className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-4 transition-all flex items-center justify-between group"
            >
              <span className="font-medium">Upload Media</span>
              <ArrowUpRight className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
