import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST() {
    try {
        // macOS only: use osascript to open a native folder picker
        const { stdout } = await execAsync("osascript -e 'POSIX path of (choose folder)'");
        const path = stdout.trim();

        if (!path) {
            return NextResponse.json({ cancelled: true });
        }

        return NextResponse.json({ path });
    } catch (error) {
        console.error('File picker error:', error);
        // If user cancelled, osascript usually throws "User canceled" (exit code 1)
        if (String(error).includes('User canceled')) {
            return NextResponse.json({ cancelled: true });
        }
        return NextResponse.json({ error: 'Failed to open file picker' }, { status: 500 });
    }
}
