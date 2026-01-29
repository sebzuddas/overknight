import { createGitManager } from '../src/lib/git-manager';
import { createAgentRunner } from '../src/lib/agent-runner';
import { initializeProject } from '../src/lib/file-storage';
import { DEFAULT_WORKFLOW_STEPS } from '../src/lib/types';
import path from 'path';
import fs from 'fs/promises';

async function runIntegrationTest() {
    const testDir = path.join(process.cwd(), 'test-project');

    console.log('1. Setting up test project...');
    await fs.mkdir(testDir, { recursive: true });
    await initializeProject(testDir, 'Test Project', DEFAULT_WORKFLOW_STEPS);

    console.log('2. Initializing Git...');
    const gitManager = createGitManager(testDir);
    await gitManager.initIfNeeded();

    // Create dummy file to commit initial state
    await fs.writeFile(path.join(testDir, 'README.md'), '# Test Project');
    await gitManager.commitAll('Initial commit');

    console.log('3. Testing Branch Logic (Main Branch Mode)...');
    const taskId = 'task-test-1';
    // Note: We expect to stay on main branch now
    const initialBranch = await gitManager.getCurrentBranch();
    console.log(`   Initial branch: ${initialBranch}`);

    console.log('4. Testing Agent Runner (Mock)...');
    await fs.writeFile(path.join(testDir, 'plan/workflow.json'), JSON.stringify({
        steps: [
            { id: 'step-1', name: 'Test Step', prompt: 'Say hello', enabled: true }
        ],
        agentCommand: 'echo "Agent Output: {{prompt}}"',
        workingDirectory: testDir
    }, null, 2));

    const runner = createAgentRunner({
        projectPath: testDir,
        onStepComplete: (step, result) => {
            console.log(`   Step '${step.name}' completed: ${result.success ? 'SUCCESS' : 'FAILED'}`);
            console.log(`   Output: ${result.output.trim()}`);
        }
    });

    const result = await runner.runTask({
        id: taskId,
        title: 'Test Task',
        description: 'A test task',
        priority: 1,
        status: 'pending',
        branch: null,
        createdAt: new Date().toISOString(),
        completedAt: null
    });

    if (!result.success) {
        throw new Error('Agent run failed');
    }

    // Verify that branch is still initial branch
    const finalBranch = await gitManager.getCurrentBranch();
    if (finalBranch !== initialBranch) {
        throw new Error(`Expected branch to remain ${initialBranch}, but got ${finalBranch}`);
    }

    console.log('5. Verifying Progress Log...');
    const progress = await fs.readFile(path.join(testDir, 'plan/progress.md'), 'utf-8');
    if (!progress.includes(taskId)) {
        throw new Error('Progress log not updated');
    }

    console.log('6. Cleanup...');
    await fs.rm(testDir, { recursive: true, force: true });

    console.log('✅ Integration Test Passed (Main Branch Mode)!');
}

runIntegrationTest().catch(console.error);
