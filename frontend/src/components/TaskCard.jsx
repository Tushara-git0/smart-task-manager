import React from 'react';
import { format, isPast } from 'date-fns';
import { CalendarIcon, UserIcon } from '@heroicons/react/24/outline';

const PRIORITY_STYLES = {
  low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const STATUS_STYLES = {
  pending: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  review: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

export default function TaskCard({ task, onClick, draggable }) {
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'completed' && task.status !== 'cancelled';

  return (
    <div
      onClick={onClick}
      className={`card p-4 cursor-pointer hover:shadow-md transition-shadow ${isOverdue ? 'border-l-4 border-l-red-500' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 flex-1">{task.title}</h4>
        <span className={`badge flex-shrink-0 ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium}`}>
          {task.priority}
        </span>
      </div>

      {task.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{task.description}</p>
      )}

      <div className="flex items-center justify-between">
        <span className={`badge ${STATUS_STYLES[task.status] || STATUS_STYLES.pending}`}>
          {task.status?.replace('_', ' ')}
        </span>
        {task.due_date && (
          <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
            <CalendarIcon className="w-3.5 h-3.5" />
            {format(new Date(task.due_date), 'MMM d')}
            {isOverdue && ' ⚠️'}
          </div>
        )}
      </div>

      {task.assignments?.length > 0 && (
        <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
          <UserIcon className="w-3.5 h-3.5" />
          <span>{task.assignments.length} assigned</span>
        </div>
      )}
    </div>
  );
}
