'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Terminal, StopCircle, Play, Send } from 'lucide-react';
import { useCompletion } from '@ai-sdk/react';
import { useProject } from '@/context/ProjectContext';

interface LogViewerProps {
    taskId: string;
    onClose: () => void;
    isLive?: boolean;
}

export function LogViewer({ taskId, onClose }: LogViewerProps) {
    const { projectPath, cancelCurrentRun } = useProject();
    const scrollRef = useRef<HTMLDivElement>(null);

    const { completion, complete, stop, isLoading, error } = useCompletion({
        api: '/api/agent/stream',
        body: { projectPath },
        onError: (err: Error) => console.error("Stream error:", err)
    });

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [completion]);

    // Initial run on mount if not already running?
    // User might want to click run manually, but context implies we are viewing a task.
    // However, the previous code was just viewing logs.
    // The user request says "replaces the current chatbox feature".
    // I will making the "Chat input" trigger the agent, and the main view show the output.

    const handleRun = () => {
        complete(taskId);
    };

    const handleStop = async () => {
        stop();
        await cancelCurrentRun(); // kill backend process too
    };

    return (
        <div className="h-full flex flex-col bg-gray-950 border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-1.5 bg-indigo-500/10 rounded-md">
                        <Terminal className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <h3 className="font-medium text-gray-200 text-sm truncate">{taskId}</h3>
                        <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
                            <span className="text-[10px] text-gray-500 uppercase font-medium tracking-wide">
                                {isLoading ? 'Agent Running' : 'Idle'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isLoading ? (
                        <button
                            onClick={handleStop}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
                        >
                            <StopCircle className="w-3.5 h-3.5" />
                            Stop
                        </button>
                    ) : (
                        <button
                            onClick={handleRun}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition-colors"
                        >
                            <Play className="w-3.5 h-3.5" />
                            Run Task
                        </button>
                    )}

                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Terminal Output */}
            <div
                ref={scrollRef}
                className="flex-1 bg-black p-4 overflow-y-auto font-mono text-xs leading-relaxed"
            >
                {completion ? (
                    <div className="text-gray-300 whitespace-pre-wrap">{completion}</div>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-600 italic">
                        No output yet. Click &apos;Run Task&apos; to start.
                    </div>
                )}
                {error && (
                    <div className="mt-4 p-3 bg-red-900/20 border border-red-900/50 rounded text-red-400">
                        ERROR: {error.message}
                    </div>
                )}
            </div>

            {/* Chat/Input Area */}
            <ChatInput
                onSend={(msg) => complete(msg)} // Sending a message also triggers completion with that prompt
                isLoading={isLoading}
                placeholder={isLoading ? "Agent is running..." : "Send command to agent..."}
            />
        </div>
    );
}

function ChatInput({ onSend, isLoading, placeholder }: { onSend: (msg: string) => void, isLoading: boolean, placeholder: string }) {
    const [message, setMessage] = useState('');

    const handleSend = () => {
        if (message.trim()) {
            onSend(message);
            setMessage('');
        }
    };

    return (
        <div className="p-3 bg-gray-900 border-t border-gray-800">
            <div className="relative">
                <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                    placeholder={placeholder}
                    disabled={isLoading}
                    className="w-full bg-black border border-gray-700 rounded-lg pl-4 pr-12 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                    onClick={handleSend}
                    disabled={!message.trim() || isLoading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 text-white rounded-md disabled:opacity-0 disabled:pointer-events-none transition-all hover:bg-indigo-500 shadow-lg shadow-indigo-900/20"
                >
                    <Send className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}
