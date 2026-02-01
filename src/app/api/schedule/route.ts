/**
 * API endpoint for overnight task scheduling
 * Handles scheduling tasks via launchd + pmset
 */

import { NextRequest, NextResponse } from 'next/server';
import { scheduleTask, unscheduleTask, isTaskScheduled } from '@/lib/launchd-manager';
import { readTasks, writeTasks } from '@/lib/file-storage';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { taskId, projectPath, scheduledTime, action } = body;

        if (!taskId || !projectPath) {
            return NextResponse.json(
                { error: 'taskId and projectPath are required' },
                { status: 400 }
            );
        }

        if (action === 'unschedule') {
            // Cancel scheduled task
            const result = await unscheduleTask(taskId, scheduledTime ? new Date(scheduledTime) : undefined);

            // Update task in tasks.json - remove scheduled flag
            const tasksData = await readTasks(projectPath);
            if (tasksData) {
                for (const epic of tasksData.epics) {
                    const task = epic.tasks.find(t => t.id === taskId);
                    if (task) {
                        // Remove isSystemScheduled flag if we add it later
                        break;
                    }
                }
                await writeTasks(projectPath, tasksData);
            }

            return NextResponse.json({ success: result.success, error: result.error });
        }

        // Schedule task
        if (!scheduledTime) {
            return NextResponse.json(
                { error: 'scheduledTime is required for scheduling' },
                { status: 400 }
            );
        }

        const scheduledDate = new Date(scheduledTime);

        // Validate date is in the future
        if (scheduledDate <= new Date()) {
            return NextResponse.json(
                { error: 'scheduledTime must be in the future' },
                { status: 400 }
            );
        }

        const result = await scheduleTask({
            taskId,
            projectPath,
            scheduledTime: scheduledDate,
        });

        return NextResponse.json({
            success: result.success,
            plistPath: result.plistPath,
            error: result.error,
            warning: result.error && result.success
                ? 'Task scheduled but wake scheduling requires sudo. Your Mac may not wake automatically.'
                : undefined
        });

    } catch (error) {
        console.error('[API/schedule] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const taskId = searchParams.get('taskId');

        if (!taskId) {
            return NextResponse.json(
                { error: 'taskId query parameter is required' },
                { status: 400 }
            );
        }

        const scheduled = await isTaskScheduled(taskId);
        return NextResponse.json({ taskId, isScheduled: scheduled });

    } catch (error) {
        console.error('[API/schedule] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
