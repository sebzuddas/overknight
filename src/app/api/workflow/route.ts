import { NextRequest, NextResponse } from 'next/server';
import { readWorkflow, writeWorkflow, isValidProject } from '@/lib/file-storage';
import { DEFAULT_WORKFLOW_STEPS } from '@/lib/types';
import type { WorkflowStep } from '@/lib/types';

export async function GET(request: NextRequest) {
    const projectPath = request.nextUrl.searchParams.get('projectPath');
    if (!projectPath || !(await isValidProject(projectPath))) return NextResponse.json({ error: 'Invalid project path' }, { status: 400 });
    const workflow = await readWorkflow(projectPath);
    return NextResponse.json(workflow || { steps: DEFAULT_WORKFLOW_STEPS, agent: DEFAULT_AGENTS[0].name, workingDirectory: projectPath });
}

export async function POST(request: NextRequest) {
    const projectPath = request.nextUrl.searchParams.get('projectPath');
    if (!projectPath) return NextResponse.json({ error: 'projectPath required' }, { status: 400 });
    const body = await request.json();
    const { action, data } = body;

    if (action === 'update') {
        const existingWorkflow = await readWorkflow(projectPath);
        if (!existingWorkflow) {
            return NextResponse.json({ error: 'Workflow not found to update' }, { status: 404 });
        }
        const updatedWorkflow = {
            ...existingWorkflow,
            steps: data.steps || existingWorkflow.steps,
            workingDirectory: data.workingDirectory || existingWorkflow.workingDirectory || projectPath,
            permissions: data.permissions || existingWorkflow.permissions || { allowShell: true, allowGit: true, requireApproval: false },
            agent: data.agent || existingWorkflow.agent,
        };
        await writeWorkflow(projectPath, updatedWorkflow);
        return NextResponse.json(await readWorkflow(projectPath));
    }

    const workflow = await readWorkflow(projectPath);
    if (!workflow) return NextResponse.json({ error: 'No workflow found' }, { status: 404 });

    switch (action) {
        case 'updateStep': {
            const step = workflow.steps.find(s => s.id === data.stepId);
            if (step) Object.assign(step, data.updates);
            await writeWorkflow(projectPath, workflow);
            return NextResponse.json(step);
        }
        case 'addStep': {
            const step: WorkflowStep = { id: `step-${Date.now()}`, name: data.name, prompt: data.prompt, enabled: true };
            workflow.steps.push(step);
            await writeWorkflow(projectPath, workflow);
            return NextResponse.json(step);
        }
        case 'removeStep': {
            workflow.steps = workflow.steps.filter(s => s.id !== data.stepId);
            await writeWorkflow(projectPath, workflow);
            return NextResponse.json({ success: true });
        }
        case 'reorderSteps': {
            const stepMap = new Map(workflow.steps.map(s => [s.id, s]));
            workflow.steps = data.stepIds.map((id: string) => stepMap.get(id)).filter(Boolean) as WorkflowStep[];
            await writeWorkflow(projectPath, workflow);
            return NextResponse.json({ success: true });
        }
        default: return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
}
