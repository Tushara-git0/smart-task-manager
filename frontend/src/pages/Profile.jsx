import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { UserCircleIcon, KeyIcon, SwatchIcon } from '@heroicons/react/24/outline';

export default function Profile() {
  const { user, updateUser, toggleDarkMode } = useAuth();
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });

  const updateProfile = useMutation({
    mutationFn: (d) => api.put('/auth/me', d).then(r => r.data),
    onSuccess: (data) => { updateUser(data); toast.success('Profile updated!'); },
    onError: (e) => toast.error(e.response?.data?.detail || 'Update failed'),
  });

  const changePassword = useMutation({
    mutationFn: (d) => api.post('/auth/change-password', d),
    onSuccess: () => { toast.success('Password changed!'); setPwForm({ current_password: '', new_password: '', confirm: '' }); },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to change password'),
  });

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    updateProfile.mutate(profileForm);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm) { toast.error('Passwords do not match'); return; }
    if (pwForm.new_password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    changePassword.mutate({ current_password: pwForm.current_password, new_password: pwForm.new_password });
  };

  const ROLE_BADGE = {
    admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    team_lead: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    employee: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      {/* Avatar + Info */}
      <div className="card p-6 flex items-center gap-5">
        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <h2 className="text-xl font-semibold">{user?.name}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
          <span className={`badge mt-1 ${ROLE_BADGE[user?.role] || ''}`}>
            {user?.role?.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Edit Profile */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <UserCircleIcon className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold">Edit Profile</h3>
        </div>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input
              className="input"
              value={profileForm.name}
              onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              className="input"
              value={profileForm.phone}
              onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input className="input opacity-60 cursor-not-allowed" value={user?.email} disabled />
          </div>
          <button type="submit" disabled={updateProfile.isPending} className="btn-primary">
            {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <KeyIcon className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold">Change Password</h3>
        </div>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Current Password</label>
            <input
              type="password"
              className="input"
              value={pwForm.current_password}
              onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">New Password</label>
            <input
              type="password"
              className="input"
              value={pwForm.new_password}
              placeholder="Min. 8 characters"
              onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirm New Password</label>
            <input
              type="password"
              className="input"
              value={pwForm.confirm}
              onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
              required
            />
          </div>
          <button type="submit" disabled={changePassword.isPending} className="btn-primary">
            {changePassword.isPending ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Appearance */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <SwatchIcon className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold">Appearance</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Dark Mode</p>
            <p className="text-xs text-gray-400 mt-0.5">Switch between light and dark theme</p>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${user?.dark_mode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${user?.dark_mode ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
        </div>
      </div>

      {/* Account Info */}
      <div className="card p-6">
        <h3 className="font-semibold mb-3">Account Info</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500 dark:text-gray-400">Member since</dt>
            <dd className="font-medium">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500 dark:text-gray-400">Account status</dt>
            <dd className="font-medium text-green-600 dark:text-green-400">Active</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500 dark:text-gray-400">Role</dt>
            <dd className="font-medium capitalize">{user?.role?.replace('_', ' ')}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
