/**
 * LaunchD Manager
 * 
 * Manages macOS launchd plists for scheduled task execution.
 * Handles plist creation, installation, and pmset wake scheduling.
 */

import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';

const execAsync = promisify(exec);

const PLIST_DIR = path.join(os.homedir(), 'Library', 'LaunchAgents');
const PLIST_PREFIX = 'com.overknight.task';

export interface ScheduleOptions {
    taskId: string;
    projectPath: string;
    scheduledTime: Date;
    nodePath?: string;
}

export interface LaunchDResult {
    success: boolean;
    error?: string;
    plistPath?: string;
}

/**
 * Generate plist label from task ID
 */
function getPlistLabel(taskId: string): string {
    return `${PLIST_PREFIX}.${taskId}`;
}

/**
 * Get plist file path
 */
function getPlistPath(taskId: string): string {
    return path.join(PLIST_DIR, `${getPlistLabel(taskId)}.plist`);
}

/**
 * Generate the launchd plist XML content
 */
function generatePlistContent(options: ScheduleOptions): string {
    const { taskId, projectPath, scheduledTime, nodePath = '/usr/local/bin/node' } = options;
    const label = getPlistLabel(taskId);
    const scriptPath = path.join(projectPath, 'scripts', 'run-scheduled-task.js');
    const logPath = path.join(projectPath, 'plan', 'logs', `scheduled-${taskId}.log`);
    const errorLogPath = path.join(projectPath, 'plan', 'logs', `scheduled-${taskId}-err.log`);

    // Build caffeinate command that wraps node execution
    const command = `caffeinate -is ${nodePath} "${scriptPath}" "${taskId}" "${projectPath}"`;

    const month = scheduledTime.getMonth() + 1; // 0-indexed
    const day = scheduledTime.getDate();
    const hour = scheduledTime.getHours();
    const minute = scheduledTime.getMinutes();

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${label}</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>${command}</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Month</key>
        <integer>${month}</integer>
        <key>Day</key>
        <integer>${day}</integer>
        <key>Hour</key>
        <integer>${hour}</integer>
        <key>Minute</key>
        <integer>${minute}</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>${logPath}</string>
    <key>StandardErrorPath</key>
    <string>${errorLogPath}</string>
    <key>RunAtLoad</key>
    <false/>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
</dict>
</plist>`;
}

/**
 * Format date for pmset command
 * Format: MM/DD/YY HH:MM:SS
 */
function formatPmsetDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = '00';
    return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Install a launchd plist for a scheduled task
 */
export async function installScheduledTask(options: ScheduleOptions): Promise<LaunchDResult> {
    const { taskId } = options;
    const plistPath = getPlistPath(taskId);
    const label = getPlistLabel(taskId);

    try {
        // Ensure LaunchAgents directory exists
        await fs.mkdir(PLIST_DIR, { recursive: true });

        // Ensure logs directory exists
        const logsDir = path.join(options.projectPath, 'plan', 'logs');
        await fs.mkdir(logsDir, { recursive: true });

        // Generate and write plist
        const plistContent = generatePlistContent(options);
        await fs.writeFile(plistPath, plistContent, 'utf-8');

        // Load the plist with launchctl
        try {
            await execAsync(`launchctl load "${plistPath}"`);
        } catch (error) {
            // If already loaded, unload first then reload
            await execAsync(`launchctl unload "${plistPath}" 2>/dev/null || true`);
            await execAsync(`launchctl load "${plistPath}"`);
        }

        console.log(`[LaunchD] Installed plist: ${label}`);
        return { success: true, plistPath };

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[LaunchD] Failed to install plist:`, message);
        return { success: false, error: message };
    }
}

/**
 * Uninstall a launchd plist for a task
 */
export async function uninstallScheduledTask(taskId: string): Promise<LaunchDResult> {
    const plistPath = getPlistPath(taskId);

    try {
        // Unload from launchctl
        try {
            await execAsync(`launchctl unload "${plistPath}"`);
        } catch {
            // Ignore if not loaded
        }

        // Remove plist file
        try {
            await fs.unlink(plistPath);
        } catch {
            // Ignore if doesn't exist
        }

        console.log(`[LaunchD] Uninstalled plist for task: ${taskId}`);
        return { success: true };

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[LaunchD] Failed to uninstall plist:`, message);
        return { success: false, error: message };
    }
}

/**
 * Schedule a system wake event using pmset
 * NOTE: This requires sudo privileges
 */
export async function scheduleSystemWake(date: Date): Promise<LaunchDResult> {
    const formattedDate = formatPmsetDate(date);
    const command = `sudo pmset schedule wake "${formattedDate}"`;

    try {
        await execAsync(command);
        console.log(`[LaunchD] Scheduled system wake for: ${formattedDate}`);
        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[LaunchD] Failed to schedule wake:`, message);
        return { success: false, error: message };
    }
}

/**
 * Cancel a scheduled system wake event
 * NOTE: This requires sudo privileges
 */
export async function cancelSystemWake(date: Date): Promise<LaunchDResult> {
    const formattedDate = formatPmsetDate(date);
    const command = `sudo pmset schedule cancel wake "${formattedDate}"`;

    try {
        await execAsync(command);
        console.log(`[LaunchD] Cancelled system wake for: ${formattedDate}`);
        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message };
    }
}

/**
 * Get current scheduled wake events
 */
export async function getScheduledWakes(): Promise<string[]> {
    try {
        const { stdout } = await execAsync('pmset -g sched');
        return stdout.split('\n').filter(line => line.includes('wake'));
    } catch {
        return [];
    }
}

/**
 * Check if a plist is currently installed
 */
export async function isTaskScheduled(taskId: string): Promise<boolean> {
    const plistPath = getPlistPath(taskId);
    try {
        await fs.access(plistPath);
        return true;
    } catch {
        return false;
    }
}

/**
 * Get the node path on this system
 */
export async function getNodePath(): Promise<string> {
    try {
        const { stdout } = await execAsync('which node');
        return stdout.trim();
    } catch {
        return '/usr/local/bin/node';
    }
}

/**
 * Complete scheduling workflow: install plist + schedule wake
 */
export async function scheduleTask(options: ScheduleOptions): Promise<LaunchDResult> {
    // Get actual node path
    const nodePath = await getNodePath();
    const optionsWithNode = { ...options, nodePath };

    // Install launchd plist
    const plistResult = await installScheduledTask(optionsWithNode);
    if (!plistResult.success) {
        return plistResult;
    }

    // Schedule system wake (this will prompt for sudo)
    const wakeResult = await scheduleSystemWake(options.scheduledTime);
    if (!wakeResult.success) {
        console.warn(`[LaunchD] Wake scheduling failed (sudo required): ${wakeResult.error}`);
        // Don't fail the whole operation - plist is still installed
        return {
            success: true,
            plistPath: plistResult.plistPath,
            error: `Task scheduled, but wake scheduling failed: ${wakeResult.error}`
        };
    }

    return { success: true, plistPath: plistResult.plistPath };
}

/**
 * Complete unscheduling workflow: uninstall plist + cancel wake
 */
export async function unscheduleTask(taskId: string, scheduledTime?: Date): Promise<LaunchDResult> {
    const plistResult = await uninstallScheduledTask(taskId);

    if (scheduledTime) {
        await cancelSystemWake(scheduledTime);
    }

    return plistResult;
}
