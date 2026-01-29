'use client';

import React, { useState } from 'react';
import { DndContext, closestCenter, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Play, MoreVertical, CheckCircle2, Circle, XCircle, Loader2, GripVertical, Square, MessageSquare } from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import type { Task, Epic } from '@/lib/types';

import { LogViewer } from './LogViewer';

export function TaskBoard() {
    const { tasksData, createEpic, createTask, updateTask, deleteTask, runTasks } = useProject();
    const [newConfirmEpic, setNewConfirmEpic] = useState(false);
    const [newEpicTitle, setNewEpicTitle] = useState('');
    const [newEpicDescription, setNewEpicDescription] = useState('');
    const [viewingLogsForTask, setViewingLogsForTask] = useState<string | null>(null);

    if (!tasksData) return <div>Loading...</div>;

    const handleCreateEpic = async () => {
        if (newEpicTitle.trim()) {
            await createEpic(newEpicTitle, newEpicDescription);
            setNewEpicTitle('');
            setNewEpicDescription('');
            setNewConfirmEpic(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Task Board</h2>
                <button
                    onClick={() => setNewConfirmEpic(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-sm font-medium"
                >
                    <Plus className="w-4 h-4" /> New Epic
                </button>
            </div>

            {newConfirmEpic && (
                <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 flex flex-col gap-3">
                    <input
                        value={newEpicTitle}
                        onChange={e => setNewEpicTitle(e.target.value)}
                        placeholder="Epic Title"
                        className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-indigo-500"
                        autoFocus
                    />
                    <textarea
                        value={newEpicDescription}
                        onChange={e => setNewEpicDescription(e.target.value)}
                        placeholder="Epic Description (optional)"
                        className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-indigo-500 min-h-[60px]"
                    />
                    <div className="flex gap-2">
                        <button onClick={handleCreateEpic} className="px-3 py-1.5 bg-green-500 hover:bg-green-600 rounded text-sm transition-colors">Create Epic</button>
                        <button onClick={() => setNewConfirmEpic(false)} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors">Cancel</button>
                    </div>
                </div>
            )}

            <div className="space-y-6">
                {tasksData.epics.map(epic => (
                    <EpicCard key={epic.id} epic={epic} onViewLogs={setViewingLogsForTask} />
                ))}
            </div>

            {viewingLogsForTask && (
                <LogViewer
                    taskId={viewingLogsForTask}
                    onClose={() => setViewingLogsForTask(null)}
                    isLive={tasksData.epics.some(e => e.tasks.some(t => t.id === viewingLogsForTask && t.status === 'in-progress'))}
                />
            )}
        </div>
    );
}

function EpicCard({ epic, onViewLogs }: { epic: Epic; onViewLogs: (taskId: string) => void }) {
    const { createTask, updateEpic, runTasks } = useProject();
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(epic.title);
    const [editDescription, setEditDescription] = useState(epic.description);

    const handleAddTask = async () => {
        if (newTaskTitle.trim()) {
            await createTask(epic.id, newTaskTitle);
            setNewTaskTitle('');
        }
    };

    const handleSaveEpic = async () => {
        if (editTitle.trim()) {
            await updateEpic(epic.id, { title: editTitle, description: editDescription });
            setIsEditing(false);
        }
    };

    return (
        <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 overflow-hidden">
            <div className="p-4 border-b border-gray-700/50 flex items-center justify-between bg-gray-800/50">
                {isEditing ? (
                    <div className="flex-1 mr-4 space-y-2">
                        <input
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-lg font-semibold w-full"
                        />
                        <textarea
                            value={editDescription}
                            onChange={e => setEditDescription(e.target.value)}
                            className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-gray-400 w-full min-h-[60px]"
                        />
                        <div className="flex gap-2">
                            <button onClick={handleSaveEpic} className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30">Save</button>
                            <button onClick={() => setIsEditing(false)} className="px-2 py-1 bg-gray-700/50 text-gray-400 rounded text-xs hover:bg-gray-700/70">Cancel</button>
                        </div>
                    </div>
                ) : (
                    <div onClick={() => { setIsEditing(true); setEditTitle(epic.title); setEditDescription(epic.description); }} className="cursor-pointer hover:bg-white/5 p-2 -m-2 rounded-lg transition-colors flex-1 mr-4 group">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{epic.title}</h3>
                            <span className="opacity-0 group-hover:opacity-100 text-xs text-gray-500">Click to edit</span>
                        </div>
                        <p className="text-sm text-gray-400">{epic.description}</p>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => runTasks(epic.tasks.filter(t => t.status === 'pending').map(t => t.id))}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg text-sm transition-colors"
                    >
                        <Play className="w-3.5 h-3.5" /> Run Pending
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-2">
                {epic.tasks.map(task => (
                    <TaskItem key={task.id} task={task} onViewLogs={onViewLogs} />
                ))}

                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-700/30">
                    <Plus className="w-4 h-4 text-gray-500" />
                    <input
                        value={newTaskTitle}
                        onChange={e => setNewTaskTitle(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                        placeholder="Add a task..."
                        className="bg-transparent border-none focus:ring-0 text-sm w-full"
                    />
                </div>
            </div>
        </div>
    );
}

function TaskItem({ task, onViewLogs }: { task: Task; onViewLogs: (taskId: string) => void }) {
    const { runTasks, cancelCurrentRun } = useProject();
    const statusColors = {
        'pending': 'text-gray-400',
        'in-progress': 'text-blue-400',
        'completed': 'text-green-400',
        'failed': 'text-red-400',
    };

    const StatusIcon = {
        'pending': Circle,
        'in-progress': Loader2,
        'completed': CheckCircle2,
        'failed': XCircle,
    }[task.status];

    const handleRunStop = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (task.status === 'in-progress') {
            cancelCurrentRun();
        } else {
            runTasks([task.id]);
        }
    };

    return (
        <div className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg group">
            <GripVertical className="w-4 h-4 text-gray-600 opacity-0 group-hover:opacity-100 cursor-grab" />
            <StatusIcon className={`w-4 h-4 ${statusColors[task.status]} ${task.status === 'in-progress' ? 'animate-spin' : ''}`} />
            <span className={`flex-1 text-sm ${task.status === 'completed' ? 'text-gray-500 line-through' : ''}`}>
                {task.title}
            </span>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={handleRunStop}
                    className={`p-1.5 rounded transition-colors ${task.status === 'in-progress'
                        ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                        : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                        }`}
                    title={task.status === 'in-progress' ? 'Stop' : 'Run'}
                >
                    {task.status === 'in-progress' ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                    onClick={() => onViewLogs(task.id)}
                    className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
                    title="Chat & Logs"
                >
                    <MessageSquare className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs text-gray-600 font-mono ml-2">{task.id}</span>
            </div>
        </div>
    );
}
