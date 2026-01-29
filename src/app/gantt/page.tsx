'use client';

import { GanttChart } from '@/components/GanttChart';
import { ProjectProvider } from '@/context/ProjectContext'; // Assuming ProjectProvider is needed

export default function GanttPage() {
  return (
    <ProjectProvider>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Gantt Chart</h1>
        <GanttChart />
      </div>
    </ProjectProvider>
  );
}
