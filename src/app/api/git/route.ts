import { NextRequest, NextResponse } from 'next/server';
import { createGitManager } from '@/lib/git-manager';
import { isValidProject } from '@/lib/file-storage';

export async function GET(request: NextRequest) {
    const projectPath = request.nextUrl.searchParams.get('projectPath');
    const action = request.nextUrl.searchParams.get('action') || 'status';
    if (!projectPath || !(await isValidProject(projectPath))) return NextResponse.json({ error: 'Invalid project path' }, { status: 400 });

    const gitManager = createGitManager(projectPath);
    if (!(await gitManager.isGitRepo())) return NextResponse.json({ isRepo: false, message: 'Not a git repository' });

    switch (action) {
        case 'status': return NextResponse.json({ isRepo: true, ...(await gitManager.getStatus()) });
        case 'branches': return NextResponse.json({ branches: await gitManager.listBranches(), overknightBranches: await gitManager.listOverknightBranches() });
        case 'commits': return NextResponse.json({ commits: await gitManager.getCommitLog(parseInt(request.nextUrl.searchParams.get('count') || '20')) });
        default: return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
}

export async function POST(request: NextRequest) {
    const projectPath = request.nextUrl.searchParams.get('projectPath');
    if (!projectPath) return NextResponse.json({ error: 'projectPath required' }, { status: 400 });
    const body = await request.json();
    const gitManager = createGitManager(projectPath);

    switch (body.action) {
        case 'init': await gitManager.initIfNeeded(); return NextResponse.json({ success: true });
        case 'checkout': await gitManager.checkout(body.data.branchName); return NextResponse.json({ success: true });
        case 'reset': await gitManager.resetToCommit(body.data.commitHash); return NextResponse.json({ success: true });
        case 'createBranch': return NextResponse.json({ branchName: await gitManager.createTaskBranch(body.data.taskId) });
        default: return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
}
