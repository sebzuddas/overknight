'use client';

import React, { useState, useEffect } from 'react';
import { GitBranch, GitCommit, RotateCcw, ChevronRight } from 'lucide-react';
import { useProject } from '@/context/ProjectContext';

interface Commit { hash: string; date: string; message: string; author: string; }
interface Branch { name: string; current: boolean; commit: string; }

export function GitHistory() {
    const { projectPath, isRunning } = useProject();
    const [commits, setCommits] = useState<Commit[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [currentBranch, setCurrentBranch] = useState<string>('');
    const [isRepo, setIsRepo] = useState(true);

    const fetchData = React.useCallback(async () => {
        if (!projectPath) return;
        try {
            const statusRes = await fetch(`/api/git?projectPath=${encodeURIComponent(projectPath)}&action=status`);
            const statusData = await statusRes.json();
            if (!statusData.isRepo) { setIsRepo(false); return; }
            setIsRepo(true);
            setCurrentBranch(statusData.branch || '');

            const branchRes = await fetch(`/api/git?projectPath=${encodeURIComponent(projectPath)}&action=branches`);
            setBranches((await branchRes.json()).branches || []);

            const commitRes = await fetch(`/api/git?projectPath=${encodeURIComponent(projectPath)}&action=commits&count=10`);
            setCommits((await commitRes.json()).commits || []);
        } catch (err) { console.error(err); }
    }, [projectPath, setIsRepo, setCurrentBranch, setBranches, setCommits]); // Added all state setters as dependencies

    useEffect(() => {
        // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [fetchData, projectPath, isRunning]); // Added fetchData to dependencies

    const handleCheckout = async (branchName: string) => {
        if (!projectPath) return;
        await fetch(`/api/git?projectPath=${encodeURIComponent(projectPath)}`, { method: 'POST', body: JSON.stringify({ action: 'checkout', data: { branchName } }) });
        fetchData();
    };

    const handleInitGit = async () => {
        if (!projectPath) return;
        await fetch(`/api/git?projectPath=${encodeURIComponent(projectPath)}`, { method: 'POST', body: JSON.stringify({ action: 'init', data: {} }) });
        fetchData();
    };

    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });

    if (!isRepo) return (
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl border border-gray-700/50 p-6">
            <div className="flex items-center gap-3 mb-4"><GitBranch className="w-5 h-5 text-orange-400" /><h2 className="font-semibold">Git</h2></div>
            <p className="text-sm text-gray-400 mb-4">Not a git repository.</p>
            <button onClick={handleInitGit} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-sm font-medium">Initialize Git Repository</button>
        </div>
    );

    return (
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl border border-gray-700/50 p-6">
            <div className="flex items-center gap-3 mb-4">
                <GitBranch className="w-5 h-5 text-orange-400" />
                <h2 className="font-semibold">Git History</h2>
                <span className="text-xs text-gray-400 bg-gray-700/50 px-2 py-0.5 rounded">{currentBranch}</span>
            </div>

            <div className="space-y-2">
                <h3 className="text-xs text-gray-400 uppercase tracking-wider">Recent Commits</h3>
                {commits.length === 0 ? <p className="text-sm text-gray-500">No commits yet</p> : commits.slice(0, 5).map(commit => (
                    <div key={commit.hash} className="group flex items-start gap-3 p-2 hover:bg-white/5 rounded-lg">
                        <GitCommit className="w-4 h-4 text-gray-500 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{commit.message}</p>
                            <p className="text-xs text-gray-500">{commit.hash.slice(0, 7)} • {formatDate(commit.date)}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
