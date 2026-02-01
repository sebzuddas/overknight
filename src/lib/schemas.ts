import { z } from 'zod';

// Define the schema for a workflow step's input
// This allows each step to have a custom structure for its prompt/configuration
export const WorkflowStepInputSchema = z.object({
    prompt: z.string().describe("The prompt template for the agent"),
    model: z.enum(['claude-3-5-sonnet-latest', 'gemini-1.5-pro', 'gpt-4o']).optional().describe("Override the default model"),
    temperature: z.number().min(0).max(1).optional().describe("Controls randomness"),
    additionalContext: z.string().optional().describe("Any extra context to inject"),
});

// A registry of predefined schemas for common agent tasks
export const AgentTaskSchemas = {
    'default': WorkflowStepInputSchema,
    'code-generation': WorkflowStepInputSchema.extend({
        language: z.string().default('typescript').describe("Target programming language"),
        framework: z.string().optional().describe("Framework to use (e.g. Next.js, React)"),
    }),
    'review': WorkflowStepInputSchema.extend({
        focus: z.enum(['security', 'performance', 'style', 'logic']).default('logic').describe("Main focus of the review"),
    }),
    'planning': WorkflowStepInputSchema.extend({
        granularity: z.enum(['high-level', 'detailed']).default('detailed'),
    })
};

// Type definitions inferred from schemas
export type WorkflowStepInput = z.infer<typeof WorkflowStepInputSchema>;

export const AgentConfigSchema = z.object({
    name: z.string().min(1, 'Agent Name is required'),
    command: z.string().min(1, 'Agent Command is required'),
    description: z.string().optional(),
});

export const ProjectInitSchema = z.object({
    projectName: z.string().min(1, 'Project Name is required'),
    agentConfig: AgentConfigSchema,
});

export type AgentConfigInput = z.infer<typeof AgentConfigSchema>;
export type ProjectInitInput = z.infer<typeof ProjectInitSchema>;
