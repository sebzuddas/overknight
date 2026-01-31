import { NextRequest, NextResponse } from 'next/server';
import { createAgentRunner } from '@/lib/agent-runner';
import { readTasks, isValidProject } from '@/lib/file-storage';
import type { Task } from '@/lib/types';
import { DEFAULT_AGENTS } from '@/lib/types';
import { getOrCreateScheduler } from '@/lib/runtime';

export async function GET(request: NextRequest) {
    const projectPath = request.nextUrl.searchParams.get('projectPath');
    const action = request.nextUrl.searchParams.get('action') || 'list';
    if (!projectPath || !(await isValidProject(projectPath))) return NextResponse.json({ error: 'Invalid project path' }, { status: 400 });
    const scheduler = getOrCreateScheduler(projectPath);
    switch (action) {
        case 'list': return NextResponse.json({ runs: await scheduler.getScheduledRuns() });
        case 'pending': return NextResponse.json({ runs: await scheduler.getPendingRuns() });
        case 'status': return NextResponse.json({ isRunning: scheduler.isCurrentlyRunning() });
        default: return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
}

export async function POST(request: NextRequest) {
    const projectPath = request.nextUrl.searchParams.get('projectPath');
    if (!projectPath) return NextResponse.json({ error: 'projectPath required' }, { status: 400 });
    const body = await request.json();
    const scheduler = getOrCreateScheduler(projectPath);

    switch (body.action) {
        case 'runNow': {
            if (scheduler.isCurrentlyRunning()) return NextResponse.json({ error: 'Already running' }, { status: 409 });
            scheduler.runNow(body.data.taskIds).catch(console.error);
            return NextResponse.json({ success: true });
        }
        case 'schedule': {
            return NextResponse.json({ run: await scheduler.scheduleNewRun(body.data.taskIds, new Date(body.data.scheduledTime)) });
        }
        case 'cancel': await scheduler.cancelRun(body.data.runId); return NextResponse.json({ success: true });
        case 'cancelCurrent': await scheduler.cancelCurrent(); return NextResponse.json({ success: true });
        case 'runSingleTask': {
            if (scheduler.isCurrentlyRunning()) return NextResponse.json({ error: 'Already running' }, { status: 409 });
            const tasksData = await readTasks(projectPath);
            let targetTask: Task | undefined;
            for (const epic of tasksData?.epics || []) {
                targetTask = epic.tasks.find(t => t.id === body.data.taskId);
                if (targetTask) break;
            }
            if (!targetTask) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
            createAgentRunner({ projectPath, availableAgents: DEFAULT_AGENTS }).runTask(targetTask).catch(console.error);

            return NextResponse.json({ success: true });
        }
        default: return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
}
