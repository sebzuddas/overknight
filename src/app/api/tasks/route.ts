import { NextRequest, NextResponse } from 'next/server';
import { readTasks, writeTasks, initializeProject, isValidProject } from '@/lib/file-storage';
import { DEFAULT_WORKFLOW_STEPS } from '@/lib/types';
import type { Epic, Task } from '@/lib/types';

export async function GET(request: NextRequest) {
    const projectPath = request.nextUrl.searchParams.get('projectPath');
    if (!projectPath || !(await isValidProject(projectPath))) return NextResponse.json({ error: 'Invalid project path' }, { status: 400 });
    const tasks = await readTasks(projectPath);
    if (!tasks) return NextResponse.json({ project: { name: '', path: projectPath, createdAt: '', lastModified: '' }, epics: [] });
    return NextResponse.json(tasks);
}

export async function POST(request: NextRequest) {
    const projectPath = request.nextUrl.searchParams.get('projectPath');
    if (!projectPath) return NextResponse.json({ error: 'projectPath required' }, { status: 400 });

    const body = await request.json();
    const { action, data } = body;

    let tasksData = await readTasks(projectPath);

    // Auto-initialize if missing
    if (!tasksData) {
        if (action === 'initialize') {
            await initializeProject(projectPath, data.projectName, DEFAULT_WORKFLOW_STEPS);
            return NextResponse.json(await readTasks(projectPath));
        }

        // Implicit initialization for other actions
        const projectName = projectPath.split('/').pop() || 'Project';
        await initializeProject(projectPath, projectName, DEFAULT_WORKFLOW_STEPS);
        tasksData = await readTasks(projectPath);

        if (!tasksData) {
            return NextResponse.json({ error: 'Failed to initialize project' }, { status: 500 });
        }
    } else if (action === 'initialize') {
        // Already initialized, just return data
        return NextResponse.json(tasksData);
    }

    switch (action) {
        case 'createEpic': {
            const newEpic: Epic = { id: `epic-${Date.now()}`, title: data.title, description: data.description || '', priority: data.priority || 3, status: 'pending', tasks: [], createdAt: new Date().toISOString(), assignee: data.assignee || undefined };
            tasksData.epics.push(newEpic);
            await writeTasks(projectPath, tasksData);
            return NextResponse.json(newEpic);
        }
        case 'createTask': {
            const epic = tasksData.epics.find(e => e.id === data.epicId);
            if (!epic) return NextResponse.json({ error: 'Epic not found' }, { status: 404 });
            const newTask: Task = { id: `task-${Date.now()}`, title: data.title, description: data.description || '', priority: data.priority || 3, status: 'pending', branch: null, createdAt: new Date().toISOString(), completedAt: null, startDate: data.startDate || undefined, endDate: data.endDate || undefined, assignee: data.assignee || undefined, workflowId: data.workflowId || undefined, agent: data.agent || undefined };
            epic.tasks.push(newTask);
            await writeTasks(projectPath, tasksData);
            return NextResponse.json(newTask);
        }
        case 'updateEpic': {
            const epic = tasksData.epics.find(e => e.id === data.epicId);
            if (!epic) return NextResponse.json({ error: 'Epic not found' }, { status: 404 });
            Object.assign(epic, data.updates);
            await writeTasks(projectPath, tasksData);
            return NextResponse.json(epic);
        }
        case 'updateTask': {
            let task: Task | undefined;
            for (const epic of tasksData.epics) {
                task = epic.tasks.find(t => t.id === data.taskId);
                if (task) break;
            }
            if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
            Object.assign(task, data.updates);
            await writeTasks(projectPath, tasksData);
            return NextResponse.json(task);
        }
        case 'deleteEpic': {
            tasksData.epics = tasksData.epics.filter(e => e.id !== data.epicId);
            await writeTasks(projectPath, tasksData);
            return NextResponse.json({ success: true });
        }
        case 'deleteTask': {
            for (const epic of tasksData.epics) epic.tasks = epic.tasks.filter(t => t.id !== data.taskId);
            await writeTasks(projectPath, tasksData);
            return NextResponse.json({ success: true });
        }
        case 'reorderEpics': {
            const epicMap = new Map(tasksData.epics.map(e => [e.id, e]));
            tasksData.epics = data.epicIds.map((id: string) => epicMap.get(id)).filter(Boolean) as Epic[];
            await writeTasks(projectPath, tasksData);
            return NextResponse.json({ success: true });
        }
        case 'reorderTasks': {
            const epic = tasksData.epics.find(e => e.id === data.epicId);
            if (!epic) return NextResponse.json({ error: 'Epic not found' }, { status: 404 });
            const taskMap = new Map(epic.tasks.map(t => [t.id, t]));
            epic.tasks = data.taskIds.map((id: string) => taskMap.get(id)).filter(Boolean) as Task[];
            await writeTasks(projectPath, tasksData);
            return NextResponse.json({ success: true });
        }
        default: return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
}
