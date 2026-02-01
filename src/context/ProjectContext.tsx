'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { TasksData, Workflow, Epic, Task, ScheduledRun } from '@/lib/types';

interface ProjectContextType {
    projectPath: string | null;
    setProjectPath: (path: string) => void;
    tasksData: TasksData | null;
    workflow: Workflow | null;
    scheduledRuns: ScheduledRun[];
    isLoading: boolean;
    isRunning: boolean;
    error: string | null;
    refreshTasks: () => Promise<void>;
    refreshWorkflow: () => Promise<void>;
    refreshRuns: () => Promise<void>;
    initializeProject: (projectName: string, agentConfig?: unknown) => Promise<void>;
    createEpic: (title: string, description?: string, priority?: number, assignee?: string) => Promise<Epic>;
    createTask: (epicId: string, title: string, description?: string, priority?: number, startDate?: string, endDate?: string, assignee?: string) => Promise<Task>;
    updateEpic: (epicId: string, updates: Partial<Epic>) => Promise<void>;
    updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
    deleteEpic: (epicId: string) => Promise<void>;
    deleteTask: (taskId: string) => Promise<void>;
    runTasks: (taskIds: string[]) => Promise<void>;
    scheduleRun: (taskIds: string[], scheduledTime: Date) => Promise<void>;
    getTaskLogs: (taskId: string) => Promise<string>;
    cancelCurrentRun: () => Promise<void>;
    reorderTasks: (epicId: string, taskIds: string[]) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

export function useProject() {
    const context = useContext(ProjectContext);
    if (!context) throw new Error('useProject must be used within a ProjectProvider');
    return context;
}

export function ProjectProvider({ children }: { children: ReactNode }) {
    const [projectPath, setProjectPathState] = useState<string | null>(null);
    const [tasksData, setTasksData] = useState<TasksData | null>(null);
    const [workflow, setWorkflow] = useState<Workflow | null>(null);
    const [scheduledRuns, setScheduledRuns] = useState<ScheduledRun[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const setProjectPath = useCallback((path: string) => {
        setProjectPathState(path);
        localStorage.setItem('overknight-project-path', path);
    }, []);

    useEffect(() => {
        const savedPath = localStorage.getItem('overknight-project-path');
        if (savedPath) setProjectPathState(savedPath);
    }, []);

    const fetchData = useCallback(async (endpoint: string) => {
        if (!projectPath) return null;
        const res = await fetch(`${endpoint}?projectPath=${encodeURIComponent(projectPath)}`);
        if (!res.ok) {
            let errorMessage = `Failed to fetch ${endpoint}`;
            try {
                const errorData = await res.json();
                if (errorData.error) errorMessage = errorData.error;
            } catch { /* ignore parsing error */ }
            throw new Error(errorMessage);
        }
        return res.json();
    }, [projectPath]);

    const refreshTasks = useCallback(async () => {
        if (!projectPath) return;
        setIsLoading(true);
        try {
            setTasksData(await fetchData('/api/tasks'));
            setError(null);
        } catch (err) { setError(err instanceof Error ? err.message : 'Unknown error'); } finally { setIsLoading(false); }
    }, [projectPath, fetchData]);

    const refreshWorkflow = useCallback(async () => {
        try { setWorkflow(await fetchData('/api/workflow')); } catch (err) { console.error(err); }
    }, [fetchData]);

    const refreshRuns = useCallback(async () => {
        if (!projectPath) return;
        try {
            const data = await fetchData('/api/run'); // Defaults to list
            setScheduledRuns(data.runs || []);
            const statusRes = await fetch(`/api/run?projectPath=${encodeURIComponent(projectPath)}&action=status`);
            setIsRunning((await statusRes.json()).isRunning);
        } catch (err) { console.error(err); }
    }, [projectPath, fetchData]);

    useEffect(() => {
        if (projectPath) { refreshTasks(); refreshWorkflow(); refreshRuns(); }
    }, [projectPath, refreshTasks, refreshWorkflow, refreshRuns]);

    useEffect(() => {
        if (!projectPath || !isRunning) return;
        const interval = setInterval(() => { refreshRuns(); refreshTasks(); }, 5000);
        return () => clearInterval(interval);
    }, [projectPath, isRunning, refreshRuns, refreshTasks]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const post = useCallback(async (endpoint: string, action: string, data: Record<string, any>) => {
        if (!projectPath) throw new Error('No project selected');
        const res = await fetch(`${endpoint}?projectPath=${encodeURIComponent(projectPath)}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, data })
        });
        if (!res.ok) {
            let message = 'Request failed';
            try {
                const err = await res.json();
                if (err.error) message = err.error;
            } catch { }
            throw new Error(message);
        }
        return res.json();
    }, [projectPath]);

    const initializeProject = useCallback(async (projectName: string, agentConfig?: unknown) => { await post('/api/tasks', 'initialize', { projectName, agentConfig }); await refreshTasks(); refreshWorkflow(); }, [post, refreshTasks, refreshWorkflow]);
    const createEpic = useCallback(async (title: string, description?: string, priority?: number, assignee?: string) => { const epic = await post('/api/tasks', 'createEpic', { title, description, priority, assignee }); await refreshTasks(); return epic; }, [post, refreshTasks]);
    const createTask = useCallback(async (epicId: string, title: string, description?: string, priority?: number, startDate?: string, endDate?: string, assignee?: string) => { const task = await post('/api/tasks', 'createTask', { epicId, title, description, priority, startDate, endDate, assignee }); await refreshTasks(); return task; }, [post, refreshTasks]);
    const updateEpic = useCallback(async (epicId: string, updates: Partial<Epic>) => { await post('/api/tasks', 'updateEpic', { epicId, updates }); await refreshTasks(); }, [post, refreshTasks]);
    const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => { await post('/api/tasks', 'updateTask', { taskId, updates }); await refreshTasks(); }, [post, refreshTasks]);
    const deleteEpic = useCallback(async (epicId: string) => { await post('/api/tasks', 'deleteEpic', { epicId }); await refreshTasks(); }, [post, refreshTasks]);
    const deleteTask = useCallback(async (taskId: string) => { await post('/api/tasks', 'deleteTask', { taskId }); await refreshTasks(); }, [post, refreshTasks]);
    const runTasks = useCallback(async (taskIds: string[]) => { await post('/api/run', 'runNow', { taskIds }); setIsRunning(true); await refreshRuns(); }, [post, refreshRuns]);
    const scheduleRun = useCallback(async (taskIds: string[], scheduledTime: Date) => { await post('/api/run', 'schedule', { taskIds, scheduledTime: scheduledTime.toISOString() }); await refreshRuns(); }, [post, refreshRuns]);
    const getTaskLogs = useCallback(async (taskId: string) => {
        if (!projectPath) return '';
        const res = await fetch(`/api/run/logs?projectPath=${encodeURIComponent(projectPath)}&taskId=${taskId}`);
        if (!res.ok) return '';
        return (await res.json()).logs;
    }, [projectPath]);

    const cancelCurrentRun = useCallback(async () => {
        await post('/api/run', 'cancelCurrent', {});
        setIsRunning(false);
        await refreshRuns();
    }, [post, refreshRuns]);

    const reorderTasks = useCallback(async (epicId: string, taskIds: string[]) => {
        // Optimistic update could be added here
        await post('/api/tasks', 'reorderTasks', { epicId, taskIds });
        await refreshTasks();
    }, [post, refreshTasks]);

    return (
        <ProjectContext.Provider value={{ projectPath, setProjectPath, tasksData, workflow, scheduledRuns, isLoading, isRunning, error, refreshTasks, refreshWorkflow, refreshRuns, initializeProject, createEpic, createTask, updateEpic, updateTask, deleteEpic, deleteTask, runTasks, scheduleRun, getTaskLogs, cancelCurrentRun, reorderTasks }}>
            {children}
        </ProjectContext.Provider>
    );
}
