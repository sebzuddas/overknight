import { spawn, ChildProcess } from 'child_process';
import { GitManager, createGitManager } from './git-manager';
import { readWorkflow, readTasks, writeTasks, appendProgress, appendTaskLog } from './file-storage';
import type { Task, WorkflowStep } from './types';
import treeKill from 'tree-kill';

export interface RunResult {
    success: boolean;
    branch: string;
    commitHash: string | null;
    steps: StepResult[];
    error?: string;
}

export interface StepResult {
    stepId: string;
    stepName: string;
    success: boolean;
    output: string;
    duration: number;
}

export interface AgentRunnerOptions {
    projectPath: string;
    onStepStart?: (step: WorkflowStep) => void;
    onStepComplete?: (step: WorkflowStep, result: StepResult) => void;
    onOutput?: (chunk: string) => void;
    onStandardError?: (chunk: string) => void;
    onError?: (error: Error) => void;
}

export class AgentRunner {
    private projectPath: string;
    private gitManager: GitManager;
    private options: AgentRunnerOptions;
    private currentProcess: ChildProcess | null = null;
    private currentTaskId: string | null = null;

    constructor(options: AgentRunnerOptions) {
        this.projectPath = options.projectPath;
        this.gitManager = createGitManager(options.projectPath);
        this.options = options;
    }

    async runTask(task: Task): Promise<RunResult> {
        this.currentTaskId = task.id;
        const workflow = await readWorkflow(this.projectPath);
        if (!workflow) {
            return { success: false, branch: '', commitHash: null, steps: [], error: 'No workflow found' };
        }

        await this.gitManager.initIfNeeded();

        // MODIFICATION: Use current branch instead of creating new one
        // const branch = await this.gitManager.createTaskBranch(task.id);
        const branch = await this.gitManager.getCurrentBranch();

        await this.updateTaskStatus(task.id, 'in-progress', branch);

        const stepResults: StepResult[] = [];
        let allSuccessful = true;

        for (const step of workflow.steps.filter(s => s.enabled)) {
            this.options.onStepStart?.(step);
            const startTime = Date.now();
            try {
                const prompt = this.buildPrompt(step, task);
                const output = await this.invokeAgent(workflow.agentCommand, prompt);
                const result = { stepId: step.id, stepName: step.name, success: true, output, duration: Date.now() - startTime };
                stepResults.push(result);
                this.options.onStepComplete?.(step, result);
            } catch (error) {
                const result = { stepId: step.id, stepName: step.name, success: false, output: String(error), duration: Date.now() - startTime };
                stepResults.push(result);
                allSuccessful = false;
                this.options.onStepComplete?.(step, result);
                this.options.onError?.(error instanceof Error ? error : new Error(String(error)));
                break;
            }
        }

        let commitHash: string | null = null;
        if (await this.gitManager.hasUncommittedChanges()) {
            const commitMessage = `feat(${task.id}): ${task.title}\n\nCompleted via OverKnight workflow`;
            commitHash = await this.gitManager.commitAll(commitMessage);
        }

        await this.updateTaskStatus(task.id, allSuccessful ? 'completed' : 'failed', branch);

        await appendProgress(this.projectPath, {
            taskId: task.id,
            taskTitle: task.title,
            summary: allSuccessful ? `Completed ${stepResults.length} steps` : 'Failed',
            commitHash: commitHash || undefined,
        });
        
        return { success: allSuccessful, branch, commitHash, steps: stepResults };
    }

    private buildPrompt(step: WorkflowStep, task: Task): string {
        return `
# Task Context
- Task ID: ${task.id}
- Task Title: ${task.title}
- Description: ${task.description}
- Priority: ${task.priority}

# Workflow Step: ${step.name}
${step.prompt}

# Instructions
1. Focus only on this specific step
2. Make incremental changes
3. Commit changes with descriptive message
`.trim();
    }

    private invokeAgent(commandTemplate: string, prompt: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const command = commandTemplate.replace('{{prompt}}', prompt.replace(/"/g, '\"'));
            console.log(`[AgentRunner] Executing command: ${command}`);
            // Fix: Pass full command string when using shell: true
            this.currentProcess = spawn(command, { cwd: this.projectPath, shell: true, env: { ...process.env } });

            // Initialize log file
            if (this.currentTaskId) {
                console.log(`[AgentRunner] Initializing log for task: ${this.currentTaskId}`);
                appendTaskLog(this.projectPath, this.currentTaskId, `\n--- Executing: ${commandTemplate} ---\n`).catch(console.error);
            }

            let stdout = '', stderr = '';
            let isCompleted = false;

            this.currentProcess.stdout?.on('data', d => {
                const chunk = d.toString();
                console.log(`[AgentRunner] stdout: ${chunk}`);
                stdout += chunk;
                if (this.currentTaskId) appendTaskLog(this.projectPath, this.currentTaskId, chunk).catch(console.error);
                this.options.onOutput?.(chunk);

                // Check for completion message
                if (chunk.includes("Task complete. All changes committed. I'm done.")) {
                    console.log('[AgentRunner] Detected completion message. Force stopping process.');
                    isCompleted = true;
                    if (this.currentProcess?.pid) {
                        treeKill(this.currentProcess.pid, 'SIGTERM');
                    }
                }
            });

            this.currentProcess.stderr?.on('data', d => {
                const chunk = d.toString();
                console.log(`[AgentRunner] stderr: ${chunk}`);
                stderr += chunk;
                if (this.currentTaskId) appendTaskLog(this.projectPath, this.currentTaskId, chunk).catch(console.error);
                this.options.onStandardError?.(chunk);
            });

            this.currentProcess.on('close', (code, signal) => {
                console.log(`[AgentRunner] Process closed with code: ${code}, signal: ${signal}`);
                this.currentProcess = null;
                // Resolve if code is 0 OR if we explicitly marked it as completed (force killed)
                if (code === 0 || isCompleted) {
                    resolve(stdout);
                } else {
                    reject(new Error(`Exit ${code} (Signal: ${signal}): ${stderr}`));
                }
            });

            this.currentProcess.on('error', err => {
                console.error(`[AgentRunner] Process error:`, err);
                this.currentProcess = null;
                reject(err);
            });
        });
    }

    private async updateTaskStatus(taskId: string, status: Task['status'], branch: string | null): Promise<void> {
        const tasksData = await readTasks(this.projectPath);
        if (!tasksData) return;
        for (const epic of tasksData.epics) {
            const task = epic.tasks.find(t => t.id === taskId);
            if (task) {
                task.status = status;
                task.branch = branch;
                if (status === 'completed') task.completedAt = new Date().toISOString();
                break;
            }
        }
        await writeTasks(this.projectPath, tasksData);
    }

    cancel(): void {
        console.log(`[AgentRunner] Cancel called. PID: ${this.currentProcess?.pid}, Process exists: ${!!this.currentProcess}`);
        if (this.currentProcess && this.currentProcess.pid) {
            console.log(`[AgentRunner] Killing process tree: ${this.currentProcess.pid}`);
            treeKill(this.currentProcess.pid, 'SIGTERM', (err: Error) => {
                if (err) console.error('[AgentRunner] Failed to kill process tree:', err);
                else console.log('[AgentRunner] Process tree killed successfully');
            });
            this.currentProcess = null;
        } else {
            console.warn('[AgentRunner] Cancel called but no valid process/PID found');
        }
    }
}

export function createAgentRunner(options: AgentRunnerOptions): AgentRunner {
    return new AgentRunner(options);
}
