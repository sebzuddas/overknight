import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Backlog } from './Backlog';
import { useProject } from '@/context/ProjectContext';
import type { Workflow } from '@/lib/types';

// Mock the useProject context
jest.mock('@/context/ProjectContext', () => ({
  useProject: jest.fn(),
}));

// Mock window.alert
const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});

const mockWorkflows: Workflow[] = [
  { id: 'wf1', title: 'Workflow One', agentCommand: '', workingDirectory: '', permissions: { allowGit: true, allowShell: true, requireApproval: false }, steps: [] },
  { id: 'wf2', title: 'Workflow Two', agentCommand: '', workingDirectory: '', permissions: { allowGit: true, allowShell: true, requireApproval: false }, steps: [] },
];

describe('Backlog - Workflow Mandatory Functionality', () => {
  const mockUpdateTask = jest.fn();
  const mockRefreshTasks = jest.fn();

  beforeEach(() => {
    // Reset mocks before each test
    (useProject as jest.Mock).mockReset();
    mockUpdateTask.mockReset();
    mockRefreshTasks.mockReset();
    mockAlert.mockClear();

    (useProject as jest.Mock).mockReturnValue({
      projectPath: '/test/project',
      tasksData: {
        project: { name: 'Test Project', path: '/test/project', createdAt: '', lastModified: '' },
        epics: [
          {
            id: 'epic1',
            title: 'Epic Alpha',
            description: 'Description for Epic Alpha',
            priority: 3,
            status: 'pending',
            createdAt: '2026-01-30T10:00:00Z',
            tasks: [
              {
                id: 'task1',
                title: 'Task with optional workflow',
                description: 'This task can have a workflow or not.',
                priority: 3,
                status: 'pending',
                branch: null,
                createdAt: '2026-01-30T10:01:00Z',
                completedAt: null,
                workflowId: undefined,
                workflowMandatory: false,
              },
              {
                id: 'task2',
                title: 'Task with mandatory workflow (unassigned)',
                description: 'This task requires a workflow but currently has none.',
                priority: 3,
                status: 'pending',
                branch: null,
                createdAt: '2026-01-30T10:02:00Z',
                completedAt: null,
                workflowId: undefined,
                workflowMandatory: true,
              },
              {
                id: 'task3',
                title: 'Task with mandatory workflow (assigned)',
                description: 'This task requires and has a workflow.',
                priority: 3,
                status: 'pending',
                branch: null,
                createdAt: '2026-01-30T10:03:00Z',
                completedAt: null,
                workflowId: 'wf1',
                workflowMandatory: true,
              },
            ],
          },
        ],
      },
      createEpic: jest.fn(),
      createTask: jest.fn(),
      updateEpic: jest.fn(),
      updateTask: mockUpdateTask,
      deleteEpic: jest.fn(),
      deleteTask: jest.fn(),
      runTasks: jest.fn(),
      scheduleRun: jest.fn(),
      getTaskLogs: jest.fn(),
      cancelCurrentRun: jest.fn(),
      reorderTasks: jest.fn(),
      refreshTasks: mockRefreshTasks,
      refreshWorkflow: jest.fn(),
      refreshRuns: jest.fn(),
      initializeProject: jest.fn(),
      workflow: null,
      scheduledRuns: [],
      isLoading: false,
      isRunning: false,
      error: null,
    });

    // Mock fetch for workflows
    jest.spyOn(window, 'fetch').mockImplementation((url: RequestInfo | URL) => {
      if (typeof url === 'string' && url.includes('/api/workflows')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockWorkflows),
        } as Response);
      }
      return Promise.reject(new Error('Unhandled fetch'));
    });
  });

  afterAll(() => {
    mockAlert.mockRestore(); // Restore original alert
    jest.restoreAllMocks(); // Restore all mocks
  });

  const enterEditMode = async (taskTitle: string) => {
    fireEvent.click(screen.getByText(taskTitle));
    await waitFor(() => {
      expect(screen.getByDisplayValue(taskTitle)).toBeInTheDocument();
    });
  };

  it('renders the workflow mandatory checkbox in edit mode with correct initial state', async () => {
    render(<Backlog />);

    // Task 1: workflowMandatory: false
    await enterEditMode('Task with optional workflow');
    const task1Checkbox = screen.getByLabelText('Workflow Mandatory');
    expect(task1Checkbox).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    // Task 2: workflowMandatory: true
    await enterEditMode('Task with mandatory workflow (unassigned)');
    const task2Checkbox = screen.getByLabelText('Workflow Mandatory');
    expect(task2Checkbox).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    // Task 3: workflowMandatory: true
    await enterEditMode('Task with mandatory workflow (assigned)');
    const task3Checkbox = screen.getByLabelText('Workflow Mandatory');
    expect(task3Checkbox).toBeChecked();
  });

  it('prevents saving when workflow is mandatory but not selected', async () => {
    render(<Backlog />);
    await enterEditMode('Task with optional workflow');

    // Check 'Workflow Mandatory'
    fireEvent.click(screen.getByLabelText('Workflow Mandatory'));
    expect(screen.getByLabelText('Workflow Mandatory')).toBeChecked();

    // Try to save without selecting a workflow
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    // Expect an alert
    expect(mockAlert).toHaveBeenCalledWith('Workflow is mandatory for this task. Please select a workflow.');
    // Expect updateTask not to have been called
    expect(mockUpdateTask).not.toHaveBeenCalled();
  });

  it('allows saving when workflow is mandatory and selected', async () => {
    render(<Backlog />);
    await enterEditMode('Task with optional workflow');

    // Check 'Workflow Mandatory'
    fireEvent.click(screen.getByLabelText('Workflow Mandatory'));
    expect(screen.getByLabelText('Workflow Mandatory')).toBeChecked();

    // Select a workflow
    fireEvent.change(screen.getByDisplayValue('Default Workflow'), { target: { value: 'wf1' } });

    // Save
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    // Expect updateTask to have been called
    await waitFor(() => {
        expect(mockUpdateTask).toHaveBeenCalledWith('task1', expect.objectContaining({
            workflowId: 'wf1',
            workflowMandatory: true,
        }));
    });
    // Expect no alert
    expect(mockAlert).not.toHaveBeenCalled();
    expect(screen.queryByDisplayValue('Task with optional workflow')).not.toBeInTheDocument(); // Exited edit mode
  });

  it('allows saving when workflow is optional and not selected', async () => {
    render(<Backlog />);
    await enterEditMode('Task with mandatory workflow (unassigned)');

    // Uncheck 'Workflow Mandatory'
    fireEvent.click(screen.getByLabelText('Workflow Mandatory'));
    expect(screen.getByLabelText('Workflow Mandatory')).not.toBeChecked();

    // Save (workflowId is still undefined)
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    // Expect updateTask to have been called
    await waitFor(() => {
        expect(mockUpdateTask).toHaveBeenCalledWith('task2', expect.objectContaining({
            workflowId: undefined,
            workflowMandatory: false,
        }));
    });
    // Expect no alert
    expect(mockAlert).not.toHaveBeenCalled();
  });

  it('allows saving when workflow is optional and selected', async () => {
    render(<Backlog />);
    await enterEditMode('Task with optional workflow');

    // Select a workflow
    fireEvent.change(screen.getByDisplayValue('Default Workflow'), { target: { value: 'wf2' } });

    // Save
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    // Expect updateTask to have been called
    await waitFor(() => {
        expect(mockUpdateTask).toHaveBeenCalledWith('task1', expect.objectContaining({
            workflowId: 'wf2',
            workflowMandatory: false,
        }));
    });
    // Expect no alert
    expect(mockAlert).not.toHaveBeenCalled();
  });

  it('allows saving when workflow is mandatory and deselected to optional', async () => {
    render(<Backlog />);
    await enterEditMode('Task with mandatory workflow (assigned)');

    // Uncheck 'Workflow Mandatory'
    fireEvent.click(screen.getByLabelText('Workflow Mandatory'));
    expect(screen.getByLabelText('Workflow Mandatory')).not.toBeChecked();

    // Save
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    // Expect updateTask to have been called
    await waitFor(() => {
        expect(mockUpdateTask).toHaveBeenCalledWith('task3', expect.objectContaining({
            workflowId: 'wf1', // Retains existing workflowId
            workflowMandatory: false,
        }));
    });
    // Expect no alert
    expect(mockAlert).not.toHaveBeenCalled();
  });

});