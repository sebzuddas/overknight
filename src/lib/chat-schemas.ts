import { z } from 'zod';

// Supported LLM providers
export const LLMProviderSchema = z.enum(['gemini', 'openai', 'anthropic']);
export type LLMProvider = z.infer<typeof LLMProviderSchema>;

// Chat message schema
export const ChatMessageSchema = z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
});

// Chat request schema with validation
export const ChatRequestSchema = z.object({
    messages: z.array(z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string(),
        id: z.string().optional(),
        parts: z.array(z.object({
            type: z.string(),
            text: z.string().optional(),
        })).optional(),
    })),
    projectPath: z.string().min(1, 'Project path is required'),
    taskId: z.string().min(1, 'Task ID is required'),
    provider: LLMProviderSchema.optional().default('gemini'),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

// Provider configuration schema (for settings)
export const ProviderConfigSchema = z.object({
    provider: LLMProviderSchema,
    model: z.string().optional(),
    apiKey: z.string().optional(), // Can be set via env var instead
});

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

// Default models per provider
export const DEFAULT_MODELS: Record<LLMProvider, string> = {
    gemini: 'gemini-2.0-flash',
    openai: 'gpt-4o',
    anthropic: 'claude-3-5-sonnet-latest',
};
