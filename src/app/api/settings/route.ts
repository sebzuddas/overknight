import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

// API key environment variable names per provider
const API_KEY_ENV_VARS: Record<string, string> = {
    gemini: 'GOOGLE_GENERATIVE_AI_API_KEY',
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
};

// Path to .env.local in the overknight app directory
function getEnvPath(): string {
    // This app's root directory
    return path.join(process.cwd(), '.env.local');
}

// Parse existing .env.local file
async function parseEnvFile(envPath: string): Promise<Record<string, string>> {
    try {
        const content = await fs.readFile(envPath, 'utf-8');
        const lines = content.split('\n');
        const env: Record<string, string> = {};

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;

            const eqIndex = trimmed.indexOf('=');
            if (eqIndex > 0) {
                const key = trimmed.substring(0, eqIndex).trim();
                let value = trimmed.substring(eqIndex + 1).trim();
                // Remove quotes if present
                if ((value.startsWith('"') && value.endsWith('"')) ||
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                env[key] = value;
            }
        }
        return env;
    } catch {
        return {};
    }
}

// Write env file
async function writeEnvFile(envPath: string, env: Record<string, string>): Promise<void> {
    const lines = [
        '# OverKnight API Configuration',
        '# Auto-generated - do not edit directly',
        '',
    ];

    for (const [key, value] of Object.entries(env)) {
        if (value) {
            lines.push(`${key}=${value}`);
        }
    }

    await fs.writeFile(envPath, lines.join('\n') + '\n', 'utf-8');
}

// GET - Read current API key status (keys are masked)
export async function GET() {
    try {
        const envPath = getEnvPath();
        const env = await parseEnvFile(envPath);

        // Return masked status for each provider
        const status: Record<string, { configured: boolean; masked: string }> = {};

        for (const [provider, envVar] of Object.entries(API_KEY_ENV_VARS)) {
            const value = env[envVar] || process.env[envVar];
            if (value) {
                // Mask the key showing only first 4 and last 4 chars
                const masked = value.length > 12
                    ? `${value.slice(0, 4)}${'*'.repeat(8)}${value.slice(-4)}`
                    : '*'.repeat(value.length);
                status[provider] = { configured: true, masked };
            } else {
                status[provider] = { configured: false, masked: '' };
            }
        }

        return NextResponse.json({ status, providers: Object.keys(API_KEY_ENV_VARS) });
    } catch (error) {
        console.error('[Settings API] Error reading settings:', error);
        return NextResponse.json(
            { error: 'Failed to read settings' },
            { status: 500 }
        );
    }
}

// POST - Update API keys
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { provider, apiKey } = body;

        if (!provider || !API_KEY_ENV_VARS[provider]) {
            return NextResponse.json(
                { error: 'Invalid provider' },
                { status: 400 }
            );
        }

        const envVar = API_KEY_ENV_VARS[provider];
        const envPath = getEnvPath();

        // Read existing env
        const env = await parseEnvFile(envPath);

        // Update or remove the key
        if (apiKey && apiKey.trim()) {
            env[envVar] = apiKey.trim();
        } else {
            delete env[envVar];
        }

        // Write back
        await writeEnvFile(envPath, env);

        return NextResponse.json({
            success: true,
            message: `${provider} API key ${apiKey ? 'saved' : 'removed'}. Restart the server to apply changes.`,
            restartRequired: true,
        });
    } catch (error) {
        console.error('[Settings API] Error saving settings:', error);
        return NextResponse.json(
            { error: 'Failed to save settings' },
            { status: 500 }
        );
    }
}
