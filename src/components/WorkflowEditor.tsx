'use client';

import React, { useState, useEffect } from 'react';
import { Settings, GripVertical, Plus, Trash2, ToggleLeft, ToggleRight, Terminal, Shield } from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import type { WorkflowStep } from '@/lib/types';

const DEFAULT_AGENTS = [
    { name: 'Claude Code', command: 'claude -p "{{prompt}}"', description: 'Anthropic Claude Code CLI' },
    { name: 'Gemini CLI', command: 'gemini -p "{{prompt}}"', description: 'Google Gemini CLI' },
    { name: 'Cursor', command: 'cursor --agent "{{prompt}}"', description: 'Cursor IDE Agent' },
    { name: 'Custom', command: '', description: 'Custom agent command' },
];

export function WorkflowEditor() {
    const { projectPath, workflow, refreshWorkflow } = useProject();
    const [steps, setSteps] = useState<WorkflowStep[]>([]);
    const [agentCommand, setAgentCommand] = useState('');
    const [selectedAgent, setSelectedAgent] = useState('Claude Code');
    const [editingStep, setEditingStep] = useState<string | null>(null);
    const [isAddingStep, setIsAddingStep] = useState(false);
    const [newStepName, setNewStepName] = useState('');
    const [newStepPrompt, setNewStepPrompt] = useState('');

    const [permissions, setPermissions] = useState({ allowShell: true, allowGit: true, requireApproval: false });

    useEffect(() => {
        if (workflow) {
            if (JSON.stringify(steps) !== JSON.stringify(workflow.steps)) {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setSteps(workflow.steps);
            }
            if (agentCommand !== workflow.agentCommand) {
                setAgentCommand(workflow.agentCommand);
            }
            if (workflow.permissions && JSON.stringify(permissions) !== JSON.stringify(workflow.permissions)) {
                setPermissions(workflow.permissions);
            }
            const agent = DEFAULT_AGENTS.find(a => a.command === workflow.agentCommand);
            if (selectedAgent !== (agent?.name || 'Custom')) {
                setSelectedAgent(agent?.name || 'Custom');
            }
        }
    }, [workflow, steps, agentCommand, permissions, selectedAgent]);

    const handleSave = async () => {
        if (!projectPath) return; // Note: simplified error handling for restore
        try {
            await fetch(`/api/workflow?projectPath=${encodeURIComponent(projectPath)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update', data: { steps, agentCommand, workingDirectory: projectPath, permissions } }),
            });
            await refreshWorkflow();
        } catch (err) { console.error(err); }
    };

    const handleToggleStep = (stepId: string) => setSteps(steps.map(s => s.id === stepId ? { ...s, enabled: !s.enabled } : s));
    const handleUpdateStepPrompt = (stepId: string, prompt: string) => setSteps(steps.map(s => s.id === stepId ? { ...s, prompt } : s));

    const handleAddStep = () => {
        if (!newStepName.trim()) return;
        setSteps([...steps, { id: `step-${Date.now()}`, name: newStepName.trim(), prompt: newStepPrompt.trim() || 'Add your prompt here...', enabled: true }]);
        setNewStepName(''); setNewStepPrompt(''); setIsAddingStep(false);
    };

    const handleRemoveStep = (stepId: string) => setSteps(steps.filter(s => s.id !== stepId));
    const handleAgentChange = (agentName: string) => {
        setSelectedAgent(agentName);
        const agent = DEFAULT_AGENTS.find(a => a.name === agentName);
        if (agent?.command) setAgentCommand(agent.command);
    };

    return (
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl border border-gray-700/50 p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3"><Settings className="w-5 h-5 text-green-400" /><h2 className="font-semibold">Workflow Configuration</h2></div>
                <button onClick={handleSave} className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-sm font-medium">Save Changes</button>
            </div>

            <div className="mb-6 p-4 bg-gray-900/50 rounded-lg">
                <div className="flex items-center gap-2 mb-3"><Terminal className="w-4 h-4 text-gray-400" /><h3 className="text-sm font-medium">Agent CLI</h3></div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                    {DEFAULT_AGENTS.map(agent => (
                        <button key={agent.name} onClick={() => handleAgentChange(agent.name)} className={`p-2 text-left text-sm rounded-lg border transition-all ${selectedAgent === agent.name ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-gray-800/50 border-gray-700'}`}>
                            <div className="font-medium">{agent.name}</div><div className="text-xs text-gray-500">{agent.description}</div>
                        </button>
                    ))}
                </div>
                <input type="text" value={agentCommand} onChange={e => setAgentCommand(e.target.value)} placeholder='Command template' className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm font-mono" />

                <div className="mt-4 pt-4 border-t border-gray-700/50">
                    <div className="flex items-center gap-2 mb-3">
                        <Shield className="w-4 h-4 text-gray-400" />
                        <h3 className="text-sm font-medium">Permissions</h3>
                    </div>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={permissions.allowShell}
                                onChange={e => setPermissions({ ...permissions, allowShell: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-indigo-500"
                            />
                            Allow Shell Commands
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={permissions.allowGit}
                                onChange={e => setPermissions({ ...permissions, allowGit: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-indigo-500"
                            />
                            Allow Git Operations
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={permissions.requireApproval}
                                onChange={e => setPermissions({ ...permissions, requireApproval: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-indigo-500"
                            />
                            Require Approval
                        </label>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-400">Workflow Steps</h3>
                {steps.map((step, index) => (
                    <div key={step.id} className={`p-4 rounded-lg border ${step.enabled ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-900/50 border-gray-800 opacity-50'}`}>
                        <div className="flex items-center gap-3">
                            <GripVertical className="w-4 h-4 text-gray-500 cursor-grab" />
                            <span className="text-xs text-gray-500 w-6">{index + 1}.</span>
                            <button onClick={() => handleToggleStep(step.id)} className="text-indigo-400">{step.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5 text-gray-500" />}</button>
                            <span className="flex-1 font-medium">{step.name}</span>
                            <button onClick={() => setEditingStep(editingStep === step.id ? null : step.id)} className="text-xs text-gray-400 hover:text-white">{editingStep === step.id ? 'Close' : 'Edit'}</button>
                            <button onClick={() => handleRemoveStep(step.id)} className="p-1 hover:bg-red-500/20 rounded"><Trash2 className="w-4 h-4 text-red-400" /></button>
                        </div>
                        {editingStep === step.id && <div className="mt-3"><textarea value={step.prompt} onChange={e => handleUpdateStepPrompt(step.id, e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm font-mono" rows={4} /></div>}
                    </div>
                ))}
                {isAddingStep ? (
                    <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 space-y-3">
                        <input value={newStepName} onChange={e => setNewStepName(e.target.value)} placeholder="Step name" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm" autoFocus />
                        <div className="flex gap-2"><button onClick={handleAddStep} className="px-3 py-1.5 bg-indigo-500 rounded-lg text-sm">Add</button><button onClick={() => setIsAddingStep(false)} className="px-3 py-1.5 bg-gray-700 rounded-lg text-sm">Cancel</button></div>
                    </div>
                ) : (
                    <button onClick={() => setIsAddingStep(true)} className="flex items-center gap-2 w-full p-3 text-gray-400 hover:text-white border border-dashed border-gray-700 rounded-lg"><Plus className="w-4 h-4" /><span className="text-sm">Add Step</span></button>
                )}
            </div>
        </div>
    );
}
