'use client';

import React, { useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { ProjectOnboardingModal } from './ProjectOnboardingModal';

export function ProjectSelector() {
    const { projectPath, setProjectPath, tasksData, error } = useProject();
    const [inputPath, setInputPath] = useState('');
    const [isLoadingPicker, setIsLoadingPicker] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputPath.trim()) setProjectPath(inputPath.trim());
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
                            <button onClick={() => setShowOnboarding(true)} type="button" className="mt-2 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 px-2 py-1 rounded">Initialize Project</button>
                        )}
                    </div>
                )}
            </form>

            <ProjectOnboardingModal
                isOpen={showOnboarding}
                initialPath={projectPath || inputPath}
                onClose={() => setShowOnboarding(false)}
            />
        </div>
    );
}
