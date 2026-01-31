
import React, { useState, useEffect } from 'react';
import { X, GitMerge, AlertTriangle, Loader2, FileDiff } from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import type { Task } from '@/lib/types';

interface MergeModalProps {
    task: Task;
    onClose: () => void;
    onMergeComplete: () => void;
}

export function MergeModal({ task, onClose, onMergeComplete }: MergeModalProps) {
    const { projectPath } = useProject();
    const [diff, setDiff] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [merging, setMerging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<{ canMerge: boolean; behind?: number; ahead?: number } | null>(null);

    useEffect(() => {
        if (!projectPath || !task.branch) return;

        const fetchData = async () => {
            try {
                setLoading(true);
                // Fetch Diff
                const diffRes = await fetch(`/api/git?projectPath=${encodeURIComponent(projectPath!)}&action=diff&branch=${encodeURIComponent(task.branch!)}`);
                const diffData = await diffRes.json();
                setDiff(diffData.diff || 'No changes detected.');

                // Fetch Status
                const statusRes = await fetch(`/api/git?projectPath=${encodeURIComponent(projectPath!)}&action=mergeStatus&branch=${encodeURIComponent(task.branch!)}`);
                setStatus((await statusRes.json()).status);
            } catch (err) {
                setError('Failed to load merge details.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [projectPath, task.branch]);

    const handleMerge = async () => {
        if (!projectPath || !task.branch) return;
        setMerging(true);
        setError(null);

        try {
            const res = await fetch(`/api/git?projectPath=${encodeURIComponent(projectPath!)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'merge', data: { branch: task.branch } })
            });
            const data = await res.json();

            if (data.success) {
                // Success!
                // Maybe delete the branch? For now just close.
                onMergeComplete();
                onClose();
            } else {
                if (data.conflict) {
                    setError('Merge conflicts detected! Please resolve them manually in your editor.');
                } else {
                    setError(data.message || 'Merge failed.');
                }
            }
        } catch (err) {
            setError('Failed to perform merge.');
            console.error(err);
        } finally {
            setMerging(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-4xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-lg">
                            <GitMerge className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Merge Task</h3>
                            <p className="text-sm text-gray-400 font-mono">{task.branch} → main</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4 space-y-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500 space-y-3">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <p>Analyzing changes...</p>
                        </div>
                    ) : (
                        <>
                            {/* Stats */}
                            {status && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                                        <div className="text-sm text-gray-400 mb-1">Commits Ahead</div>
                                        <div className="text-xl font-mono text-green-400">+{status.ahead || 0}</div>
                                    </div>
                                    <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                                        <div className="text-sm text-gray-400 mb-1">Commits Behind</div>
                                        <div className="text-xl font-mono text-amber-400">-{status.behind || 0}</div>
                                    </div>
                                </div>
                            )}

                            {/* Diff Viewer */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <FileDiff className="w-4 h-4" />
                                    <span>Changes Preview</span>
                                </div>
                                <div className="bg-gray-950 rounded-lg border border-gray-800 p-4 font-mono text-xs overflow-x-auto whitespace-pre">
                                    {diff ? diff : <span className="text-gray-500 italic">No changes detected in diff.</span>}
                                </div>
                            </div>
                        </>
                    )}

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3 text-red-400">
                            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-sm">Merge Failed</h4>
                                <p className="text-sm opacity-90">{error}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-800 bg-gray-900/50 flex justify-end gap-3 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleMerge}
                        disabled={loading || merging || !status?.canMerge}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all
                            ${loading || merging || !status?.canMerge
                                ? 'bg-indigo-500/50 text-indigo-200 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                            }`}
                    >
                        {merging ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Merging...
                            </>
                        ) : (
                            <>
                                <GitMerge className="w-4 h-4" />
                                Confirm Merge
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
