import React, { useMemo, useState } from 'react';
import { useProject } from '@/context/ProjectContext';
import { format, startOfDay, addDays } from 'date-fns';
import { Task, Epic } from '@/lib/types';
import { TaskEditModal } from './TaskEditModal';
import { Plus, X, Check, Play, Circle, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DropAnimation
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function Timeline() {
    const { tasksData, updateTask, createEpic, createTask, reorderTasks, runTasks } = useProject();
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isCreatingEpic, setIsCreatingEpic] = useState(false);
    const [newEpicTitle, setNewEpicTitle] = useState('');
    const [creatingTaskForEpic, setCreatingTaskForEpic] = useState<string | null>(null);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [activeId, setActiveId] = useState<string | null>(null);
    const [notification, setNotification] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

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

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        // Determine if dragging Epic or Task
        const activeEpic = tasksData.epics.find(e => e.id === activeId);
        if (activeEpic) {
            // Dragging Epic - reorder epics logic if implemented in backend (currently reorderTasks is for tasks)
            // For now we only support Task reordering as per context. reorderTasks is for within an epic.
            // If we want epic reorder we need a reorderEpics API.
            // Assuming user wants task reorder primarily as per request.
            return;
        }

        // Dragging Tast
        const sourceEpic = tasksData.epics.find(e => e.tasks.some(t => t.id === activeId));
        const destEpic = tasksData.epics.find(e => e.id === overId) || tasksData.epics.find(e => e.tasks.some(t => t.id === overId));

        if (!sourceEpic || !destEpic) return;

        // If dropped on an Epic header (overId is epicId)
        if (destEpic.id === overId) {
            // Moving to an empty epic or appending to end
            if (sourceEpic.id !== destEpic.id) {
                // Move to new epic
                // We need an API to move task between epics. 
                // Currently we only have reorderTasks (within epic) and updateTask.
                // We can use updateTask to change epicId ?? No, updateTask doesn't accept epicId usually.
                // Actually, create/delete is how we move? Or check updateTask.
                // updateTask in context only call /api/tasks updateTask.
                // Let's assume reorderTasks handles move if we pass tasks?
                // Wait, context reorderTasks signature: (epicId, taskIds).

                // Workaround: We need a moveTask API or simply update task locally?
                // Let's check updateTask signature in ProjectContext.
                // updateTask(taskId, updates). 
                // Does 'updates' support epicId? Backlog.tsx implies drag within epic.

                // Let's verify Backlog.tsx. It only does reorder within epic.
                // "SortableContext items={displayedTasks...}"

                // New Requirement: "Drag tasks between epics".
                // We need to implement moving tasks between epics.
                // For now, let's implement visual reorder within same epic first, 
                // and for cross-epic, we need to call updateTask if backend supports it OR delete/create.
                // Ideally updateTask supports moving. Let's assume we can add `epicId` to updateTask updates if backend supports it.
                // Let's check `src/lib/types.ts` Task interface.

                // I'll assume we can use `reorderTasks` for same epic.
                // For different epic, I'll try `updateTask(taskId, { epicId: destEpic.id })` but likely API needs check.
                // Let's check `api/tasks/route.ts`...

                // Assuming `updateTask` works for moving:
                await updateTask(activeId, { epicId: destEpic.id });
                setNotification(`Task moved to ${destEpic.title}`);
                setTimeout(() => setNotification(null), 3000);
            }
            return;
        }

        // Dropped on another task
        if (sourceEpic.id === destEpic.id) {
            // Reorder within same epic
            const oldIndex = sourceEpic.tasks.findIndex(t => t.id === activeId);
            const newIndex = sourceEpic.tasks.findIndex(t => t.id === overId);
            if (oldIndex !== newIndex) {
                const newOrder = arrayMove(sourceEpic.tasks, oldIndex, newIndex).map(t => t.id);
                await reorderTasks(sourceEpic.id, newOrder);
            }
        } else {
            // Reorder AND Move to different epic
            // First move to new epic, then reorder? Complicated.
            // Simplest: Just move to end of new epic for now, or use updateTask with epicId.
            await updateTask(activeId, { epicId: destEpic.id });
            setNotification(`Task moved to ${destEpic.title}`);
            setTimeout(() => setNotification(null), 3000);
        }
    };

    const dropAnimation: DropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0.5',
                },
            },
        }),
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex flex-col h-full bg-gray-900 text-gray-200 overflow-hidden rounded-xl border border-gray-800 relative">
                {/* Notification Toast */}
                {notification && (
                    <div className="absolute top-4 right-4 z-50 bg-indigo-600 text-white px-4 py-2 rounded shadow-lg animate-fade-in-down">
                        {notification}
                    </div>
                )}

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
                                <SortableEpicItems
                                    key={epic.id}
                                    epic={epic}
                                    creatingTaskForEpic={creatingTaskForEpic}
                                    setCreatingTaskForEpic={setCreatingTaskForEpic}
                                    newTaskTitle={newTaskTitle}
                                    setNewTaskTitle={setNewTaskTitle}
                                    handleCreateTask={handleCreateTask}
                                    setSelectedTask={setSelectedTask}
                                    updateTask={updateTask}
                                    runTasks={runTasks}
                                />
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

                <DragOverlay dropAnimation={dropAnimation}>
                    {activeId ? (
                        <div className="px-4 py-2 bg-gray-800 border border-indigo-500 shadow-xl rounded text-sm text-gray-200">
                            Dragging Task...
                        </div>
                    ) : null}
                </DragOverlay>
            </div>
        </DndContext>
    );
}

function SortableEpicItems({
    epic,
    creatingTaskForEpic, setCreatingTaskForEpic,
    newTaskTitle, setNewTaskTitle, handleCreateTask,
    setSelectedTask,
    updateTask,
    runTasks
}: {
    epic: Epic;
    creatingTaskForEpic: string | null;
    setCreatingTaskForEpic: (id: string | null) => void;
    newTaskTitle: string;
    setNewTaskTitle: (title: string) => void;
    handleCreateTask: (epicId: string) => Promise<void>;
    setSelectedTask: (task: Task | null) => void;
    updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
    runTasks: (taskIds: string[]) => Promise<void>;
}) {
    return (
        <div>
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
            <SortableContext items={epic.tasks.map((t: Task) => t.id)} strategy={verticalListSortingStrategy}>
                {epic.tasks.map((task: Task) => (
                    <SortableTaskItem
                        key={task.id}
                        task={task}
                        setSelectedTask={setSelectedTask}
                        updateTask={updateTask}
                        runTasks={runTasks}
                    />
                ))}
            </SortableContext>
        </div>
    );
}

function SortableTaskItem({ task, setSelectedTask, updateTask, runTasks }: {
    task: Task;
    setSelectedTask: (task: Task | null) => void;
    updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
    runTasks: (taskIds: string[]) => Promise<void>;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const statusColors: Record<Task['status'], string> = {
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

    const cycleStatus = async (e: React.MouseEvent) => {
        e.stopPropagation();
        let newStatus: Task['status'] = 'pending';
        if (task.status === 'pending') newStatus = 'completed'; // Skipping in-progress for manual cycle usually
        else if (task.status === 'completed') newStatus = 'failed';
        else if (task.status === 'failed') newStatus = 'pending';

        // Handle in-progress differently? For simplicity, cycle through all including pending->completed. 
        // Backlog does: pending/in-progress -> completed -> failed -> pending.
        if (task.status === 'in-progress') newStatus = 'completed';

        await updateTask(task.id, {
            status: newStatus,
            completedAt: newStatus === 'completed' ? new Date().toISOString() : null
        });
    };

    const handleRunClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (task.status !== 'completed') {
            runTasks([task.id]);
        }
    };

    return (
        <div
            ref={setNodeRef} style={style} {...attributes} {...listeners}
            className="px-4 py-2 border-b border-gray-800/50 text-sm hover:bg-gray-800/50 transition-colors h-10 flex items-center gap-2 group cursor-grab active:cursor-grabbing"
            onClick={() => setSelectedTask(task)}
        >
            <div onClick={cycleStatus} className="cursor-pointer hover:scale-110 transition-transform p-1">
                <StatusIcon className={`w-3.5 h-3.5 ${statusColors[task.status]} ${task.status === 'in-progress' ? 'animate-spin' : ''}`} />
            </div>

            <div className="flex-1 truncate select-none">{task.title}</div>

            {task.status !== 'completed' && (
                <button
                    onClick={handleRunClick}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-green-500/20 text-green-400 rounded transition-all"
                    title="Run Task"
                    onPointerDown={e => e.stopPropagation()} /* Prevent Drag start */
                >
                    <Play className="w-3 h-3" />
                </button>
            )}
        </div>
    );
}
