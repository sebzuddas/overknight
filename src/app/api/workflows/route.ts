import { NextRequest, NextResponse } from 'next/server';
import { readWorkflows, saveWorkflow, deleteWorkflow } from '@/lib/file-storage';
import { Workflow } from '@/lib/types';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const projectPath = searchParams.get('projectPath');

        if (!projectPath) {
            return NextResponse.json({ message: 'Project path is required' }, { status: 400 });
        }

        const workflows = await readWorkflows(projectPath);
        return NextResponse.json(workflows);
    } catch (error) {
        console.error('Failed to get workflows:', error);
        return NextResponse.json({ message: 'Failed to get workflows' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const projectPath = searchParams.get('projectPath');
        const workflow = await request.json() as Workflow;

        if (!projectPath) {
            return NextResponse.json({ message: 'Project path is required' }, { status: 400 });
        }

        if (!workflow.id || !workflow.title) {
            return NextResponse.json({ message: 'Workflow ID and Title are required' }, { status: 400 });
        }

        await saveWorkflow(projectPath, workflow);
        return NextResponse.json({ message: 'Workflow saved successfully' });
    } catch (error) {
        console.error('Failed to save workflow:', error);
        return NextResponse.json({ message: 'Failed to save workflow' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const projectPath = searchParams.get('projectPath');
        const workflowId = searchParams.get('workflowId');

        if (!projectPath || !workflowId) {
            return NextResponse.json({ message: 'Project path and Workflow ID are required' }, { status: 400 });
        }

        await deleteWorkflow(projectPath, workflowId);
        return NextResponse.json({ message: 'Workflow deleted successfully' });
    } catch (error) {
        console.error('Failed to delete workflow:', error);
        return NextResponse.json({ message: 'Failed to delete workflow' }, { status: 500 });
    }
}
