'use client';

import React, { useState } from 'react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Play, CheckCircle2, Circle, XCircle, Loader2, GripVertical, Square, MessageSquare, ArrowDown, Eye, EyeOff } from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { type Task, type Epic, type Workflow, DEFAULT_AGENTS, type AgentConfig } from '@/lib/types';



export function Backlog() {
    const { tasksData, createEpic, reorderTasks } = useProject();
    const [newConfirmEpic, setNewConfirmEpic] = useState(false);
    const [newEpicTitle, setNewEpicTitle] = useState('');
    const [newEpicDescription, setNewEpicDescription] = useState('');

    if (!tasksData) return <div>Loading...</div>;

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        // Find which epic this task belongs to
        const epic = tasksData.epics.find(e => e.tasks.some(t => t.id === active.id));
        if (!epic) return;

        const oldIndex = epic.tasks.findIndex(t => t.id === active.id);
        const newIndex = epic.tasks.findIndex(t => t.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
            const newOrder = arrayMove(epic.tasks, oldIndex, newIndex).map(t => t.id);
            await reorderTasks(epic.id, newOrder);
        }
    };

    const handleCreateEpic = async () => {
        if (newEpicTitle.trim()) {
            await createEpic(newEpicTitle, newEpicDescription);
            setNewEpicTitle('');
            setNewEpicDescription('');
            setNewConfirmEpic(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-8rem)] gap-6">
            <div className="flex-1 space-y-6 overflow-auto">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Backlog</h2>
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

                <div className="space-y-6 pb-20">
                    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        {tasksData.epics.map(epic => (
                            <EpicCard key={epic.id} epic={epic} />
                        ))}
                    </DndContext>
                </div>
            </div>
        </div>
    );
}

function EpicCard({ epic }: { epic: Epic }) {
    const { createTask, updateEpic, runTasks } = useProject();
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(epic.title);
    const [editDescription, setEditDescription] = useState(epic.description);
    const [editAssignee, setEditAssignee] = useState(epic.assignee || '');
    const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
    const [showCompleted, setShowCompleted] = useState(true);

    const displayedTasks = showCompleted
        ? epic.tasks
        : epic.tasks.filter(t => t.status !== 'completed');

    const toggleTaskSelection = (taskId: string) => {
        setSelectedTasks(prev =>
            prev.includes(taskId)
                ? prev.filter(id => id !== taskId)
                : [...prev, taskId]
        );
    };

    const handleAddTask = async () => {
        if (newTaskTitle.trim()) {
            await createTask(epic.id, newTaskTitle);
            setNewTaskTitle('');
        }
    };

    const handleSaveEpic = async () => {
        if (editTitle.trim()) {
            await updateEpic(epic.id, {
                title: editTitle,
                description: editDescription,
                assignee: editAssignee || undefined,
            });
            setIsEditing(false);
        }
    };

    return (
        <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 overflow-hidden">
            <div className="p-4 border-b border-gray-700/50 flex items-center justify-between bg-gray-800/50">
                <div onClick={(e) => {
                    e.stopPropagation();
                    if (selectedTasks.length === epic.tasks.length && epic.tasks.length > 0) {
                        setSelectedTasks([]);
                    } else {
                        setSelectedTasks(epic.tasks.map(t => t.id));
                    }
                }} className="mr-4 cursor-pointer">
                    {selectedTasks.length === epic.tasks.length && epic.tasks.length > 0 ? (
                        <div className="w-4 h-4 bg-indigo-500 rounded flex items-center justify-center">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                    ) : (
                        <div className="w-4 h-4 border border-gray-600 rounded hover:border-gray-400 transition-colors" />
                    )}
                </div>
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
                        <input
                            value={editAssignee}
                            onChange={e => setEditAssignee(e.target.value)}
                            className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm w-full focus:outline-none focus:border-indigo-500"
                            placeholder="Assignee (optional)"
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
                        onClick={() => setShowCompleted(!showCompleted)}
                        className={`p-1.5 rounded transition-colors ${showCompleted ? 'text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20' : 'text-gray-500 hover:bg-gray-700/50'}`}
                        title={showCompleted ? "Hide Completed Tasks" : "Show Completed Tasks"}
                    >
                        {showCompleted ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => {
                            if (selectedTasks.length === 0) return;
                            runTasks(selectedTasks);
                            setSelectedTasks([]);
                        }}
                        disabled={selectedTasks.length === 0}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-200 ${selectedTasks.length > 0
                            ? 'bg-indigo-500 hover:bg-indigo-600 text-white font-medium shadow-sm shadow-indigo-500/20'
                            : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700/50'
                            }`}
                    >
                        <Play className={`w-3.5 h-3.5 ${selectedTasks.length === 0 ? 'opacity-50' : ''}`} />
                        {selectedTasks.length > 0 ? `Run Selected (${selectedTasks.length})` : 'Select tasks to run'}
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-2">
                <SortableContext items={displayedTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {displayedTasks.map((task, index) => (
                        <TaskItem
                            key={task.id}
                            task={task}
                            isSelected={selectedTasks.includes(task.id)}
                            onToggleSelection={() => toggleTaskSelection(task.id)}
                            isLast={index === displayedTasks.length - 1}
                        />
                    ))}
                </SortableContext>

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

function TaskItem({
    task,
    isSelected,
    onToggleSelection,
    isLast
}: {
    task: Task;
    isSelected: boolean;
    onToggleSelection: () => void;
    isLast: boolean;
}) {
    const { runTasks, cancelCurrentRun, updateTask, projectPath, setViewingLogsTaskId } = useProject();
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(task.title);
    const [editDescription, setEditDescription] = useState(task.description || '');
    const [editStartDate, setEditStartDate] = useState(task.startDate ? new Date(task.startDate).toISOString().slice(0, 16) : '');
    const [editWorkflowId, setEditWorkflowId] = useState(task.workflowId || '');
    const [editWorkflowMandatory, setEditWorkflowMandatory] = useState(task.workflowMandatory || false);
    const [editAgent, setEditAgent] = useState(task.agent || '');
    const [workflows, setWorkflows] = useState<Workflow[]>([]);

    // Overnight scheduling state
    const [isScheduling, setIsScheduling] = useState(false);

    React.useEffect(() => {
        if (projectPath && isEditing) {
            fetch(`/api/workflows?projectPath=${encodeURIComponent(projectPath)}`)
                .then(res => res.json())
                .then(data => setWorkflows(data))
                .catch(err => console.error(err));
        }
    }, [projectPath, isEditing]);

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

    const handleSave = async () => {
        if (editWorkflowMandatory && !editWorkflowId) {
            alert('Workflow is mandatory for this task. Please select a workflow.');
            return;
        }

        if (editTitle.trim()) {
            await updateTask(task.id, {
                title: editTitle,
                description: editDescription,
                startDate: editStartDate ? new Date(editStartDate).toISOString() : undefined,
                endDate: editStartDate ? new Date(new Date(editStartDate).getTime() + 60 * 60 * 1000).toISOString() : undefined,
                workflowId: editWorkflowId || undefined,
                workflowMandatory: editWorkflowMandatory,
                agent: editAgent || undefined,
            });
            setIsEditing(false);
        }
    };

    const handleScheduleOvernight = async () => {
        if (!editStartDate) {
            alert('Please set a start time before scheduling overnight.');
            return;
        }

        const scheduledTime = new Date(editStartDate);
        if (scheduledTime <= new Date()) {
            alert('Scheduled time must be in the future.');
            return;
        }

        const confirmed = window.confirm(
            `Schedule "${editTitle}" for overnight execution?\n\n` +
            `Time: ${scheduledTime.toLocaleString()}\n\n` +
            `• Your Mac will wake from sleep at this time\n` +
            `• The task runs regardless of whether Overknight is open\n` +
            `• You'll be prompted for your password to enable wake scheduling`
        );

        if (!confirmed) return;

        setIsScheduling(true);
        try {
            // First save the task
            await handleSave();

            // Then schedule via launchd
            const response = await fetch('/api/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taskId: task.id,
                    projectPath,
                    scheduledTime: scheduledTime.toISOString(),
                }),
            });

            const result = await response.json();

            if (!result.success && !result.warning) {
                throw new Error(result.error || 'Failed to schedule task');
            }

            if (result.warning) {
                alert(result.warning);
            } else {
                alert('Task scheduled successfully! Your Mac will wake at the scheduled time.');
            }

            setIsEditing(false);
        } catch (error) {
            alert(`Scheduling failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsScheduling(false);
        }
    };

    const startEditing = () => {
        setIsEditing(true);
        setEditTitle(task.title);
        setEditDescription(task.description || '');
        setEditWorkflowId(task.workflowId || '');
        setEditWorkflowMandatory(task.workflowMandatory || false);
        setEditStartDate(task.startDate ? new Date(task.startDate).toISOString().slice(0, 16) : '');
        setEditAgent(task.agent || '');
    };

    const canScheduleOvernight = editStartDate && new Date(editStartDate) > new Date();

    if (isEditing) {
        return (
            <div className="p-3 bg-gray-700/30 rounded-lg border border-gray-600/50 space-y-3">
                <input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm w-full focus:outline-none focus:border-indigo-500"
                    placeholder="Task Title"
                    autoFocus
                />
                <textarea
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs w-full min-h-[60px] focus:outline-none focus:border-indigo-500"
                    placeholder="Task Description"
                />
                <div className="flex gap-2 items-center">
                    <label className="text-gray-400 text-xs w-16 shrink-0">Start Time:</label>
                    <input
                        type="datetime-local"
                        value={editStartDate}
                        onChange={e => setEditStartDate(e.target.value)}
                        className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs w-full focus:outline-none focus:border-indigo-500"
                    />
                </div>
                <div className="flex gap-2 items-center">
                    <label className="text-gray-400 text-xs w-16 shrink-0">Workflow:</label>
                    <select
                        value={editWorkflowId}
                        onChange={e => setEditWorkflowId(e.target.value)}
                        className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs w-full focus:outline-none focus:border-indigo-500"
                    >
                        <option value="">Default Workflow</option>
                        {workflows.map(wf => (
                            <option key={wf.id} value={wf.id}>
                                {wf.title}{wf.isDefault ? ' (Default)' : ''}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex gap-2 items-center">
                    <label className="text-gray-400 text-xs w-16 shrink-0">Agent:</label>
                    <select
                        value={editAgent}
                        onChange={e => setEditAgent(e.target.value)}
                        className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs w-full focus:outline-none focus:border-indigo-500"
                    >
                        <option value="">Default Agent</option>
                        {DEFAULT_AGENTS.map(agent => (
                            <option key={agent.name} value={agent.name}>
                                {agent.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex gap-2 items-center">
                    <input
                        type="checkbox"
                        id={`workflowMandatory-${task.id}`}
                        checked={editWorkflowMandatory}
                        onChange={e => setEditWorkflowMandatory(e.target.checked)}
                        className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                    />
                    <label htmlFor={`workflowMandatory-${task.id}`} className="text-gray-400 text-xs">Workflow Mandatory</label>
                </div>
                <div className="flex gap-2 items-center justify-between">
                    <button
                        onClick={handleScheduleOvernight}
                        disabled={!canScheduleOvernight || isScheduling}
                        className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/20 text-amber-300 rounded text-xs hover:bg-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title={canScheduleOvernight ? 'Schedule for overnight execution' : 'Set a future start time first'}
                    >
                        🌙 {isScheduling ? 'Scheduling...' : 'Overnight'}
                    </button>
                    <div className="flex gap-2">
                        <button onClick={handleSave} className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30">Save</button>
                        <button onClick={() => setIsEditing(false)} className="px-2 py-1 bg-gray-700 text-gray-400 rounded text-xs hover:bg-gray-600">Cancel</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={setNodeRef} style={style}
            className={`flex flex-col gap-1 p-2 rounded-lg group transition-colors ${isSelected ? 'bg-indigo-500/10 border border-indigo-500/20' : 'hover:bg-white/5 border border-transparent'} relative`}
        >
            <div className="flex items-center gap-3">
                <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 -ml-2 text-gray-600 hover:text-gray-400 opacity-50 hover:opacity-100" title="Drag to reorder">
                    <GripVertical className="w-4 h-4" />
                </div>

                {/* Flow Arrow */}
                {!isLast && (
                    <div className="absolute left-[1.1rem] -bottom-3 z-10 text-gray-700 pointer-events-none opacity-50">
                        <ArrowDown className="w-3 h-3" />
                    </div>
                )}

                <div onClick={(e) => { e.stopPropagation(); onToggleSelection(); }} className="cursor-pointer z-20">
                    {isSelected ? (
                        <div className="w-4 h-4 bg-indigo-500 rounded flex items-center justify-center">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                    ) : (
                        <div className="w-4 h-4 border border-gray-600 rounded hover:border-gray-400 transition-colors" />
                    )}
                </div>
                <div onClick={(e) => {
                    e.stopPropagation();
                    let newStatus: Task['status'] = 'pending';
                    if (task.status === 'pending' || task.status === 'in-progress') newStatus = 'completed';
                    else if (task.status === 'completed') newStatus = 'failed';
                    else if (task.status === 'failed') newStatus = 'pending';

                    updateTask(task.id, {
                        status: newStatus,
                        completedAt: newStatus === 'completed' ? new Date().toISOString() : null
                    });
                }} className="cursor-pointer hover:scale-110 transition-transform">
                    <StatusIcon className={`w-4 h-4 ${statusColors[task.status]} ${task.status === 'in-progress' ? 'animate-spin' : ''}`} />
                </div>
                <span
                    onClick={startEditing}
                    className={`flex-1 text-sm cursor-pointer hover:text-indigo-400 transition-colors ${task.status === 'completed' ? 'text-gray-500 line-through decoration-gray-600' : ''}`}
                >
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
                        onClick={() => setViewingLogsTaskId(task.id)}
                        className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
                        title="Chat & Logs"
                    >
                        <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs text-gray-600 font-mono ml-2">{task.id}</span>
                </div>
            </div>
            {task.description && (
                <div className="pl-14 text-xs text-gray-500 line-clamp-2" onClick={startEditing}>
                    {task.description}
                </div>
            )}
        </div>
    );
}
