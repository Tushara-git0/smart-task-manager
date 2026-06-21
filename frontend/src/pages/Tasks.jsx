import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import toast from 'react-hot-toast';
import { PlusIcon, FunnelIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const STATUSES = ['', 'pending', 'in_progress', 'review', 'completed', 'cancelled'];
const PRIORITIES = ['', 'low', 'medium', 'high', 'critical'];
const CATEGORIES = ['', 'development', 'testing', 'design', 'documentation', 'other'];

export default function Tasks() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canCreate = ['admin', 'manager', 'team_lead'].includes(user?.role);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: '', priority: '', category: '' });
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [modal, setModal] = useState(null); // null | 'create' | task object
  const [selectedTask, setSelectedTask] = useState(null);

  const params = { page, limit: 12, sort_by: sortBy, sort_order: sortOrder, ...(search && { search }), ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) };

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', params],
    queryFn: () => api.get('/tasks/', { params }).then(r => r.data),
    keepPreviousData: true,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.get('/teams/').then(r => r.data),
    enabled: canCreate,
  });

  const createMutation = useMutation({
    mutationFn: (d) => api.post('/tasks/', d).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries(['tasks']); qc.invalidateQueries(['dashboardStats']); toast.success('Task created!'); setModal(null); },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to create task'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }) => api.put(`/tasks/${id}`, d).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries(['tasks']); qc.invalidateQueries(['dashboardStats']); toast.success('Task updated!'); setModal(null); setSelectedTask(null); },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to update task'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/tasks/${id}`),
    onSuccess: () => { qc.invalidateQueries(['tasks']); qc.invalidateQueries(['dashboardStats']); toast.success('Task deleted!'); setSelectedTask(null); },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to delete task'),
  });

  const handleSave = (formData) => {
    if (modal === 'create') createMutation.mutate(formData);
    else updateMutation.mutate({ id: modal.id, ...formData });
  };

  const setFilter = (k, v) => { setFilters(f => ({ ...f, [k]: v })); setPage(1); };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tasks</h1>
        {canCreate && (
          <button onClick={() => setModal('create')} className="btn-primary flex items-center gap-2">
            <PlusIcon className="w-4 h-4" /> New Task
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="card p-4 space-y-3">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search tasks..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          {[['status', STATUSES], ['priority', PRIORITIES], ['category', CATEGORIES]].map(([key, opts]) => (
            <select key={key} className="input w-auto text-sm" value={filters[key]} onChange={e => setFilter(key, e.target.value)}>
              {opts.map(o => <option key={o} value={o}>{o ? o.replace('_', ' ') : `All ${key}s`}</option>)}
            </select>
          ))}
          <select className="input w-auto text-sm" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="created_at">Sort: Date</option>
            <option value="due_date">Sort: Due Date</option>
            <option value="priority">Sort: Priority</option>
            <option value="title">Sort: Title</option>
          </select>
          <select className="input w-auto text-sm" value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
            <option value="desc">↓ Desc</option>
            <option value="asc">↑ Asc</option>
          </select>
        </div>
      </div>

      {/* Task Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : data?.items?.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No tasks found</p>
          {canCreate && <p className="text-sm mt-1">Create your first task!</p>}
        </div>
      ) : (
        <>
          <div className="text-sm text-gray-500">{data?.total} task{data?.total !== 1 ? 's' : ''} found</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {data?.items?.map(task => (
              <TaskCard key={task.id} task={task} onClick={() => { setSelectedTask(task); setModal(task); }} />
            ))}
          </div>

          {/* Pagination */}
          {data?.pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary px-3 py-1 text-sm disabled:opacity-50">← Prev</button>
              <span className="text-sm text-gray-600 dark:text-gray-400">Page {page} of {data?.pages}</span>
              <button disabled={page === data?.pages} onClick={() => setPage(p => p + 1)} className="btn-secondary px-3 py-1 text-sm disabled:opacity-50">Next →</button>
            </div>
          )}
        </>
      )}

      {/* Delete button for selected task */}
      {selectedTask && modal && modal !== 'create' && ['admin', 'manager'].includes(user?.role) && (
        <div className="fixed bottom-6 right-6">
          <button
            onClick={() => { if (confirm('Delete this task?')) deleteMutation.mutate(selectedTask.id); }}
            className="btn-danger shadow-lg"
          >
            Delete Task
          </button>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <TaskModal
          task={modal === 'create' ? null : modal}
          teams={teams}
          onSave={handleSave}
          onClose={() => { setModal(null); setSelectedTask(null); }}
        />
      )}
    </div>
  );
}
