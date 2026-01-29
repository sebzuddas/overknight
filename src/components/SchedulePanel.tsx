'use client';

import React, { useState } from 'react';
import { Calendar, Clock, Play, StopCircle, RefreshCw, Trash2 } from 'lucide-react';
import { useProject } from '@/context/ProjectContext';

export function SchedulePanel() {
    const { scheduledRuns, runTasks, scheduleRun, isRunning, refreshRuns } = useProject();
    const [selectedTime, setSelectedTime] = useState('');

    const handleRunNow = async () => {
        // For simplicity run all pending tasks? Or maybe UI should allow selection.
        // Here we just trigger a run for all tasks usually, but api supports selection.
        // Let's assume user wants to run filtered tasks based on status.
        // For now, simpler: user defines tasks in board, here we just show runs.
    };

    const pendingRuns = scheduledRuns.filter(r => r.status === 'pending');

    return (
        <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50 card-hover">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-purple-400" />
                    <h3 className="font-semibold">Schedule</h3>
                </div>
                <button onClick={refreshRuns} className="p-1 hover:bg-white/5 rounded"><RefreshCw className="w-4 h-4 text-gray-500" /></button>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-xs text-gray-400">Run Overnight At</label>
                    <div className="flex gap-2">
                        <input
                            type="time"
                            value={selectedTime}
                            onChange={(e) => setSelectedTime(e.target.value)}
                            className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm flex-1"
                        />
                        <button
                            onClick={() => {
                                if (!selectedTime) return;
                                const [hours, minutes] = selectedTime.split(':').map(Number);
                                const date = new Date();
                                date.setHours(hours, minutes, 0, 0);
                                if (date < new Date()) date.setDate(date.getDate() + 1);
                                scheduleRun([], date); // Empty IDs implies all pending? Or need logic.
                                setSelectedTime('');
                            }}
                            className="px-3 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-sm font-medium"
                        >
                            Set
                        </button>
                    </div>
                </div>

                {pendingRuns.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-xs text-gray-500 uppercase">Upcoming Runs</h4>
                        {pendingRuns.map(run => (
                            <div key={run.id} className="flex items-center justify-between p-2 bg-gray-900/50 rounded-lg text-sm">
                                <span>{new Date(run.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <span className="text-xs text-purple-400">Pending</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
