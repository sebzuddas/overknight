import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

const ARCHITECTURES_DIR = path.join(process.cwd(), 'docs', 'architectures');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectPath = searchParams.get('projectPath');
    const fileName = searchParams.get('fileName');

    // Ensure the architectures directory exists
    await fs.mkdir(ARCHITECTURES_DIR, { recursive: true });

    if (fileName) {
      const filePath = path.join(ARCHITECTURES_DIR, fileName);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        return new NextResponse(content, {
          headers: { 'Content-Type': 'application/xml' } // drawio files are XML
        });
      } catch (error) {
        console.error(`Failed to read file ${fileName}:`, error);
        return NextResponse.json({ message: 'File not found' }, { status: 404 });
      }
    }

    const files = await fs.readdir(ARCHITECTURES_DIR);
    const drawioFiles = files
      .filter(file => file.endsWith('.drawio'))
      .map(file => ({
        name: file,
        path: file, // Just use filename as ID/path since we can't serve it directly anyway
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
      const { templateUrl } = data; // Extract templateUrl

      // Check if file already exists
      try {
        await fs.access(filePath);
        return NextResponse.json({ message: 'File already exists' }, { status: 409 });
      } catch (error) {
        // File does not exist, proceed to create
      }

      let fileContent = '';
      if (templateUrl) {
        try {
          const response = await fetch(templateUrl);
          if (!response.ok) {
            console.warn(`Failed to fetch template from ${templateUrl}. Status: ${response.status}`);
            // Fallback to blank diagram if template fetch fails
            fileContent = `<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="Gemini CLI" etag="" version="20.3.0" type="browser">
  <diagram id="initial_diagram" name="Page-1">
    <mxGraphModel dx="1000" dy="1000" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="850" pageHeight="1100" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
          } else {
            fileContent = await response.text();
          }
        } catch (fetchError) {
          console.error(`Error fetching template from ${templateUrl}:`, fetchError);
          // Fallback to blank diagram on network error
          fileContent = `<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="Gemini CLI" etag="" version="20.3.0" type="browser">
  <diagram id="initial_diagram" name="Page-1">
    <mxGraphModel dx="1000" dy="1000" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="850" pageHeight="1100" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
        }
      } else {
        // Original minimal .drawio XML structure
        fileContent = `<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="Gemini CLI" etag="" version="20.3.0" type="browser">
  <diagram id="initial_diagram" name="Page-1">
    <mxGraphModel dx="1000" dy="1000" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="850" pageHeight="1100" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
      }

      await fs.writeFile(filePath, fileContent);
      const newFile = {
        name: data.fileName,
        path: data.fileName,
      };
      return NextResponse.json(newFile, { status: 201 });
    }

    return NextResponse.json({ message: 'Invalid action or data' }, { status: 400 });
  } catch (error) {
    console.error('Failed to handle architecture file operation:', error);
    return NextResponse.json({ message: 'Failed to handle architecture file operation' }, { status: 500 });
  }
}
