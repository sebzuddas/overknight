import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

const ARCHITECTURES_DIR = path.join(process.cwd(), 'docs', 'architectures');

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const projectPath = searchParams.get('projectPath');

        // Ensure the architectures directory exists
        await fs.mkdir(ARCHITECTURES_DIR, { recursive: true });

        const files = await fs.readdir(ARCHITECTURES_DIR);
        const drawioFiles = files
            .filter(file => file.endsWith('.drawio'))
            .map(file => ({
                name: file,
                path: path.join('/docs/architectures', file).replace(/\\/g, '/'), // Use / for URL paths
            }));

        return NextResponse.json({ files: drawioFiles });
    } catch (error) {
        console.error('Failed to list architecture files:', error);
        return NextResponse.json({ message: 'Failed to list architecture files' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const projectPath = searchParams.get('projectPath'); // Not strictly used for pathing but for consistency
        const { action, data } = await request.json();

        if (action === 'create' && data?.fileName) {
            const filePath = path.join(ARCHITECTURES_DIR, data.fileName);
            // Check if file already exists
            try {
                await fs.access(filePath);
                return NextResponse.json({ message: 'File already exists' }, { status: 409 });
            } catch (error) {
                // File does not exist, proceed to create
            }

            // Minimal .drawio XML structure
            const initialContent = `<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="Gemini CLI" etag="" version="20.3.0" type="browser">
  <diagram id="initial_diagram" name="Page-1">
    <mxGraphModel dx="1000" dy="1000" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="850" pageHeight="1100" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

            await fs.writeFile(filePath, initialContent);
            const newFile = {
                name: data.fileName,
                path: path.join('/docs/architectures', data.fileName).replace(/\\/g, '/'),
            };
            return NextResponse.json(newFile, { status: 201 });
        }

        return NextResponse.json({ message: 'Invalid action or data' }, { status: 400 });
    } catch (error) {
        console.error('Failed to handle architecture file operation:', error);
        return NextResponse.json({ message: 'Failed to handle architecture file operation' }, { status: 500 });
    }
}
