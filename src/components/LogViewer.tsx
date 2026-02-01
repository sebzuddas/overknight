'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Terminal, StopCircle, Send, MessageSquare, ScrollText, Loader2 } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useProject } from '@/context/ProjectContext';

interface LogViewerProps {
    taskId: string;
    onClose: () => void;
    isLive?: boolean;
}

type ViewMode = 'logs' | 'chat';

export function LogViewer({ taskId, onClose }: LogViewerProps) {
    const { projectPath, cancelCurrentRun } = useProject();
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('chat');
    const [inputValue, setInputValue] = useState('');

    // Log viewer state
    const [persistedLogs, setPersistedLogs] = useState<string | null>(null);
    const [fetchingLogs, setFetchingLogs] = useState(false);
    const [streamedLogs, setStreamedLogs] = useState<string>('');

    // Chat state using useChat hook
    const { messages, sendMessage, status, error: chatError, stop } = useChat({
        id: taskId,
        transport: new DefaultChatTransport({
            api: '/api/agent/chat',
            body: { projectPath, taskId },
        }),
        onError: (err: Error) => console.error("[Chat error]", err),
    });

    const isStreaming = status === 'streaming';
    const isReady = status === 'ready';

    // Fetch persisted logs on mount
    useEffect(() => {
        if (!taskId || !projectPath) return;

        let active = true;

        const fetchLogs = async () => {
            setFetchingLogs(true);
            try {
                const res = await fetch(`/api/logs?projectPath=${encodeURIComponent(projectPath)}&taskId=${taskId}`);
                const data = await res.json();
                if (active && data.found && data.content) {
                    setPersistedLogs(data.content);
                }
            } catch (err) {
                console.error("Failed to fetch persisted logs:", err);
            } finally {
                if (active) setFetchingLogs(false);
            }
        };

        fetchLogs();

        return () => { active = false; };
    }, [taskId, projectPath]);

    // Stream logs for live view
    useEffect(() => {
        if (viewMode !== 'logs' || !taskId || !projectPath) return;

        let active = true;
        const controller = new AbortController();

        const streamLogs = async () => {
            try {
                const res = await fetch('/api/agent/stream', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: taskId, projectPath }),
                    signal: controller.signal,
                });

                if (!res.body) return;

                const reader = res.body.getReader();
                const decoder = new TextDecoder();

                while (active) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    setStreamedLogs(prev => prev + chunk);
                }
            } catch (err) {
                if (err instanceof Error && err.name !== 'AbortError') {
                    console.error("Log stream error:", err);
                }
            }
        };

        streamLogs();

        return () => {
            active = false;
            controller.abort();
        };
    }, [viewMode, taskId, projectPath]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, streamedLogs, persistedLogs]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || !isReady) return;

        sendMessage({ text: inputValue });
        setInputValue('');
        inputRef.current?.focus();
    };

    const handleStop = async () => {
        stop();
        await cancelCurrentRun();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e);
        }
    };

    return (
        <div className="h-full flex flex-col bg-gray-950 border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-1.5 bg-indigo-500/10 rounded-md">
                        {viewMode === 'chat' ? (
                            <MessageSquare className="w-4 h-4 text-indigo-400" />
                        ) : (
                            <Terminal className="w-4 h-4 text-indigo-400" />
                        )}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <h3 className="font-medium text-gray-200 text-sm truncate">{taskId}</h3>
                        <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${isStreaming ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
                            <span className="text-[10px] text-gray-500 uppercase font-medium tracking-wide">
                                {isStreaming ? 'Streaming' : isReady ? 'Ready' : status}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Mode Toggle */}
                    <div className="flex bg-gray-800 rounded-lg p-0.5">
                        <button
                            onClick={() => setViewMode('chat')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === 'chat'
                                ? 'bg-indigo-500 text-white'
                                : 'text-gray-400 hover:text-gray-200'
                                }`}
                        >
                            <MessageSquare className="w-3 h-3" />
                            Chat
                        </button>
                        <button
                            onClick={() => setViewMode('logs')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === 'logs'
                                ? 'bg-indigo-500 text-white'
                                : 'text-gray-400 hover:text-gray-200'
                                }`}
                        >
                            <ScrollText className="w-3 h-3" />
                            Logs
                        </button>
                    </div>

                    {isStreaming && (
                        <button
                            onClick={handleStop}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
                        >
                            <StopCircle className="w-3.5 h-3.5" />
                            Stop
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

            {/* Content Area */}
            <div
                ref={scrollRef}
                className="flex-1 bg-black p-4 overflow-y-auto"
            >
                {viewMode === 'chat' ? (
                    /* Chat Messages */
                    <div className="space-y-4">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500 py-12">
                                <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
                                <p className="text-sm">Start a conversation about this task</p>
                                <p className="text-xs mt-1 opacity-75">Ask questions, get help, or discuss implementation</p>
                            </div>
                        ) : (
                            messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-xl px-4 py-2.5 ${message.role === 'user'
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gray-800 text-gray-200'
                                            }`}
                                    >
                                        <div className="text-xs opacity-60 mb-1">
                                            {message.role === 'user' ? 'You' : 'Assistant'}
                                        </div>
                                        <div className="text-sm whitespace-pre-wrap">
                                            {message.parts?.map((part, index) => {
                                                if (part.type === 'text') {
                                                    return <span key={index}>{part.text}</span>;
                                                }
                                                return null;
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        {isStreaming && (
                            <div className="flex items-center gap-2 text-gray-500 text-sm">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Thinking...</span>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Log View */
                    <div className="font-mono text-xs leading-relaxed">
                        {persistedLogs || streamedLogs ? (
                            <div className="text-gray-300 whitespace-pre-wrap">
                                {persistedLogs && (
                                    <div className="text-gray-500 mb-2 border-b border-gray-800 pb-2">
                                        [History] Loading confirmed logs...
                                    </div>
                                )}
                                {persistedLogs}
                                {streamedLogs}
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-600 italic">
                                {fetchingLogs ? 'Loading logs...' : "No logs found. Agent might be starting..."}
                            </div>
                        )}
                    </div>
                )}

                {chatError && (
                    <div className="mt-4 p-3 bg-red-900/20 border border-red-900/50 rounded text-red-400 text-sm">
                        Error: {chatError.message}
                    </div>
                )}
            </div>

            {/* Chat Input Area */}
            <div className={`p-3 bg-gray-900 border-t border-gray-800 ${viewMode === 'logs' ? 'opacity-50' : ''}`}>
                <form onSubmit={handleSendMessage} className="relative">
                    <input
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={viewMode === 'logs' || !isReady}
                        placeholder={viewMode === 'logs' ? 'Switch to Chat to send messages...' : 'Type a message...'}
                        className="w-full bg-black border border-gray-700 rounded-lg pl-4 pr-12 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    />
                    <button
                        type="submit"
                        disabled={viewMode === 'logs' || !isReady || !inputValue.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                    >
                        {isStreaming ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Send className="w-3.5 h-3.5" />
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
