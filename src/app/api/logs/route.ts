
import { NextRequest, NextResponse } from 'next/server';
import { readTaskLog, isValidProject } from '@/lib/file-storage';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const projectPath = searchParams.get('projectPath');
    const taskId = searchParams.get('taskId');

    if (!projectPath || !taskId) {
        return NextResponse.json({ error: 'projectPath and taskId required' }, { status: 400 });
    }

    if (!(await isValidProject(projectPath))) {
        return NextResponse.json({ error: 'Invalid project path' }, { status: 400 });
    }

    const content = await readTaskLog(projectPath, taskId);

    if (!content) {
        return NextResponse.json({ found: false, content: '' });
    }

    return NextResponse.json({ found: true, content });
}
