import { promises as fs } from 'fs';
import path from 'path';
import type { TasksData, Workflow, Schedule, DEFAULT_WORKFLOW_STEPS } from './types';

const PLAN_DIR = 'plan';
const DOCS_DIR = 'docs';
const ARCHITECTURES_DIR = 'docs/architectures';

export const PROJECT_FILES = {
    tasks: `${PLAN_DIR}/tasks.json`,
    workflow: `${PLAN_DIR}/workflow.json`, // Legacy single workflow
    workflows: `${PLAN_DIR}/workflows.json`, // New multi workflow
    schedule: `${PLAN_DIR}/schedule.json`,
    progress: `${PLAN_DIR}/progress.md`,
    logs: `${PLAN_DIR}/logs`, // Directory for logs
    config: 'overknight.config.json',
} as const;

export async function appendTaskLog(projectPath: string, taskId: string, content: string): Promise<void> {
    const logDir = path.join(projectPath, PROJECT_FILES.logs);
    const logFile = path.join(logDir, `${taskId}.log`);

    try {
        await fs.mkdir(logDir, { recursive: true });
        await fs.appendFile(logFile, content, 'utf-8');
    } catch (err) {
        console.error('Failed to write log:', err);
    }
}

export async function readTaskLog(projectPath: string, taskId: string): Promise<string> {
    const logFile = path.join(projectPath, PROJECT_FILES.logs, `${taskId}.log`);
    try {
        return await fs.readFile(logFile, 'utf-8');
    } catch {
        return '';
    }
}

export async function ensureProjectStructure(projectPath: string): Promise<void> {
    const dirs = [PLAN_DIR, DOCS_DIR, ARCHITECTURES_DIR];
    for (const dir of dirs) {
        await fs.mkdir(path.join(projectPath, dir), { recursive: true });
    }
}

export async function readJsonFile<T>(projectPath: string, relativePath: string): Promise<T | null> {
    try {
        const fullPath = path.join(projectPath, relativePath);
        const content = await fs.readFile(fullPath, 'utf-8');
        return JSON.parse(content) as T;
    } catch (error) {
        return null;
    }
}

export async function writeJsonFile<T>(projectPath: string, relativePath: string, data: T): Promise<void> {
    const fullPath = path.join(projectPath, relativePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    const tempPath = `${fullPath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tempPath, fullPath);
}

export async function readTasks(projectPath: string): Promise<TasksData | null> {
    return readJsonFile<TasksData>(projectPath, PROJECT_FILES.tasks);
}

export async function writeTasks(projectPath: string, data: TasksData): Promise<void> {
    return writeJsonFile(projectPath, PROJECT_FILES.tasks, data);
}

export async function readWorkflow(projectPath: string): Promise<Workflow | null> {
    return readJsonFile<Workflow>(projectPath, PROJECT_FILES.workflow);
}

export async function writeWorkflow(projectPath: string, data: Workflow): Promise<void> {
    return writeJsonFile(projectPath, PROJECT_FILES.workflow, data);
}

export async function readWorkflows(projectPath: string): Promise<Workflow[]> {
    let workflows = await readJsonFile<Workflow[]>(projectPath, PROJECT_FILES.workflows);

    // Migration: If no workflows.json but workflow.json exists, migrate it
    if (!workflows) {
        const legacyWorkflow = await readWorkflow(projectPath);
        if (legacyWorkflow) {
            // Assign a default ID if missing
            const migrated: Workflow = {
                ...legacyWorkflow,
                id: 'default',
                title: 'Default Workflow',
                description: 'Migrated legacy workflow',
                isDefault: true
            };
            workflows = [migrated];
            await writeWorkflows(projectPath, workflows);
        } else {
            workflows = [];
        }
    }
    return workflows;
}

export async function writeWorkflows(projectPath: string, data: Workflow[]): Promise<void> {
    return writeJsonFile(projectPath, PROJECT_FILES.workflows, data);
}

export async function saveWorkflow(projectPath: string, workflow: Workflow): Promise<void> {
    const workflows = await readWorkflows(projectPath);
    const index = workflows.findIndex(w => w.id === workflow.id);
    if (index >= 0) {
        workflows[index] = workflow;
    } else {
        workflows.push(workflow);
    }

    // Ensure unique default
    if (workflow.isDefault) {
        workflows.forEach(w => {
            if (w.id !== workflow.id) w.isDefault = false;
        });
    }

    await writeWorkflows(projectPath, workflows);
}

export async function deleteWorkflow(projectPath: string, workflowId: string): Promise<void> {
    const workflows = await readWorkflows(projectPath);
    const filtered = workflows.filter(w => w.id !== workflowId);
    await writeWorkflows(projectPath, filtered);
}

export async function readSchedule(projectPath: string): Promise<Schedule | null> {
    return readJsonFile<Schedule>(projectPath, PROJECT_FILES.schedule);
}

export async function writeSchedule(projectPath: string, data: Schedule): Promise<void> {
    return writeJsonFile(projectPath, PROJECT_FILES.schedule, data);
}

export async function appendProgress(projectPath: string, entry: { taskId: string; taskTitle: string; summary: string; commitHash?: string }): Promise<void> {
    const fullPath = path.join(projectPath, PROJECT_FILES.progress);
    const timestamp = new Date().toISOString();
    const formattedEntry = `\n## ${timestamp} - ${entry.taskId}: ${entry.taskTitle}\n${entry.summary}\n${entry.commitHash ? `- Committed: ${entry.commitHash}` : ''}\n`;
    try {
        await fs.appendFile(fullPath, formattedEntry, 'utf-8');
    } catch {
        const header = `# Progress Log\n\n`;
        await fs.writeFile(fullPath, header + formattedEntry, 'utf-8');
    }
}

export async function isValidProject(projectPath: string): Promise<boolean> {
    try {
        return (await fs.stat(projectPath)).isDirectory();
    } catch {
        return false;
    }
}

export async function initializeProject(projectPath: string, projectName: string, defaultSteps: typeof DEFAULT_WORKFLOW_STEPS): Promise<void> {
    await ensureProjectStructure(projectPath);
    const now = new Date().toISOString();
    await writeTasks(projectPath, { project: { name: projectName, path: projectPath, createdAt: now, lastModified: now }, epics: [] });
    await writeWorkflow(projectPath, {
        id: 'default',
        title: 'Default Workflow',
        description: 'Standard workflow',
        isDefault: true,
        steps: defaultSteps,
        agentCommand: 'claude -p "{{prompt}}"',
        workingDirectory: projectPath,
        permissions: { allowShell: true, allowGit: true, requireApproval: false }
    });
    await writeSchedule(projectPath, { runs: [] });
    await fs.writeFile(path.join(projectPath, PROJECT_FILES.progress), `# Progress Log\n\nFor ${projectName}\n`, 'utf-8');
}
