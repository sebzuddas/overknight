'use client';

import React, { useState } from 'react';
import { FolderOpen, Settings, Terminal, Play } from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { DEFAULT_AGENTS, AgentConfig } from '@/lib/types';
import { AgentConfigSchema } from '@/lib/schemas';

export function ProjectSelector() {
    const { projectPath, setProjectPath, initializeProject, tasksData, error } = useProject();
    const [inputPath, setInputPath] = useState('');
    const [isLoadingPicker, setIsLoadingPicker] = useState(false);

    // Init Form State
    const [showInitForm, setShowInitForm] = useState(false);
    const [initAgent, setInitAgent] = useState<AgentConfig>(DEFAULT_AGENTS[0]);
    const [customCommand, setCustomCommand] = useState('');
    const [validationError, setValidationError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputPath.trim()) setProjectPath(inputPath.trim());
    };

    const handleInit = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError(null);

        let finalAgent = initAgent;
        if (initAgent.name === 'Custom') {
            finalAgent = { ...initAgent, command: customCommand };
        }

        // Zod Validation
        try {
            AgentConfigSchema.parse(finalAgent);
            if (projectPath) {
                await initializeProject(projectPath.split('/').pop() || 'New Project', finalAgent);
                setShowInitForm(false);
            }
        } catch (err) {
            if (err instanceof Error) setValidationError(err.message);
            else setValidationError('Invalid configuration');
        }
    };

    const handleBrowse = async () => {
        setIsLoadingPicker(true);
        try {
            const res = await fetch('/api/system/browse', { method: 'POST' });
            const data = await res.json();
            if (data.path) {
                setInputPath(data.path);
                setProjectPath(data.path);
            }
        } catch (err) {
            console.error('Failed to browse:', err);
        } finally {
            setIsLoadingPicker(false);
        }
    };

    if (projectPath && tasksData) return (
        <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
            <div className="flex items-center gap-2 mb-2 text-xs text-gray-500 uppercase tracking-wider">
                <FolderOpen className="w-3 h-3" />
                Current Project
            </div>
            <div className="font-medium truncate" title={projectPath}>{tasksData.project.name}</div>
            <div className="text-xs text-gray-500 truncate mt-1">{projectPath}</div>
            <button onClick={() => setProjectPath('')} className="mt-3 text-xs text-indigo-400 hover:text-indigo-300">Change Project</button>
        </div>
    );

    if (showInitForm && projectPath) return (
        <div className="p-6 bg-gray-800/30 rounded-xl border border-gray-700/50">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Configure New Project
            </h3>
            <div className="text-sm text-gray-400 mb-4">
                Initialize <strong>{projectPath.split('/').pop()}</strong> for OverKnight.
            </div>

            <form onSubmit={handleInit} className="space-y-4">
                <div>
                    <label className="text-xs text-gray-400 block mb-1">Terminal Agent</label>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        {DEFAULT_AGENTS.map(agent => (
                            <button
                                key={agent.name}
                                type="button"
                                onClick={() => { setInitAgent(agent); if (agent.name !== 'Custom') setCustomCommand(''); }}
                                className={`p-2 text-left rounded-lg text-sm border transition-colors ${initAgent.name === agent.name
                                        ? 'bg-indigo-500/20 border-indigo-500 text-indigo-200'
                                        : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                                    }`}
                            >
                                <div className="font-medium">{agent.name}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {(initAgent.name === 'Custom' || true) && (
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">
                            Agent Command
                            {initAgent.name !== 'Custom' && <span className="ml-2 opacity-50 text-xs">(Editable)</span>}
                        </label>
                        <div className="flex items-center gap-2 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2">
                            <Terminal className="w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                value={initAgent.name === 'Custom' ? customCommand : initAgent.command}
                                onChange={(e) => {
                                    if (initAgent.name === 'Custom') setCustomCommand(e.target.value);
                                    else setInitAgent({ ...initAgent, command: e.target.value });
                                }}
                                placeholder="e.g. claude -p '{{prompt}}'"
                                className="flex-1 bg-transparent text-sm focus:outline-none font-mono text-indigo-300"
                            />
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">Must include <code>{'{{prompt}}'}</code> placeholder.</p>
                    </div>
                )}

                {validationError && (
                    <div className="text-red-400 text-xs p-2 bg-red-500/10 rounded border border-red-500/20">
                        {validationError}
                    </div>
                )}

                <div className="flex gap-2 pt-2">
                    <button
                        type="button"
                        onClick={() => setShowInitForm(false)}
                        className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                    >
                        Back
                    </button>
                    <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <Play className="w-3 h-3" /> Initialize Project
                    </button>
                </div>
            </form>
        </div>
    );

    return (
        <div className="p-6 bg-gray-800/30 rounded-xl border border-gray-700/50">
            <h3 className="font-semibold mb-4">Select Project</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                    <label className="text-xs text-gray-400 block mb-1">Project Path</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={inputPath || projectPath || ''}
                            onChange={(e) => setInputPath(e.target.value)}
                            placeholder="/Users/username/projects/my-app"
                            className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                        />
                        <button
                            type="button"
                            onClick={handleBrowse}
                            disabled={isLoadingPicker}
                            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors disabled:opacity-50"
                        >
                            {isLoadingPicker ? '...' : 'Browse'}
                        </button>
                    </div>
                </div>
                <button type="submit" className="w-full px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-sm font-medium transition-colors">
                    Open Project
                </button>
                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-xs text-red-400">{error}</p>
                        {error.includes('Project not initialized') && (
                            <button onClick={() => setShowInitForm(true)} type="button" className="mt-2 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 px-2 py-1 rounded">Initialize Project</button>
                        )}
                    </div>
                )}
            </form>
        </div>
    );
}
