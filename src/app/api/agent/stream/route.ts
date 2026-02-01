
import { NextRequest, NextResponse } from 'next/server';
import { readTasks, isValidProject } from '@/lib/file-storage';
import path from 'path';
import fs from 'fs';

export const runtime = 'nodejs';

function createLogStream(projectPath: string, taskId: string) {
    const encoder = new TextEncoder();
    const logPath = path.join(projectPath, 'plan/logs', `${taskId}.log`);

    return new ReadableStream({
        start(controller) {
            (async () => {
                if (!(await isValidProject(projectPath))) {
                    controller.enqueue(encoder.encode("[Error] Invalid project path\n"));
                    controller.close();
                    return;
                }

                // Initial connection message to debug frontend State
                controller.enqueue(encoder.encode(`[System] Stream connected for task: ${taskId}\n`));

                // 2. Check if log file exists
                if (!fs.existsSync(logPath)) {
                    controller.enqueue(encoder.encode("[System] Waiting for logs...\n"));
                }

                // 3. Helper to read new content
                let currentSize = 0;
                const readNewContent = () => {
                    if (!fs.existsSync(logPath)) return;

                    try {
                        const stats = fs.statSync(logPath);
                        if (stats.size > currentSize) {
                            const buffer = Buffer.alloc(stats.size - currentSize);
                            const fd = fs.openSync(logPath, 'r');
                            fs.readSync(fd, buffer, 0, buffer.length, currentSize);
                            fs.closeSync(fd);
                            currentSize = stats.size;
                            controller.enqueue(encoder.encode(buffer.toString()));
                        }
                    } catch (err) {
                        console.error("Error reading log:", err);
                    }
                };

                // 4. Initial read (read everything so far)
                readNewContent();

                // 5. Polling instead of watch
                const pollInterval = setInterval(() => {
                    readNewContent();
                }, 100); // Check every 100ms for snappier UI

                // 6. Check for Task Completion (to close stream)
                const checkInterval = setInterval(async () => {
                    const tasks = await readTasks(projectPath);
                    const task = tasks?.epics.flatMap(e => e.tasks).find(t => t.id === taskId);
                    if (task && (task.status === 'completed' || task.status === 'failed')) {
                        // One last read to ensure we got everything
                        readNewContent();
                        clearInterval(checkInterval);
                        clearInterval(pollInterval);
                        controller.close();
                    }
                }, 2000);

                // Cleanup if the client disconnects (handled by stream cancellation usually)
                // Next.js might not expose the cancellation token easily here in the callback
            })();
        },
        cancel() {
            // Cleanup would go here if we had references accessible
        }
    });
}

export async function POST(req: NextRequest) {
    const { prompt, projectPath } = await req.json(); // prompt is taskId here
    const taskId = prompt;

    if (!projectPath || !taskId) {
        return NextResponse.json({ error: 'projectPath and taskId required' }, { status: 400 });
    }

    const stream = createLogStream(projectPath, taskId);

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
        },
    });
}
