import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, ArcElement, PointElement, LineElement
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { ClipboardDocumentListIcon, CheckCircleIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement);

const StatCard = ({ title, value, icon: Icon, color, bg }) => (
  <div className="card p-6 flex items-center gap-4">
    <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
      <Icon className={`w-6 h-6 ${color}`} />
    </div>
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value ?? '—'}</p>
    </div>
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data),
    refetchInterval: 60000,
  });

  const { data: activity = [] } = useQuery({
    queryKey: ['activity'],
    queryFn: () => api.get('/dashboard/activity?limit=8').then(r => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const priorityData = {
    labels: (stats?.priority_stats || []).map(p => p.priority.charAt(0).toUpperCase() + p.priority.slice(1)),
    datasets: [{
      data: (stats?.priority_stats || []).map(p => p.count),
      backgroundColor: ['#10B981', '#F59E0B', '#F97316', '#EF4444'],
      borderWidth: 0,
    }],
  };

  const statusData = {
    labels: (stats?.status_stats || []).map(s => s.status.replace('_', ' ')),
    datasets: [{
      data: (stats?.status_stats || []).map(s => s.count),
      backgroundColor: ['#94A3B8', '#3B82F6', '#8B5CF6', '#10B981', '#EF4444'],
      borderWidth: 0,
    }],
  };

  const weeklyData = {
    labels: (stats?.weekly_stats || []).map(d => d.date.slice(5)),
    datasets: [
      {
        label: 'Created',
        data: (stats?.weekly_stats || []).map(d => d.created),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59,130,246,0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Completed',
        data: (stats?.weekly_stats || []).map(d => d.completed),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16,185,129,0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Welcome back, {user?.name} · {user?.role?.replace('_', ' ')}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Tasks" value={stats?.total_tasks} icon={ClipboardDocumentListIcon} color="text-blue-600" bg="bg-blue-100 dark:bg-blue-900/30" />
        <StatCard title="Completed" value={stats?.completed_tasks} icon={CheckCircleIcon} color="text-green-600" bg="bg-green-100 dark:bg-green-900/30" />
        <StatCard title="In Progress" value={stats?.in_progress} icon={ClockIcon} color="text-amber-600" bg="bg-amber-100 dark:bg-amber-900/30" />
        <StatCard title="Overdue" value={stats?.overdue_tasks} icon={ExclamationTriangleIcon} color="text-red-600" bg="bg-red-100 dark:bg-red-900/30" />
      </div>

      {/* Completion Rate Bar */}
      <div className="card p-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Overall Completion Rate</span>
          <span className="text-sm font-bold text-blue-600">{stats?.completion_rate}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${stats?.completion_rate || 0}%` }}
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-base font-semibold mb-4">Priority Distribution</h3>
          <div className="h-56"><Doughnut data={priorityData} options={chartOptions} /></div>
        </div>
        <div className="card p-6">
          <h3 className="text-base font-semibold mb-4">Status Distribution</h3>
          <div className="h-56"><Doughnut data={statusData} options={chartOptions} /></div>
        </div>
      </div>

      {/* Weekly Line Chart */}
      <div className="card p-6">
        <h3 className="text-base font-semibold mb-4">Weekly Activity (Last 7 Days)</h3>
        <div className="h-56"><Line data={weeklyData} options={chartOptions} /></div>
      </div>

      {/* Recent Activity */}
      <div className="card p-6">
        <h3 className="text-base font-semibold mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {activity.length === 0 ? (
            <p className="text-sm text-gray-400">No recent activity</p>
          ) : (
            activity.map(log => (
              <div key={log.id} className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-800 dark:text-gray-200">{log.details}</p>
                  <p className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
