import { NextRequest, NextResponse } from 'next/server';
import { readTaskLog, isValidProject } from '@/lib/file-storage';

export async function GET(request: NextRequest) {
    const projectPath = request.nextUrl.searchParams.get('projectPath');
    const taskId = request.nextUrl.searchParams.get('taskId');

    if (!projectPath || !taskId) return NextResponse.json({ error: 'projectPath and taskId required' }, { status: 400 });
    if (!(await isValidProject(projectPath))) return NextResponse.json({ error: 'Invalid project path' }, { status: 400 });

    const logs = await readTaskLog(projectPath, taskId);
    return NextResponse.json({ logs });
}
