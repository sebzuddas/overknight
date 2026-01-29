'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X, Terminal, Loader2, RefreshCw, Send } from 'lucide-react';
import { useProject } from '@/context/ProjectContext';

interface LogViewerProps {
    taskId: string;
    onClose: () => void;
    isLive?: boolean;
}

export function LogViewer({ taskId, onClose, isLive = false }: LogViewerProps) {
    const { getTaskLogs } = useProject();
    const [logs, setLogs] = useState('');
    const [loading, setLoading] = useState(true);
    const preRef = useRef<HTMLPreElement>(null);

    useEffect(() => {
        let active = true;
        const fetchLogs = async () => {
            const content = await getTaskLogs(taskId);
            if (active) {
                setLogs(content || 'No logs found.');
                setLoading(false);
                // Auto-scroll to bottom if live
                if (preRef.current && isLive) {
                    preRef.current.scrollTop = preRef.current.scrollHeight;
                }
            }
        };

        fetchLogs();

        let interval: NodeJS.Timeout;
        if (isLive) {
            interval = setInterval(fetchLogs, 1000);
        }

        return () => {
            active = false;
            if (interval) clearInterval(interval);
        };
    }, [taskId, isLive, getTaskLogs]);

    return (
        <div className="h-full flex flex-col bg-gray-900/50 border border-gray-700/50 rounded-xl overflow-hidden backdrop-blur-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-800/50">
                <div className="flex items-center gap-2 overflow-hidden">
                    <Terminal className="w-4 h-4 text-indigo-400 shrink-0" />
                    <h3 className="font-semibold text-gray-200 text-sm truncate" title={taskId}>{taskId}</h3>
                    {isLive && (
                        <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-green-500/10 text-green-400 rounded text-[10px] font-mono shrink-0">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            LIVE
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    {isLive && (
                        <LogControls />
                    )}
                    <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-auto bg-black p-3 font-mono text-xs">
                {loading && !logs ? (
                    <div className="flex items-center justify-center h-full text-gray-500 gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                    </div>
                ) : (
                    <pre ref={preRef} className="whitespace-pre-wrap text-gray-300 leading-relaxed font-mono">
                        {logs}
                    </pre>
                )}
            </div>
            <ChatInput onSend={(msg) => console.log('Chat message:', msg)} />
        </div>
    );
}

function ChatInput({ onSend }: { onSend: (message: string) => void }) {
    const [message, setMessage] = useState('');

    const handleSend = () => {
        if (message.trim()) {
            onSend(message);
            setMessage('');
        }
    };

    return (
        <div className="p-3 bg-gray-800 border-t border-gray-700">
            <div className="flex gap-2">
                <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Chat with agent... (Not yet connected)"
                    className="flex-1 bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-gray-200 placeholder-gray-500"
                />
                <button
                    onClick={handleSend}
                    disabled={!message.trim()}
                    className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 rounded text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

function LogControls() {
    const { cancelCurrentRun } = useProject();
    const [stopping, setStopping] = useState(false);

    const handleStop = async () => {
        setStopping(true);
        await cancelCurrentRun();
        setStopping(false);
    };

    return (
        <button
            onClick={handleStop}
            disabled={stopping}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded text-xs font-medium transition-colors disabled:opacity-50"
        >
            {stopping ? <Loader2 className="w-3 h-3 animate-spin" /> : <div className="w-2 h-2 bg-red-500 rounded-sm" />}
            {stopping ? 'Stopping...' : 'Stop Agent'}
        </button>
    );
}
