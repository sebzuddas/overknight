import { streamText, convertToModelMessages, UIMessage } from 'ai';
import { google } from '@ai-sdk/google';
import { NextRequest } from 'next/server';
import { ChatRequestSchema, DEFAULT_MODELS, LLMProvider } from '@/lib/chat-schemas';
import { readTasks, appendTaskLog } from '@/lib/file-storage';

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow streaming responses up to 60 seconds

// Get the model based on provider
function getModel(provider: LLMProvider, modelName?: string) {
    const model = modelName || DEFAULT_MODELS[provider];

    switch (provider) {
        case 'gemini':
            return google(model);
        case 'openai':
            // Would need @ai-sdk/openai installed
            throw new Error('OpenAI provider not yet configured. Install @ai-sdk/openai and add API key.');
        case 'anthropic':
            // Would need @ai-sdk/anthropic installed
            throw new Error('Anthropic provider not yet configured. Install @ai-sdk/anthropic and add API key.');
        default:
            return google(DEFAULT_MODELS.gemini);
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Validate request with Zod
        const validationResult = ChatRequestSchema.safeParse(body);
        if (!validationResult.success) {
            return new Response(
                JSON.stringify({ error: 'Invalid request', details: validationResult.error.flatten() }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const { messages, projectPath, taskId, provider } = validationResult.data;

        // Get task context for system prompt
        const tasksData = await readTasks(projectPath);
        const task = tasksData?.epics.flatMap(e => e.tasks).find(t => t.id === taskId);

        const systemPrompt = `You are an AI coding assistant helping with a development task.

## Current Task Context
- **Task ID**: ${taskId}
- **Task Title**: ${task?.title || 'Unknown'}
- **Task Description**: ${task?.description || 'No description'}
- **Task Status**: ${task?.status || 'Unknown'}
- **Priority**: ${task?.priority || 'Unknown'}
- **Project Path**: ${projectPath}

## Instructions
1. Help the user with questions about this task
2. Provide code suggestions, explanations, and guidance
3. Be concise but thorough
4. If you make suggestions, explain your reasoning
5. Reference specific files and line numbers when applicable

You have access to the context of the current task. Help the user complete it efficiently.`;

        // Log user message to task log
        const lastUserMessage = messages.filter(m => m.role === 'user').pop();
        if (lastUserMessage && task) {
            const content = typeof lastUserMessage.content === 'string'
                ? lastUserMessage.content
                : lastUserMessage.parts?.find(p => p.type === 'text')?.text || '';
            await appendTaskLog(projectPath, taskId, `\n[Chat User] ${content}\n`);
        }

        const model = getModel(provider);

        const result = streamText({
            model,
            system: systemPrompt,
            messages: await convertToModelMessages(messages as UIMessage[]),
            onFinish: async ({ text }) => {
                // Log assistant response to task log
                if (task) {
                    await appendTaskLog(projectPath, taskId, `\n[Chat Assistant] ${text}\n`);
                }
            },
        });

        return result.toUIMessageStreamResponse();

    } catch (error) {
        console.error('[Chat API Error]', error);

        const message = error instanceof Error ? error.message : 'Unknown error';
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
