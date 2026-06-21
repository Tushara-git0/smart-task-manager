import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { PlusIcon, UserGroupIcon, XMarkIcon } from '@heroicons/react/24/outline';

function CreateTeamModal({ users, onSave, onClose }) {
  const [form, setForm] = useState({ name: '', description: '', member_ids: [] });
  const [loading, setLoading] = useState(false);

  const toggleMember = (id) => {
    setForm(f => ({
      ...f,
      member_ids: f.member_ids.includes(id) ? f.member_ids.filter(m => m !== id) : [...f.member_ids, id]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await onSave(form); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Create Team</h2>
          <button onClick={onClose}><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Team Name *</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea className="input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Add Members</label>
            <div className="max-h-40 overflow-y-auto space-y-1 border border-gray-200 dark:border-gray-600 rounded-lg p-2">
              {users?.map(u => (
                <label key={u.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded">
                  <input type="checkbox" checked={form.member_ids.includes(u.id)} onChange={() => toggleMember(u.id)} className="rounded" />
                  <span className="text-sm">{u.name} <span className="text-gray-400 text-xs">({u.role})</span></span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Creating...' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Teams() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canCreate = ['admin', 'manager'].includes(user?.role);
  const [showModal, setShowModal] = useState(false);

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.get('/teams/').then(r => r.data),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/dashboard/users').then(r => r.data),
    enabled: canCreate,
  });

  const createMutation = useMutation({
    mutationFn: (d) => api.post('/teams/', d),
    onSuccess: () => { qc.invalidateQueries(['teams']); toast.success('Team created!'); setShowModal(false); },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to create team'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/teams/${id}`),
    onSuccess: () => { qc.invalidateQueries(['teams']); toast.success('Team deleted'); },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to delete team'),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Teams</h1>
        {canCreate && (
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <PlusIcon className="w-4 h-4" /> New Team
          </button>
        )}
      </div>

      {teams.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <UserGroupIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg">No teams yet</p>
          {canCreate && <p className="text-sm mt-1">Create your first team!</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map(team => (
            <div key={team.id} className="card p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <UserGroupIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{team.name}</h3>
                    <p className="text-xs text-gray-400">{team.members?.length || 0} member{team.members?.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                {canCreate && (team.manager_id === user?.id || user?.role === 'admin') && (
                  <button
                    onClick={() => { if (window.confirm(`Delete team "${team.name}"?`)) deleteMutation.mutate(team.id); }}
                    className="text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400"
                  >
                    Delete
                  </button>
                )}
              </div>

              {team.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{team.description}</p>
              )}

              {team.members?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {team.members.slice(0, 6).map(m => (
                    <span key={m.id} className="badge bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs">
                      {m.role}
                    </span>
                  ))}
                  {team.members.length > 6 && (
                    <span className="badge bg-gray-100 dark:bg-gray-700 text-gray-500 text-xs">
                      +{team.members.length - 6} more
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <CreateTeamModal
          users={users}
          onSave={(d) => createMutation.mutate(d)}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
