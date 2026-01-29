'use client';

import React from 'react';
import { GanttChart as SVARGanttChart } from '@svar-ui/react-gantt';
import { useProject } from '@/context/ProjectContext';
import { Task, Epic } from '@/lib/types';

interface GanttTask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number; // 0-100
  type: 'task' | 'project' | 'milestone';
  project?: string; // For subtasks
  assignee?: string;
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
  assignee?: string;
}

export function GanttChart() {
  const { tasksData } = useProject();

  if (!tasksData) {
    return <div>Loading Gantt Chart...</div>;
  }

  const ganttTasks: (GanttTask | GanttProject)[] = [];

  tasksData.epics.forEach(epic => {
    // Add Epic as a project in Gantt chart
    const epicStartDate = epic.tasks.reduce((minDate, task) => {
      if (task.startDate && (!minDate || new Date(task.startDate) < minDate)) {
        return new Date(task.startDate);
      }
      return minDate;
    }, null as Date | null);

    const epicEndDate = epic.tasks.reduce((maxDate, task) => {
      if (task.endDate && (!maxDate || new Date(task.endDate) > maxDate)) {
        return new Date(task.endDate);
      }
      return maxDate;
    }, null as Date | null);

    // Calculate epic progress based on completed tasks
    const completedTasks = epic.tasks.filter(task => task.status === 'completed').length;
    const epicProgress = epic.tasks.length > 0 ? (completedTasks / epic.tasks.length) * 100 : 0;

    if (epicStartDate && epicEndDate) {
      ganttTasks.push({
        id: epic.id,
        name: epic.title,
        start: epicStartDate,
        end: epicEndDate,
        progress: epicProgress,
        type: 'project',
        assignee: epic.assignee,
      });
    }

    epic.tasks.forEach(task => {
      if (task.startDate && task.endDate) {
        ganttTasks.push({
          id: task.id,
          name: task.title,
          start: new Date(task.startDate),
          end: new Date(task.endDate),
          progress: task.status === 'completed' ? 100 : (task.status === 'in-progress' ? 50 : 0), // Basic progress
          type: 'task',
          project: epic.id, // Link to its parent epic
          assignee: task.assignee,
          // dependencies: ['task-123'], // Example for dependencies, need to implement
        });
      }
    });
  });

  return (
    <div style={{ height: 'calc(100vh - 100px)', width: '100%' }}>
      <SVARGanttChart
        tasks={ganttTasks}
        // Other props can be configured here
        // E.g., columnResize={true}, taskHeight={40}, rowHeight={40}, etc.
        // For actual implementation, more configuration will be needed based on requirements
      />
    </div>
  );
}
