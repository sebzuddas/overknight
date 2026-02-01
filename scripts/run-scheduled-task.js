#!/usr/bin/env node
/**
 * Standalone task runner for overnight scheduling.
 * This script runs independently of the Overknight server via launchd.
 * 
 * Usage: node run-scheduled-task.js <taskId> <projectPath>
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

// Configuration
const PLAN_DIR = 'plan';
const LOGS_DIR = `${PLAN_DIR}/logs`;

/**
 * Read and parse a JSON file
 */
async function readJsonFile(projectPath, relativePath) {
    try {
        const fullPath = path.join(projectPath, relativePath);
        const content = await fs.readFile(fullPath, 'utf-8');
        return JSON.parse(content);
    } catch {
        return null;
    }
}

/**
 * Write JSON file atomically
 */
async function writeJsonFile(projectPath, relativePath, data) {
    const fullPath = path.join(projectPath, relativePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    const tempPath = `${fullPath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tempPath, fullPath);
}

/**
 * Append to task log file
 */
async function appendLog(projectPath, taskId, content) {
    const logDir = path.join(projectPath, LOGS_DIR);
    const logFile = path.join(logDir, `${taskId}.log`);
    await fs.mkdir(logDir, { recursive: true });
    await fs.appendFile(logFile, content, 'utf-8');
}

/**
 * Find task by ID across all epics
 */
function findTask(tasksData, taskId) {
    for (const epic of tasksData.epics) {
        const task = epic.tasks.find(t => t.id === taskId);
        if (task) return { task, epic };
    }
    return null;
}

/**
 * Update task status in tasks.json
 */
async function updateTaskStatus(projectPath, taskId, status) {
    const tasksData = await readJsonFile(projectPath, `${PLAN_DIR}/tasks.json`);
    if (!tasksData) return;

    for (const epic of tasksData.epics) {
        const task = epic.tasks.find(t => t.id === taskId);
        if (task) {
            task.status = status;
            if (status === 'completed' || status === 'failed') {
                task.completedAt = new Date().toISOString();
            }
            break;
        }
    }

    await writeJsonFile(projectPath, `${PLAN_DIR}/tasks.json`, tasksData);
}

/**
 * Execute agent command and stream output
 */
function executeAgent(command, projectPath, taskId) {
    return new Promise((resolve, reject) => {
        const process = spawn(command, {
            cwd: projectPath,
            shell: true,
            env: { ...process.env }
        });

        let stdout = '';
        let stderr = '';

        process.stdout?.on('data', async (data) => {
            const chunk = data.toString();
            stdout += chunk;
            console.log(chunk);
            await appendLog(projectPath, taskId, chunk).catch(() => { });
        });

        process.stderr?.on('data', async (data) => {
            const chunk = data.toString();
            stderr += chunk;
            console.error(chunk);
            await appendLog(projectPath, taskId, chunk).catch(() => { });
        });

        process.on('close', (code) => {
            if (code === 0) {
                resolve(stdout);
            } else {
                reject(new Error(`Process exited with code ${code}: ${stderr}`));
            }
        });

        process.on('error', reject);
    });
}

/**
 * Build prompt for a workflow step
 */
function buildPrompt(step, task) {
    return `
# Task Context
- Task ID: ${task.id}
- Task Title: ${task.title}
- Description: ${task.description || 'No description'}
- Priority: ${task.priority}

# Workflow Step: ${step.name}
${step.prompt}

# Instructions
1. Focus only on this specific step
2. Make incremental changes
3. Commit changes with descriptive message
`.trim();
}

/**
 * Main execution
 */
async function main() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.error('Usage: node run-scheduled-task.js <taskId> <projectPath>');
        process.exit(1);
    }

    const [taskId, projectPath] = args;
    const startTime = new Date();

    console.log(`[Scheduler] Starting scheduled task: ${taskId}`);
    console.log(`[Scheduler] Project path: ${projectPath}`);
    console.log(`[Scheduler] Execution time: ${startTime.toISOString()}`);

    await appendLog(projectPath, taskId, `\n\n=== SCHEDULED EXECUTION: ${startTime.toISOString()} ===\n\n`);

    try {
        // Load tasks
        const tasksData = await readJsonFile(projectPath, `${PLAN_DIR}/tasks.json`);
        if (!tasksData) {
            throw new Error('Could not load tasks.json');
        }

        // Find the task
        const result = findTask(tasksData, taskId);
        if (!result) {
            throw new Error(`Task ${taskId} not found`);
        }

        const { task } = result;

        // Check if already completed
        if (task.status === 'completed') {
            console.log(`[Scheduler] Task ${taskId} already completed. Skipping.`);
            return;
        }

        // Load workflows
        const workflows = await readJsonFile(projectPath, `${PLAN_DIR}/workflows.json`) || [];

        // Find workflow
        let workflow = task.workflowId
            ? workflows.find(w => w.id === task.workflowId)
            : workflows.find(w => w.isDefault);

        if (!workflow && workflows.length > 0) {
            workflow = workflows[0];
        }

        if (!workflow) {
            throw new Error('No workflow found for task');
        }

        // Get agent command
        const agentCommand = workflow.agentCommand || 'gemini --approval-mode auto_edit -p "{{prompt}}"';

        // Update status to in-progress
        await updateTaskStatus(projectPath, taskId, 'in-progress');
        console.log(`[Scheduler] Task status set to in-progress`);

        // Execute each enabled step
        let allSuccessful = true;

        for (const step of workflow.steps.filter(s => s.enabled)) {
            console.log(`\n[Scheduler] Executing step: ${step.name}\n`);
            await appendLog(projectPath, taskId, `\n--- Step: ${step.name} ---\n`);

            const prompt = buildPrompt(step, task);
            const command = agentCommand.replace('{{prompt}}', prompt.replace(/"/g, '\\"'));

            try {
                await executeAgent(command, projectPath, taskId);
                console.log(`[Scheduler] Step completed: ${step.name}`);
            } catch (error) {
                console.error(`[Scheduler] Step failed: ${step.name}`, error.message);
                await appendLog(projectPath, taskId, `\n[ERROR] ${error.message}\n`);
                allSuccessful = false;
                break;
            }
        }

        // Update final status
        const finalStatus = allSuccessful ? 'completed' : 'failed';
        await updateTaskStatus(projectPath, taskId, finalStatus);

        const endTime = new Date();
        const duration = (endTime - startTime) / 1000;

        console.log(`\n[Scheduler] Task ${taskId} ${finalStatus} in ${duration}s`);
        await appendLog(projectPath, taskId, `\n=== FINISHED: ${finalStatus.toUpperCase()} (${duration}s) ===\n`);

        process.exit(allSuccessful ? 0 : 1);

    } catch (error) {
        console.error(`[Scheduler] Fatal error:`, error.message);
        await appendLog(projectPath, taskId, `\n[FATAL] ${error.message}\n`);
        await updateTaskStatus(projectPath, taskId, 'failed');
        process.exit(1);
    }
}

main();
