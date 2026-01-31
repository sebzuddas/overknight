import React, { useMemo, useState } from 'react';
import { useProject } from '@/context/ProjectContext';
import { format, startOfDay, addDays } from 'date-fns';
import { Task } from '@/lib/types';
import { TaskEditModal } from './TaskEditModal';
import { Plus, X, Check } from 'lucide-react';

export function Timeline() {
    const { tasksData, updateTask, createEpic, createTask } = useProject();
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isCreatingEpic, setIsCreatingEpic] = useState(false);
    const [newEpicTitle, setNewEpicTitle] = useState('');
    const [creatingTaskForEpic, setCreatingTaskForEpic] = useState<string | null>(null);
    const [newTaskTitle, setNewTaskTitle] = useState('');

    // Calculate time range based on tasks
    const { startDate, days } = useMemo(() => {
        let start = new Date();
        let end = addDays(start, 7); // Default view 1 week

        if (tasksData?.epics) {
            tasksData.epics.forEach(epic => {
                epic.tasks.forEach(task => {
                    if (task.startDate) {
                        const taskStart = new Date(task.startDate);
                        if (taskStart < start) start = taskStart;
                        if (taskStart > end) end = taskStart;
                    }
                });
            });
        }
        // Buffer
        start = startOfDay(start);
        end = addDays(startOfDay(end), 1);

        const days = [];
        let current = start;
        while (current <= end) {
            days.push(current);
            current = addDays(current, 1);
        }

        return { startDate: start, endDate: end, days };
    }, [tasksData]);

    if (!tasksData) return <div>Loading timeline...</div>;

    const hourWidth = 40; // Pixels per hour
    const dayWidth = hourWidth * 24;

    const handleCreateEpic = async () => {
        if (newEpicTitle.trim()) {
            await createEpic(newEpicTitle);
            setNewEpicTitle('');
            setIsCreatingEpic(false);
        }
    };

    const handleCreateTask = async (epicId: string) => {
        if (newTaskTitle.trim()) {
            await createTask(epicId, newTaskTitle, undefined, undefined, new Date().toISOString());
            setNewTaskTitle('');
            setCreatingTaskForEpic(null);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-900 text-gray-200 overflow-hidden rounded-xl border border-gray-800 relative">
            {/* Header / Time Axis */}
            <div className="flex border-b border-gray-800 bg-gray-950/50 relative z-20">
                <div className="w-64 shrink-0 p-4 border-r border-gray-800 font-bold text-gray-400 flex justify-between items-center">
                    <span>Epics / Tasks</span>
                    <button onClick={() => setIsCreatingEpic(true)} className="p-1 hover:bg-gray-800 rounded text-indigo-400" title="New Epic">
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
                <div className="overflow-x-auto flex-1 hide-scrollbar">
                    <div className="flex" style={{ width: `${days.length * dayWidth}px` }}>
                        {days.map(day => (
                            <div key={day.toISOString()} className="border-r border-gray-800/50" style={{ width: `${dayWidth}px` }}>
                                <div className="px-2 py-1 text-xs font-medium bg-gray-900 sticky left-0 text-center border-b border-gray-800">
                                    {format(day, 'EEE, MMM d')}
                                </div>
                                <div className="flex h-6">
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <div key={i} className="flex-1 border-r border-gray-800/20 text-[10px] text-gray-600 flex items-end justify-center pb-0.5">
                                            {i * 4}:00
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto relative z-10">
                <div className="flex min-w-max">
                    {/* Sidebar */}
                    <div className="w-64 shrink-0 bg-gray-900 border-r border-gray-800 sticky left-0 z-30">
                        {isCreatingEpic && (
                            <div className="p-2 border-b border-gray-800 bg-gray-800/50">
                                <input
                                    value={newEpicTitle}
                                    onChange={e => setNewEpicTitle(e.target.value)}
                                    placeholder="Epic Name"
                                    className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm mb-2"
                                    autoFocus
                                    onKeyDown={e => e.key === 'Enter' && handleCreateEpic()}
                                />
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => setIsCreatingEpic(false)} className="p-1 hover:bg-gray-700 rounded"><X className="w-3 h-3" /></button>
                                    <button onClick={handleCreateEpic} className="p-1 bg-indigo-500 hover:bg-indigo-600 rounded"><Check className="w-3 h-3 text-white" /></button>
                                </div>
                            </div>
                        )}
                        {tasksData.epics.map(epic => (
                            <div key={epic.id}>
                                <div className="px-4 py-3 bg-gray-800/30 border-b border-gray-800 flex items-center justify-between gap-2 font-semibold text-indigo-300 group">
                                    <span className="truncate">{epic.title}</span>
                                    <button onClick={() => setCreatingTaskForEpic(epic.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-opacity">
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>
                                {creatingTaskForEpic === epic.id && (
                                    <div className="px-4 py-2 border-b border-gray-800/50 bg-gray-800/50">
                                        <input
                                            value={newTaskTitle}
                                            onChange={e => setNewTaskTitle(e.target.value)}
                                            placeholder="Task Name"
                                            className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs mb-1"
                                            autoFocus
                                            onKeyDown={e => e.key === 'Enter' && handleCreateTask(epic.id)}
                                        />
                                        <div className="flex gap-2 justify-end">
                                            <button onClick={() => setCreatingTaskForEpic(null)} className="text-xs text-gray-500 hover:text-white">Cancel</button>
                                            <button onClick={() => handleCreateTask(epic.id)} className="text-xs text-indigo-400 hover:text-indigo-300">Add</button>
                                        </div>
                                    </div>
                                )}
                                {epic.tasks.map(task => (
                                    <div
                                        key={task.id}
                                        className="px-8 py-2 border-b border-gray-800/50 text-sm truncate hover:bg-gray-800/50 transition-colors h-10 flex items-center cursor-pointer"
                                        onClick={() => setSelectedTask(task)}
                                    >
                                        {task.title}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>

                    {/* Timeline Grid */}
                    <div className="relative" style={{ width: `${days.length * dayWidth}px` }}>
                        {/* Grid Lines */}
                        <div className="absolute inset-0 flex pointer-events-none">
                            {days.map(day => (
                                <div key={day.toISOString()} className="h-full border-r border-gray-800/30" style={{ width: `${dayWidth}px` }}>
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <div key={i} className="h-full border-r border-gray-800/10 w-1/6 float-left" />
                                    ))}
                                </div>
                            ))}
                        </div>

                        {/* Task Bars */}
                        <div className="relative">
                            {isCreatingEpic && <div className="h-[85px]" />} {/* Spacer for new epic input */}
                            {tasksData.epics.map(epic => (
                                <div key={epic.id}>
                                    <div className="h-[45px]" /> {/* Spacer for Epic Header */}
                                    {creatingTaskForEpic === epic.id && <div className="h-[65px]" />} {/* Spacer for new task input */}
                                    {epic.tasks.map(task => {
                                        let left = 0;
                                        let width = 0;

                                        if (task.startDate) {
                                            const taskStart = new Date(task.startDate);
                                            // Handle invalid dates
                                            if (!isNaN(taskStart.getTime())) {
                                                const diffTime = taskStart.getTime() - startDate.getTime();
                                                const diffHours = diffTime / (1000 * 60 * 60);
                                                left = diffHours * hourWidth;
                                                width = hourWidth; // Default 1 hour

                                                if (task.endDate) {
                                                    const taskEnd = new Date(task.endDate);
                                                    if (!isNaN(taskEnd.getTime())) {
                                                        const duration = (taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60);
                                                        width = Math.max(duration * hourWidth, 20); // Min width
                                                    }
                                                }
                                            }
                                        }

                                        return (
                                            <div key={task.id} className="h-10 relative border-b border-transparent">
                                                {task.startDate && left >= 0 && (
                                                    <div
                                                        className={`absolute top-1.5 h-7 rounded-md px-2 text-xs flex items-center overflow-hidden whitespace-nowrap shadow-sm border cursor-pointer hover:brightness-110 transition-all z-10
                                                        ${task.status === 'completed' ? 'bg-green-500/20 border-green-500/50 text-green-200' :
                                                                task.status === 'in-progress' ? 'bg-blue-500/20 border-blue-500/50 text-blue-200 animate-pulse' :
                                                                    'bg-indigo-500/20 border-indigo-500/50 text-indigo-200'}`}
                                                        style={{ left: `${left}px`, width: `${width}px` }}
                                                        title={`${task.title} (${new Date(task.startDate).toLocaleString()})`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedTask(task);
                                                        }}
                                                    >
                                                        {task.title}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {selectedTask && (
                <TaskEditModal
                    key={selectedTask.id}
                    task={selectedTask}
                    isOpen={!!selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onSave={async (taskId, updates) => {
                        await updateTask(taskId, updates);
                    }}
                />
            )}
        </div>
    );
}
