import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameMonth, isSameDay, addMonths, subMonths, isToday
} from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const PRIORITY_COLOR = {
  low: 'bg-emerald-500',
  medium: 'bg-amber-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
};

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const { data: tasksData } = useQuery({
    queryKey: ['tasks', { page: 1, limit: 200 }],
    queryFn: () => api.get('/tasks/', { params: { page: 1, limit: 200 } }).then(r => r.data),
  });

  const tasks = tasksData?.items || [];

  const getTasksForDay = (day) =>
    tasks.filter(t => t.due_date && isSameDay(new Date(t.due_date), day));

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-bold">{format(currentMonth, 'MMMM yyyy')}</h2>
      <div className="flex gap-2">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="btn-secondary p-2">
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
        <button onClick={() => setCurrentMonth(new Date())} className="btn-secondary px-3 py-2 text-sm">Today</button>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="btn-secondary p-2">
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderDaysOfWeek = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-2">{d}</div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let day = startDate;

    while (day <= endDate) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const dayTasks = getTasksForDay(cloneDay);
        const isSelected = selectedDay && isSameDay(cloneDay, selectedDay);

        week.push(
          <div
            key={day.toString()}
            onClick={() => setSelectedDay(isSameDay(cloneDay, selectedDay) ? null : cloneDay)}
            className={`min-h-20 p-1.5 border border-gray-100 dark:border-gray-700 cursor-pointer transition-colors
              ${!isSameMonth(cloneDay, monthStart) ? 'bg-gray-50 dark:bg-gray-900/50' : 'bg-white dark:bg-gray-800'}
              ${isToday(cloneDay) ? 'ring-2 ring-blue-500 ring-inset' : ''}
              ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}
            `}
          >
            <span className={`text-xs font-medium block mb-1
              ${!isSameMonth(cloneDay, monthStart) ? 'text-gray-300 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'}
              ${isToday(cloneDay) ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}
            `}>
              {format(cloneDay, 'd')}
            </span>
            <div className="space-y-0.5">
              {dayTasks.slice(0, 3).map(t => (
                <div key={t.id} className={`text-white text-xs px-1 py-0.5 rounded truncate ${PRIORITY_COLOR[t.priority] || 'bg-gray-400'}`}>
                  {t.title}
                </div>
              ))}
              {dayTasks.length > 3 && (
                <div className="text-xs text-gray-400">+{dayTasks.length - 3} more</div>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(<div key={day.toString()} className="grid grid-cols-7">{week}</div>);
    }
    return <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">{rows}</div>;
  };

  const selectedDayTasks = selectedDay ? getTasksForDay(selectedDay) : [];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Calendar</h1>

      <div className="card p-6">
        {renderHeader()}
        {renderDaysOfWeek()}
        {renderCells()}
      </div>

      {selectedDay && (
        <div className="card p-6">
          <h3 className="font-semibold mb-3">
            Tasks due on {format(selectedDay, 'MMMM d, yyyy')}
            <span className="ml-2 badge bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              {selectedDayTasks.length}
            </span>
          </h3>
          {selectedDayTasks.length === 0 ? (
            <p className="text-sm text-gray-400">No tasks due this day</p>
          ) : (
            <div className="space-y-2">
              {selectedDayTasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${PRIORITY_COLOR[task.priority]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <p className="text-xs text-gray-400 capitalize">{task.status?.replace('_', ' ')} · {task.priority}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="card p-4 flex flex-wrap gap-4">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Priority:</span>
        {Object.entries(PRIORITY_COLOR).map(([p, c]) => (
          <div key={p} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-full ${c}`} />
            <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">{p}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
