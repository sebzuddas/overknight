'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Terminal, Play, FolderOpen, ArrowRight } from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { DEFAULT_AGENTS, AgentConfig } from '@/lib/types';
import { AgentConfigSchema } from '@/lib/schemas';

import { createPortal } from 'react-dom';

interface ProjectOnboardingModalProps {
    isOpen: boolean;
    initialPath?: string;
    onClose: () => void;
}

export function ProjectOnboardingModal({ isOpen, initialPath = '', onClose }: ProjectOnboardingModalProps) {
    const { initializeProject, setProjectPath } = useProject();
    const [mounted, setMounted] = useState(false);

    // Step state: 0 = Select Path, 1 = Configure Agent
    const [step, setStep] = useState(0);

    // Initialize path state with initialPath, but allow updates
    const [path, setPath] = useState(initialPath);

    const [isLoadingPicker, setIsLoadingPicker] = useState(false);

    const [initAgent, setInitAgent] = useState<AgentConfig>(DEFAULT_AGENTS[0]);
    const [customCommand, setCustomCommand] = useState('');
    const [validationError, setValidationError] = useState<string | null>(null);
    const [isInitializing, setIsInitializing] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Update internal path if initialPath changes (e.g. from parent)
    React.useEffect(() => {
        if (initialPath) setPath(initialPath);
    }, [initialPath]);

    if (!isOpen || !mounted) return null;

    const handleBrowse = async () => {
        setIsLoadingPicker(true);
        try {
            const res = await fetch('/api/system/browse', { method: 'POST' });
            const data = await res.json();
            if (data.path) {
                setPath(data.path);
            }
        } catch (err) {
            console.error('Failed to browse:', err);
        } finally {
            setIsLoadingPicker(false);
        }
    };

    const handleNext = () => {
        if (path) {
            setStep(1);
        }
    };

    const handleInit = async () => {
        setValidationError(null);
        setIsInitializing(true);

        let finalAgent = initAgent;
        if (initAgent.name === 'Custom') {
            finalAgent = { ...initAgent, command: customCommand };
        }

        try {
            AgentConfigSchema.parse(finalAgent);
            if (path) {
                const projectName = path.split('/').pop() || 'New Project';
                // Initialize logic
                await initializeProject(projectName, finalAgent);

                // IMPORTANT: Ensure we set the project path in context so the UI updates
                setProjectPath(path);

                onClose();
            }
        } catch (err) {
            console.error("Initialization error:", err);
            if (err instanceof Error) setValidationError(err.message);
            else setValidationError('Invalid configuration');
        } finally {
            setIsInitializing(false);
        }
    };

    const handleBack = () => {
        setStep(Math.max(0, step - 1));
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center font-sans">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            {/* Modal Content */}
            <div className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col relative z-10 max-h-[90vh]">

                {/* Header */}
                <div className="p-8 border-b border-gray-800 bg-gray-950/50 rounded-t-2xl">
                    <div className="flex items-center gap-4 mb-2">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${step === 0 ? 'bg-indigo-500 text-white' : 'bg-green-500 text-white'}`}>
                            {step === 0 ? <FolderOpen className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">
                                {step === 0 ? 'Select Project' : 'Configure Agent'}
                            </h2>
                            <p className="text-gray-400">
                                {step === 0
                                    ? "Choose a folder to initialize with OverKnight."
                                    : "Select the terminal agent available on your system."}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-8 space-y-8 flex-1 overflow-y-auto">
                    {step === 0 && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Project Directory</label>
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        value={path}
                                        onChange={(e) => setPath(e.target.value)}
                                        placeholder="/path/to/project"
                                        className="flex-1 bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-indigo-300"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleBrowse}
                                        disabled={isLoadingPicker}
                                        className="px-5 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 text-gray-200"
                                    >
                                        <FolderOpen className="w-4 h-4" /> Browse
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    Select an existing directory. OverKnight will verify if it&apos;s a valid project.
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-8">
                            <div>
                                <label className="text-sm font-medium text-gray-300 block mb-4">Available Agents</label>
                                <div className="grid grid-cols-2 gap-4">
                                    {DEFAULT_AGENTS.map(agent => (
                                        <button
                                            key={agent.name}
                                            type="button"
                                            onClick={() => { setInitAgent(agent); if (agent.name !== 'Custom') setCustomCommand(''); }}
                                            className={`p-4 text-left rounded-xl border transition-all relative overflow-hidden group ${initAgent.name === agent.name
                                                ? 'bg-indigo-500/10 border-indigo-500 text-indigo-100 ring-1 ring-indigo-500/50'
                                                : 'bg-gray-800/30 border-gray-700 hover:bg-gray-800/50 hover:border-gray-600 text-gray-300'
                                                }`}
                                        >
                                            <div className="font-semibold mb-1">{agent.name}</div>
                                            <div className="text-xs text-gray-500">{agent.description}</div>
                                            {initAgent.name === agent.name && (
                                                <div className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-5 bg-black/40 rounded-xl border border-gray-800">
                                <label className="text-xs font-mono text-gray-500 block mb-2 uppercase tracking-wide">
                                    Command Configuration
                                </label>
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-gray-800 rounded">
                                        <Terminal className="w-4 h-4 text-gray-400" />
                                    </div>
                                    <div className="flex-1 font-mono text-sm">
                                        {initAgent.name === 'Custom' ? (
                                            <input
                                                type="text"
                                                value={customCommand}
                                                onChange={(e) => setCustomCommand(e.target.value)}
                                                placeholder="e.g. claude -p '{{prompt}}'"
                                                className="w-full bg-transparent text-indigo-300 focus:outline-none border-b border-dashed border-gray-700 focus:border-indigo-500 pb-1 placeholder-gray-600"
                                            />
                                        ) : (
                                            <span className="text-indigo-300">{initAgent.command}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-500">
                                    <span>Variables:</span>
                                    <code className="px-1 py-0.5 bg-gray-800 rounded text-gray-300">{'{{prompt}}'}</code>
                                </div>
                            </div>
                        </div>
                    )}

                    {validationError && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300 flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2" />
                            {validationError}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-gray-800 bg-gray-950/50 flex justify-end gap-3 rounded-b-2xl">
                    {step > 0 && (
                        <button
                            type="button"
                            onClick={handleBack}
                            disabled={isInitializing}
                            className="px-6 py-3 text-gray-400 hover:text-white transition-colors text-sm font-medium hover:bg-white/5 rounded-xl disabled:opacity-50"
                        >
                            Back
                        </button>
                    )}

                    {step === 0 ? (
                        <button
                            type="button"
                            onClick={handleNext}
                            disabled={!path}
                            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-900/20 hover:shadow-indigo-900/40 flex items-center gap-2"
                        >
                            Next Step <ArrowRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleInit}
                            disabled={isInitializing}
                            className="px-8 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-green-900/20 hover:shadow-green-900/40 flex items-center gap-2"
                        >
                            {isInitializing ? (
                                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Initializing...</>
                            ) : (
                                <><Play className="w-4 h-4 fill-current" /> Initialize Project</>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
