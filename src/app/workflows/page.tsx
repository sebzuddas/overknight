'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useProject } from '@/context/ProjectContext';
import { Workflow, WorkflowStep, DEFAULT_AGENTS } from '@/lib/types';
import { Plus, Trash2, Save, Edit, GripVertical } from 'lucide-react';

const DEFAULT_STEPS: WorkflowStep[] = [
    { id: 'step-1', name: 'New Step', prompt: '', enabled: true }
];

export default function WorkflowsPage() {
    const { projectPath } = useProject();
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Initial load
    const loadWorkflows = useCallback(async () => {
        if (!projectPath) return;
        try {
            const res = await fetch(`/api/workflows?projectPath=${encodeURIComponent(projectPath)}`);
            if (res.ok) {
                const data = await res.json();
                setWorkflows(data);
                // If currently editing a workflow that was updated, update local state? 
                // Usually just reloading list is fine.
            }
        } catch (error) {
            console.error('Failed to load workflows', error);
        }
    }, [projectPath]);

    // Initial load
    useEffect(() => {
        if (projectPath) {
            loadWorkflows();
        }
    }, [projectPath, loadWorkflows]);

    const handleCreate = () => {
        const newWorkflow: Workflow = {
            id: crypto.randomUUID(),
            title: 'New Workflow',
            description: '',
            steps: [...DEFAULT_STEPS],
            agentCommand: 'gemini -p "{{prompt}}" --yolo',
            workingDirectory: projectPath || '',
            permissions: { allowShell: true, allowGit: true, requireApproval: false },
            isDefault: false
        };
        setSelectedWorkflow(newWorkflow);
        setIsEditing(true);
    };

    const handleSave = async () => {
        if (!selectedWorkflow || !projectPath) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/workflows?projectPath=${encodeURIComponent(projectPath)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(selectedWorkflow)
            });

            if (res.ok) {
                await loadWorkflows();
                setIsEditing(false);
                setSelectedWorkflow(null); // Return to list view or stay in edit? Let's return to list.
            }
        } catch (error) {
            console.error('Failed to save workflow', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this workflow?') || !projectPath) return;

        try {
            const res = await fetch(`/api/workflows?projectPath=${encodeURIComponent(projectPath)}&workflowId=${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                loadWorkflows();
                if (selectedWorkflow?.id === id) {
                    setSelectedWorkflow(null);
                    setIsEditing(false);
                }
            }
        } catch (error) {
            console.error('Failed to delete', error);
        }
    };

    const updateStep = (index: number, field: keyof WorkflowStep, value: WorkflowStep[keyof WorkflowStep]) => {
        if (!selectedWorkflow) return;
        const newSteps = [...selectedWorkflow.steps];
        newSteps[index] = { ...newSteps[index], [field]: value };
        setSelectedWorkflow({ ...selectedWorkflow, steps: newSteps });
    };

    const addStep = () => {
        if (!selectedWorkflow) return;
        const newStep: WorkflowStep = {
            id: crypto.randomUUID(),
            name: 'New Step',
            prompt: '',
            enabled: true
        };
        setSelectedWorkflow({
            ...selectedWorkflow,
            steps: [...selectedWorkflow.steps, newStep]
        });
    };

    const removeStep = (index: number) => {
        if (!selectedWorkflow) return;
        const newSteps = selectedWorkflow.steps.filter((_, i) => i !== index);
        setSelectedWorkflow({ ...selectedWorkflow, steps: newSteps });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!selectedWorkflow || !over || active.id === over.id) return;

        const oldIndex = selectedWorkflow.steps.findIndex(s => s.id === active.id);
        const newIndex = selectedWorkflow.steps.findIndex(s => s.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
            const newSteps = arrayMove(selectedWorkflow.steps, oldIndex, newIndex);
            setSelectedWorkflow({ ...selectedWorkflow, steps: newSteps });
        }
    };

    if (!projectPath) return <div className="p-8 text-center text-gray-500">Please select a project</div>;

    return (
        <div className="flex h-screen bg-black text-gray-200">
            {/* Sidebar list */}
            <div className="w-64 border-r border-gray-800 flex flex-col">
                <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                    <h2 className="font-semibold text-white">Workflows</h2>
                    <button onClick={handleCreate} className="p-1 hover:bg-gray-800 rounded">
                        <Plus className="w-4 h-4 text-indigo-400" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {workflows.map(wf => (
                        <div
                            key={wf.id}
                            onClick={() => { setSelectedWorkflow(wf); setIsEditing(true); }}
                            className={`p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-900 transition-colors ${selectedWorkflow?.id === wf.id ? 'bg-gray-900 border-l-2 border-indigo-500' : ''}`}
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="font-medium text-sm text-gray-200">{wf.title}</div>
                                    <div className="text-xs text-gray-500 truncate mt-1">{wf.description || 'No description'}</div>
                                    {wf.isDefault && <span className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded mt-2 inline-block">Default</span>}
                                </div>
                                {!wf.isDefault && (
                                    <button onClick={(e) => handleDelete(e, wf.id)} className="text-gray-600 hover:text-red-400">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {selectedWorkflow && isEditing ? (
                    <div className="flex flex-col h-full">
                        {/* Header */}
                        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
                            <div className="flex-1 max-w-2xl">
                                <input
                                    value={selectedWorkflow.title}
                                    onChange={(e) => setSelectedWorkflow({ ...selectedWorkflow, title: e.target.value })}
                                    className="bg-transparent text-lg font-semibold text-white focus:outline-none w-full mb-1"
                                    placeholder="Workflow Title"
                                />
                                <input
                                    value={selectedWorkflow.description || ''}
                                    onChange={(e) => setSelectedWorkflow({ ...selectedWorkflow, description: e.target.value })}
                                    className="bg-transparent text-sm text-gray-400 focus:outline-none w-full"
                                    placeholder="Description..."
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 mr-4">
                                    <label className="text-xs text-gray-400 flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={selectedWorkflow.isDefault || false}
                                            onChange={(e) => setSelectedWorkflow({ ...selectedWorkflow, isDefault: e.target.checked })}
                                            className="rounded bg-gray-800 border-gray-700"
                                        />
                                        Set as Default
                                    </label>
                                </div>
                                <button
                                    onClick={handleSave}
                                    disabled={isLoading}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition-colors"
                                >
                                    <Save className="w-4 h-4" />
                                    {isLoading ? 'Saving...' : 'Save Workflow'}
                                </button>
                            </div>
                        </div>

                        {/* Steps Editor */}
                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="max-w-4xl mx-auto space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Workflow Steps</h3>
                                    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                        <SortableContext items={selectedWorkflow.steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
                                            {selectedWorkflow.steps.map((step, index) => (
                                                <SortableStepItem
                                                    key={step.id}
                                                    step={step}
                                                    index={index}
                                                    updateStep={updateStep}
                                                    removeStep={removeStep}
                                                />
                                            ))}
                                        </SortableContext>
                                    </DndContext>

                                    <button
                                        onClick={addStep}
                                        className="w-full py-3 border-2 border-dashed border-gray-800 hover:border-gray-700 rounded-lg text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Step
                                    </button>
                                </div>

                                <div className="pt-8 border-t border-gray-800 space-y-4">
                                    <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Configuration</h3>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Agent Command</label>
                                            <input
                                                value={selectedWorkflow.agentCommand}
                                                onChange={(e) => setSelectedWorkflow({ ...selectedWorkflow, agentCommand: e.target.value })}
                                                className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-sm text-gray-300 focus:border-indigo-500 focus:outline-none font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Working Directory</label>
                                            <input
                                                value={selectedWorkflow.workingDirectory}
                                                onChange={(e) => setSelectedWorkflow({ ...selectedWorkflow, workingDirectory: e.target.value })}
                                                className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-sm text-gray-300 focus:border-indigo-500 focus:outline-none font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                        <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mb-4">
                            <Edit className="w-8 h-8 text-gray-600" />
                        </div>
                        <p>Select a workflow to edit or create a new one</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function SortableStepItem({
    step,
    index,
    updateStep,
    removeStep
}: {
    step: WorkflowStep;
    index: number;
    updateStep: (index: number, field: keyof WorkflowStep, value: WorkflowStep[keyof WorkflowStep]) => void;
    removeStep: (index: number) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: step.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1000 : 1,
        position: 'relative' as const,
    };

    return (
        <div ref={setNodeRef} style={style} className="bg-gray-900 border border-gray-800 rounded-lg p-4 relative group">
            <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                <button onClick={() => removeStep(index)} className="text-gray-500 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            <div className="grid gap-4">
                <div className="flex items-center gap-4">
                    <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400">
                        <GripVertical className="w-5 h-5" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-sm font-medium text-gray-400">
                        {index + 1}
                    </div>
                    <input
                        value={step.name}
                        onChange={(e) => updateStep(index, 'name', e.target.value)}
                        className="flex-1 bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-none py-1 font-medium text-gray-200"
                        placeholder="Step Name"
                    />
                </div>

                <div className="pl-16">
                    <textarea
                        value={step.prompt}
                        onChange={(e) => updateStep(index, 'prompt', e.target.value)}
                        className="w-full h-24 bg-black border border-gray-800 rounded p-3 text-sm text-gray-300 focus:border-indigo-500 focus:outline-none font-mono"
                        placeholder="Enter prompt for this step..."
                    />
                </div>

                <div className="pl-16 grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Step Agent</label>
                        <select
                            value={step.agentId || ''}
                            onChange={(e) => updateStep(index, 'agentId', e.target.value || undefined)}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-300 focus:border-indigo-500 focus:outline-none"
                        >
                            <option value="">Default (Workflow/System)</option>
                            {DEFAULT_AGENTS.map(agent => (
                                <option key={agent.name} value={agent.name}>{agent.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Required Skill</label>
                        <input
                            value={step.skill || ''}
                            onChange={(e) => updateStep(index, 'skill', e.target.value || undefined)}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-300 focus:border-indigo-500 focus:outline-none"
                            placeholder="e.g. typescript, python..."
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">MCP ID</label>
                        <input
                            value={step.mcpId || ''}
                            onChange={(e) => updateStep(index, 'mcpId', e.target.value || undefined)}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-300 focus:border-indigo-500 focus:outline-none"
                            placeholder="Optional MCP ID"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
