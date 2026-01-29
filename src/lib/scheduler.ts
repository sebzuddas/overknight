import schedule, { Job } from 'node-schedule';
import { readSchedule, writeSchedule, readTasks } from './file-storage';
import { createAgentRunner, AgentRunner } from './agent-runner';
import type { Schedule, ScheduledRun, Task } from './types';

export interface SchedulerOptions {
    projectPath: string;
    onRunStart?: (run: ScheduledRun) => void;
    onRunComplete?: (run: ScheduledRun, success: boolean) => void;
    onError?: (error: Error) => void;
}

export class Scheduler {
    private projectPath: string;
    private options: SchedulerOptions;
    private jobs: Map<string, Job> = new Map();
    private currentRunner: AgentRunner | null = null;
    private isRunning: boolean = false;

    constructor(options: SchedulerOptions) {
        this.projectPath = options.projectPath;
        this.options = options;
    }

    async initialize(): Promise<void> {
        const scheduleData = await readSchedule(this.projectPath);
        if (!scheduleData) return;
        for (const run of scheduleData.runs) {
            if (run.status === 'pending') {
                const scheduledTime = new Date(run.scheduledTime);
                if (scheduledTime > new Date()) {
                    this.scheduleRun(run);
                }
            }
        }
    }

    async scheduleNewRun(taskIds: string[], scheduledTime: Date): Promise<ScheduledRun> {
        const run: ScheduledRun = {
            id: `run-${Date.now()}`,
            taskIds,
            scheduledTime: scheduledTime.toISOString(),
            status: 'pending',
            createdAt: new Date().toISOString(),
        };
        const scheduleData = await readSchedule(this.projectPath) || { runs: [] };
        scheduleData.runs.push(run);
        await writeSchedule(this.projectPath, scheduleData);
        this.scheduleRun(run);
        return run;
    }

    private scheduleRun(run: ScheduledRun): void {
        const job = schedule.scheduleJob(new Date(run.scheduledTime), async () => {
            await this.executeRun(run);
            this.jobs.delete(run.id);
        });
        if (job) this.jobs.set(run.id, job);
    }

    async executeRun(run: ScheduledRun): Promise<void> {
        if (this.isRunning) throw new Error('Another run is already in progress');
        this.isRunning = true;
        this.options.onRunStart?.(run);
        await this.updateRunStatus(run.id, 'running');

        const tasksData = await readTasks(this.projectPath);
        if (!tasksData) {
            await this.updateRunStatus(run.id, 'cancelled');
            this.isRunning = false;
            return;
        }

        const tasksToRun: Task[] = [];
        for (const epic of tasksData.epics) {
            for (const task of epic.tasks) {
                if (run.taskIds.includes(task.id)) tasksToRun.push(task);
            }
        }
        tasksToRun.sort((a, b) => a.priority - b.priority);

        let allSuccessful = true;
        this.currentRunner = createAgentRunner({ projectPath: this.projectPath, onError: this.options.onError });

        const path = require('path');
        const fs = require('fs');
        const tasksJsonPath = path.join(this.projectPath, 'plan/tasks.json');

        for (const task of tasksToRun) {
            try {
                // Setup watcher for this specific task
                const watcher = fs.watch(tasksJsonPath, async (eventType: string) => {
                    if (eventType === 'change') {
                        const currentTasks = await readTasks(this.projectPath);
                        if (!currentTasks) return;

                        // Find the current task
                        let foundTask: Task | undefined;
                        for (const epic of currentTasks.epics) {
                            const t = epic.tasks.find(t => t.id === task.id);
                            if (t) { foundTask = t; break; }
                        }

                        if (foundTask && foundTask.status === 'completed' && this.currentRunner) {
                            console.log(`[Scheduler] Task ${task.id} marked as completed externally. Stopping runner.`);
                            this.currentRunner.cancel();
                        }
                    }
                });

                const result = await this.currentRunner.runTask(task);
                watcher.close(); // Clean up watcher
                if (!result.success) allSuccessful = false;
            } catch (error) {
                allSuccessful = false;
                this.options.onError?.(error instanceof Error ? error : new Error(String(error)));
            }
        }

        this.currentRunner = null;
        this.isRunning = false;
        await this.updateRunStatus(run.id, 'completed');
        this.options.onRunComplete?.(run, allSuccessful);
    }

    async runNow(taskIds: string[]): Promise<void> {
        const run: ScheduledRun = { id: `run-${Date.now()}`, taskIds, scheduledTime: new Date().toISOString(), status: 'pending', createdAt: new Date().toISOString() };
        await this.executeRun(run);
    }

    async cancelRun(runId: string): Promise<void> {
        const job = this.jobs.get(runId);
        if (job) job.cancel();
        this.jobs.delete(runId);
        await this.updateRunStatus(runId, 'cancelled');
    }

    async cancelCurrent(): Promise<void> {
        if (this.currentRunner) {
            this.currentRunner.cancel();
            this.currentRunner = null;
        }

        // Force update any in-progress tasks to cancelled
        this.isRunning = false;
        const tasksData = await readTasks(this.projectPath);
        if (tasksData) {
            let changed = false;
            for (const epic of tasksData.epics) {
                for (const task of epic.tasks) {
                    if (task.status === 'in-progress') {
                        task.status = 'failed'; // Mark as failed/cancelled
                        task.completedAt = new Date().toISOString();
                        changed = true;
                    }
                }
            }
            if (changed) {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const { writeTasks } = require('./file-storage');
                await writeTasks(this.projectPath, tasksData);
            }
        }
    }

    private async updateRunStatus(runId: string, status: ScheduledRun['status']): Promise<void> {
        const scheduleData = await readSchedule(this.projectPath);
        if (!scheduleData) return;
        const run = scheduleData.runs.find(r => r.id === runId);
        if (run) {
            run.status = status;
            await writeSchedule(this.projectPath, scheduleData);
        }
    }

    async getScheduledRuns(): Promise<ScheduledRun[]> {
        const scheduleData = await readSchedule(this.projectPath);
        return scheduleData?.runs || [];
    }

    async getPendingRuns(): Promise<ScheduledRun[]> {
        const runs = await this.getScheduledRuns();
        return runs.filter(r => r.status === 'pending');
    }

    isCurrentlyRunning(): boolean { return this.isRunning; }

    shutdown(): void {
        for (const job of this.jobs.values()) job.cancel();
        this.jobs.clear();
        this.cancelCurrent();
    }
}

export function createScheduler(options: SchedulerOptions): Scheduler {
    return new Scheduler(options);
}
