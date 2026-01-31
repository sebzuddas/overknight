// Core types for OverKnight

export interface Project {
  name: string;
  path: string;
  createdAt: string;
  lastModified: string;
}

export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'failed';
export type Priority = 1 | 2 | 3 | 4 | 5;

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  branch: string | null;
  createdAt: string;
  completedAt: string | null;
  startDate?: string;
  endDate?: string;
  assignee?: string;
  workflowId?: string; // ID of the workflow to use for this task
  workflowMandatory?: boolean;
  agent?: string;
}

export interface Epic {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  tasks: Task[];
  createdAt: string;
  assignee?: string;
}

export interface TasksData {
  project: Project;
  epics: Epic[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  prompt: string;
  enabled: boolean;
}

export interface WorkflowPermissions {
  allowShell: boolean;
  allowGit: boolean;
  requireApproval: boolean;
}

export interface Workflow {
  id: string; // Unique ID
  title: string; // Human readable title
  description?: string;
  steps: WorkflowStep[];
  workingDirectory: string;
  permissions: WorkflowPermissions;
  isDefault?: boolean;
  agent?: string;
}

export interface ScheduledRun {
  id: string;
  taskIds: string[];
  scheduledTime: string;
  status: 'pending' | 'running' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface Schedule {
  runs: ScheduledRun[];
}

export interface ProgressEntry {
  timestamp: string;
  taskId: string;
  taskTitle: string;
  summary: string;
  commitHash: string | null;
}

export interface AgentConfig {
  name: string;
  command: string;
  description: string;
}

// Default workflow steps
export const DEFAULT_WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: 'check-arch',
    name: 'Check Architectures',
    prompt: `Review the architecture diagrams in docs/architectures/ for relevant diagrams.`,
    enabled: true,
  },
  {
    id: 'write-tests',
    name: 'Write Unit Tests',
    prompt: `Write failing unit tests for the feature before implementing.`,
    enabled: true,
  },
  {
    id: 'implement',
    name: 'Implement Feature',
    prompt: `Implement the feature to make the tests pass.`,
    enabled: true,
  },
  {
    id: 'lint',
    name: 'Run Linters',
    prompt: `Run linting, type checking, and fix any issues.`,
    enabled: true,
  },
  {
    id: 'update-docs',
    name: 'Update Documentation',
    prompt: `Update relevant documentation and architecture diagrams based on the changes made.`,
    enabled: true,
  },
];

// Default agent configurations
export const DEFAULT_AGENTS: AgentConfig[] = [
  {
    name: 'Claude Code',
    command: 'claude -p "{{prompt}}"',
    description: 'Anthropic Claude Code CLI',
  },
  {
    name: 'Gemini CLI',
    command: 'gemini -p "{{prompt}}"',
    description: 'Google Gemini CLI',
  },
  {
    name: 'Cursor',
    command: 'cursor --agent "{{prompt}}"',
    description: 'Cursor IDE Agent',
  },
  {
    name: 'Custom',
    command: '',
    description: 'Custom agent command',
  },
];