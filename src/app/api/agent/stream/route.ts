
import { NextRequest, NextResponse } from 'next/server';
import { createAgentRunner } from '@/lib/agent-runner';
import { readTasks, isValidProject } from '@/lib/file-storage';
import { Task, DEFAULT_AGENTS } from '@/lib/types';


export const runtime = 'nodejs';

// This function creates a stream that wraps the agent execution
function createAgentStream(projectPath: string, taskId: string) {
    const encoder = new TextEncoder();

    return new ReadableStream({
        start(controller) {
            // We use an immediately invoked async function so we don't return the promise to 'start'
            // This ensures the stream is created immediately and data flows as it becomes available
            (async () => {
                try {
                    // validate project
                    if (!(await isValidProject(projectPath))) {
                        controller.enqueue(encoder.encode("[Error] Invalid project path\n"));
                        return;
                    }

                    // find task
                    const tasksData = await readTasks(projectPath);
                    let targetTask: Task | undefined;
                    for (const epic of tasksData?.epics || []) {
                        targetTask = epic.tasks.find(t => t.id === taskId);
                        if (targetTask) break;
                    }

                    if (!targetTask) {
                        controller.enqueue(encoder.encode("[Error] Task not found\n"));
                        return;
                    }

                    // Initialize Runner with stream callbacks
                    const runner = createAgentRunner({
                        projectPath,
                        onOutput: (chunk) => {
                            controller.enqueue(encoder.encode(chunk));
                        },
                        onStandardError: (chunk) => {
                            // Optional: colorize or prefix error output
                            controller.enqueue(encoder.encode(`[stderr] ${chunk}`));
                        },
                        onError: (err) => {
                            controller.enqueue(encoder.encode(`\n[System Error] ${err.message}\n`));
                        },
                        onStepStart: (step) => {
                            controller.enqueue(encoder.encode(`\n--- Step: ${step.name} ---\n`));
                        },
                        onStepComplete: (step, result) => {
                            controller.enqueue(encoder.encode(`\n--- Step Completed: ${result.success ? 'Success' : 'Failed'} (${result.duration}ms) ---\n`));
                        },
                        availableAgents: DEFAULT_AGENTS
                    });


                    controller.enqueue(encoder.encode(`[System] Starting task: ${targetTask.title} (${targetTask.id})\n`));

                    // Run the task
                    const result = await runner.runTask(targetTask);

                    if (result.success) {
                        controller.enqueue(encoder.encode(`\n[System] Workflow completed successfully.\n`));
                    } else {
                        controller.enqueue(encoder.encode(`\n[System] Workflow failed.\n`));
                    }
                } catch (error) {
                    controller.enqueue(encoder.encode(`\n[Fatal Error] ${String(error)}\n`));
                } finally {
                    controller.close();
                }
            })();
        }
    });
}

export async function POST(req: NextRequest) {
    // The client sends { prompt: "taskId" } or { taskId: "..." }
    // standard useCompletion sends { prompt }
    const { prompt, projectPath } = await req.json();

    if (!projectPath) {
        return NextResponse.json({ error: 'projectPath required' }, { status: 400 });
    }

    // transform the stream to a Response
    const stream = createAgentStream(projectPath, prompt);

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
        },
    });
}
