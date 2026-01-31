import { createScheduler, Scheduler } from './scheduler';

const schedulers = new Map<string, Scheduler>();

export function getOrCreateScheduler(projectPath: string): Scheduler {
    if (!schedulers.has(projectPath)) {
        const scheduler = createScheduler({ projectPath });
        scheduler.initialize();
        schedulers.set(projectPath, scheduler);
    }
    return schedulers.get(projectPath)!;
}
