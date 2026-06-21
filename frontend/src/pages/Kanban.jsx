import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { PlusIcon } from '@heroicons/react/24/outline';
import TaskModal from '../components/TaskModal';

const COLUMNS = [
  { id: 'pending', label: 'Pending', color: 'border-t-gray-400' },
  { id: 'in_progress', label: 'In Progress', color: 'border-t-blue-500' },
  { id: 'review', label: 'Review', color: 'border-t-purple-500' },
  { id: 'completed', label: 'Completed', color: 'border-t-green-500' },
];

const PRIORITY_DOT = { low: 'bg-green-400', medium: 'bg-amber-400', high: 'bg-orange-500', critical: 'bg-red-500' };

export default function Kanban() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canCreate = ['admin', 'manager', 'team_lead'].includes(user?.role);
  const [modal, setModal] = useState(null);

  const { data: tasksData } = useQuery({
    queryKey: ['tasks', { page: 1, limit: 100 }],
    queryFn: () => api.get('/tasks/', { params: { page: 1, limit: 100 } }).then(r => r.data),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.get('/teams/').then(r => r.data),
    enabled: canCreate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => api.put(`/tasks/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries(['tasks']),
    onError: () => toast.error('Failed to update task'),
  });

  const createMutation = useMutation({
    mutationFn: (d) => api.post('/tasks/', d),
    onSuccess: () => { qc.invalidateQueries(['tasks']); toast.success('Task created!'); setModal(null); },
  });

  const tasks = tasksData?.items || [];
  const columns = COLUMNS.reduce((acc, col) => {
    acc[col.id] = tasks.filter(t => t.status === col.id);
    return acc;
  }, {});

  const onDragEnd = ({ source, destination, draggableId }) => {
    if (!destination || source.droppableId === destination.droppableId) return;
    updateMutation.mutate({ id: parseInt(draggableId), status: destination.droppableId });
  };

  return (
    <div className="p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Kanban Board</h1>
        {canCreate && (
          <button onClick={() => setModal('create')} className="btn-primary flex items-center gap-2">
            <PlusIcon className="w-4 h-4" /> New Task
          </button>
        )}
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-180px)]">
          {COLUMNS.map(col => (
            <div key={col.id} className={`flex-shrink-0 w-72 card border-t-4 ${col.color} flex flex-col`}>
              <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="font-semibold text-sm">{col.label}</h3>
                <span className="badge bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                  {columns[col.id]?.length}
                </span>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 overflow-y-auto p-3 space-y-2 min-h-20 ${snapshot.isDraggingOver ? 'drag-over rounded-lg' : ''}`}
                  >
                    {columns[col.id]?.map((task, index) => (
                      <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`card p-3 cursor-grab active:cursor-grabbing ${snapshot.isDragging ? 'shadow-xl rotate-1 opacity-90' : ''}`}
                          >
                            <div className="flex items-start gap-2 mb-1">
                              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${PRIORITY_DOT[task.priority]}`} />
                              <p className="text-sm font-medium line-clamp-2">{task.title}</p>
                            </div>
                            {task.due_date && (
                              <p className="text-xs text-gray-400 mt-1 pl-4">
                                Due {new Date(task.due_date).toLocaleDateString()}
                              </p>
                            )}
                            <div className="flex gap-1 mt-2 pl-4 flex-wrap">
                              <span className="badge bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs">{task.category}</span>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {modal === 'create' && (
        <TaskModal
          task={null}
          teams={teams}
          onSave={(d) => createMutation.mutate(d)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
