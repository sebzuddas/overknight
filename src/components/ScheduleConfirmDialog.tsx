'use client';

import React from 'react';
import { X, Clock, Moon, AlertTriangle } from 'lucide-react';

interface ScheduleConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    taskTitle: string;
    scheduledTime: Date;
    isLoading?: boolean;
}

export function ScheduleConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    taskTitle,
    scheduledTime,
    isLoading = false,
}: ScheduleConfirmDialogProps) {
    if (!isOpen) return null;

    const formattedTime = scheduledTime.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 rounded-xl border border-zinc-700 max-w-md w-full shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/20 rounded-lg">
                            <Moon className="w-5 h-5 text-amber-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-white">
                            Overnight Scheduling
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-zinc-700 rounded transition-colors"
                        disabled={isLoading}
                    >
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {/* Task info */}
                    <div className="bg-zinc-800 rounded-lg p-3">
                        <p className="text-sm text-zinc-400">Task</p>
                        <p className="text-white font-medium">{taskTitle}</p>
                    </div>

                    {/* Time */}
                    <div className="flex items-center gap-3 bg-zinc-800 rounded-lg p-3">
                        <Clock className="w-5 h-5 text-blue-400" />
                        <div>
                            <p className="text-sm text-zinc-400">Scheduled for</p>
                            <p className="text-white font-medium">{formattedTime}</p>
                        </div>
                    </div>

                    {/* Warning */}
                    <div className="flex gap-3 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="text-amber-200 font-medium mb-1">
                                This task will run automatically
                            </p>
                            <ul className="text-amber-200/80 space-y-1 text-xs">
                                <li>• Your Mac will wake from sleep at the scheduled time</li>
                                <li>• The task runs regardless of whether Overknight is open</li>
                                <li>• You&apos;ll be prompted for your password to enable wake scheduling</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 p-4 border-t border-zinc-700">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Scheduling...
                            </>
                        ) : (
                            'Confirm Schedule'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
