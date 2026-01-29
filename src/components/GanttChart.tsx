'use client';

import React from 'react';
import { Gantt as SVARGanttChart } from '@svar-ui/react-gantt';
import { useProject } from '@/context/ProjectContext';
import { Task, Epic } from '@/lib/types';

import '@svar-ui/react-gantt/style.css';

interface GanttTask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number; // 0-100
  type: 'task' | 'project' | 'milestone';
  parent?: string; // For hierarchy
  dependencies?: string[];
  // Other properties like status, description could be here if needed for rendering
}

interface GanttProject {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  type: 'project';
  open?: boolean;
}

const editorShape = [
  { type: "text", key: "text", label: "Task Name" },
  { type: "date", key: "start", label: "Start Date", time: true },
  { type: "number", key: "duration", label: "Duration (hrs)" }
];

// Basic configuration for SVAR Gantt
const scales = [
  { unit: "month", step: 1, format: "MMMM yyyy" },
  { unit: "day", step: 1, format: "d" },
  { unit: "hour", step: 1, format: "H:i" }
];

const columns = [
  { name: "text", label: "Task", tree: true, width: 200 },
  { name: "start", label: "Start", width: 150 },
  { name: "duration", label: "Duration", width: 80 }
];

export function GanttChart() {
  const { tasksData, updateTask } = useProject();

  const handleTaskUpdate = (task: GanttTask | GanttProject) => {
    // Only update tasks, not projects/epics for now
    if (task.type === 'project') return;

    // Check if it's a real update to avoid loops
    const originalTask = tasksData?.epics.flatMap(e => e.tasks).find(t => t.id === task.id);
    if (!originalTask) return;

    if (new Date(originalTask.startDate || '').getTime() !== new Date(task.start).getTime() ||
      new Date(originalTask.endDate || '').getTime() !== new Date(task.end).getTime()) {

      updateTask(task.id, {
        startDate: task.start.toISOString(),
        endDate: task.end.toISOString()
      });
    }
  };

  const ganttTasks = React.useMemo(() => {
    if (!tasksData) return [];

    const tasks: (GanttTask | GanttProject)[] = [];
    const addedIds = new Set<string>();

    if (!tasksData?.epics) return [];

    tasksData.epics.forEach(epic => {
      if (!epic) return;

      const safeTasks = epic.tasks || [];

      // Add Epic as a project in Gantt chart
      const epicStartDate = safeTasks.reduce((minDate, task) => {
        if (task?.startDate) {
          const d = new Date(task.startDate);
          if (!isNaN(d.getTime()) && (!minDate || d < minDate)) {
            return d;
          }
        }
        return minDate;
      }, null as Date | null);

      const epicEndDate = safeTasks.reduce((maxDate, task) => {
        const taskEnd = task?.endDate ? new Date(task.endDate) : (task?.startDate ? new Date(new Date(task.startDate).getTime() + 3600000) : null);
        if (taskEnd && !isNaN(taskEnd.getTime()) && (!maxDate || taskEnd > maxDate)) {
          return taskEnd;
        }
        return maxDate;
      }, null as Date | null);

      // Calculate epic progress based on completed tasks
      const completedTasks = safeTasks.filter(task => task?.status === 'completed').length;
      const epicProgress = safeTasks.length > 0 ? (completedTasks / safeTasks.length) * 100 : 0;

      // Default to Now if no tasks scheduled
      const finalEpicStart = epicStartDate || new Date();
      const finalEpicEnd = epicEndDate || new Date(finalEpicStart.getTime() + 86400000); // +1 day default

      if (!addedIds.has(epic.id)) {
        tasks.push({
          id: epic.id,
          name: epic.title,
          start: finalEpicStart,
          end: finalEpicEnd,
          progress: epicProgress,
          type: 'project',
          open: true,
        });
        addedIds.add(epic.id);
      }

      safeTasks.forEach(task => {
        if (!task || !task.id) return;
        if (!addedIds.has(task.id)) {
          const start = task.startDate ? new Date(task.startDate) : new Date();
          const end = task.endDate ? new Date(task.endDate) : new Date(start.getTime() + 3600000); // Default 1h duration

          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            tasks.push({
              id: task.id,
              name: task.title || 'Untitled Task',
              start: start,
              end: end,
              progress: task.status === 'completed' ? 100 : (task.status === 'in-progress' ? 50 : 0),
              type: 'task',
              parent: epic.id, // Link to its parent epic
            });
            addedIds.add(task.id);
          }
        }
      });
    });

    return tasks;
  }, [tasksData]);

  if (!tasksData) {
    return <div>Loading Gantt Chart...</div>;
  }

  return (
    <div style={{ height: 'calc(100vh - 100px)', width: '100%' }}>
      <SVARGanttChart
        tasks={ganttTasks}
        scales={scales}
        columns={columns}
        // @ts-expect-error: The editorShape prop from SVARGanttChart expects a different type definition.
        editorShape={editorShape}
        // @ts-expect-error: The onTaskUpdate prop from SVARGanttChart expects a different type definition.
        onTaskUpdate={handleTaskUpdate}
      />
    </div>
  );
}
