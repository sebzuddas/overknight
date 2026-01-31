'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Task, Workflow, DEFAULT_AGENTS } from '@/lib/types';
import { useProject } from '@/context/ProjectContext';

interface TaskEditModalProps {
    task: Task;
    isOpen: boolean;
    onClose: () => void;
    onSave: (taskId: string, updates: Partial<Task>) => Promise<void>;
}

export function TaskEditModal({ task, isOpen, onClose, onSave }: TaskEditModalProps) {
    const { projectPath } = useProject();
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || '');
    const [startDate, setStartDate] = useState(task.startDate ? new Date(task.startDate).toISOString().slice(0, 16) : '');
    const [workflowId, setWorkflowId] = useState(task.workflowId || '');
    const [workflowMandatory, setWorkflowMandatory] = useState(task.workflowMandatory || false);
    const [agent, setAgent] = useState(task.agent || '');
    const [workflows, setWorkflows] = useState<Workflow[]>([]);

    useEffect(() => {
        if (projectPath && isOpen) {
            fetch(`/api/workflows?projectPath=${encodeURIComponent(projectPath)}`)
                .then(res => res.json())
                .then(data => setWorkflows(data))
                .catch(err => console.error(err));
        }
    }, [projectPath, isOpen]);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (workflowMandatory && !workflowId) {
            alert('Workflow is mandatory for this task. Please select a workflow.');
            return;
        }

        await onSave(task.id, {
            title,
            description,
            startDate: startDate ? new Date(startDate).toISOString() : undefined,
            endDate: startDate ? new Date(new Date(startDate).getTime() + 60 * 60 * 1000).toISOString() : undefined,
            workflowId: workflowId || undefined,
            workflowMandatory,
            agent: agent || undefined,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-950/50">
                    <h3 className="font-semibold text-lg text-gray-200">Edit Task</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Title</label>
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                            placeholder="Task Title"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors min-h-[100px]"
                            placeholder="Task Description"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Start Time</label>
                            <input
                                type="datetime-local"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Agent</label>
                            <select
                                value={agent}
                                onChange={e => setAgent(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors appearance-none"
                            >
                                <option value="">Default Agent</option>
                                {DEFAULT_AGENTS.map(a => (
                                    <option key={a.name} value={a.name}>{a.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Workflow</label>
                        <select
                            value={workflowId}
                            onChange={e => setWorkflowId(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors appearance-none"
                        >
                            <option value="">Default Workflow</option>
                            {workflows.map(wf => (
                                <option key={wf.id} value={wf.id}>
                                    {wf.title}{wf.isDefault ? ' (Default)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="workflowMandatory"
                            checked={workflowMandatory}
                            onChange={e => setWorkflowMandatory(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-indigo-500"
                        />
                        <label htmlFor="workflowMandatory" className="text-sm text-gray-400">Workflow Mandatory</label>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800 bg-gray-950/30">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20">Save Changes</button>
                </div>
            </div>
        </div>
    );
}
