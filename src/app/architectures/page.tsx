'use client';

import { DrawioEmbed } from '@/components/DrawioEmbed';
import { ProjectProvider } from '@/context/ProjectContext'; // Assuming ProjectProvider is needed

export default function ArchitecturesPage() {
    // In a real application, you might get the current project ID/path from a global state, URL params, or a user selection.
    // For now, we'll pass a placeholder or get it from an appropriate context.
    // The DrawioEmbed component itself fetches based on `projectPath` from `useProject()`.

    return (
        <ProjectProvider>
            <div className="flex flex-col h-full">
                <h1 className="text-2xl font-bold p-4">Architecture Diagrams</h1>
                <div className="flex-grow p-4">
                    <DrawioEmbed />
                </div>
            </div>
        </ProjectProvider>
    );
}
