import React from 'react';
import { render, screen } from '@testing-library/react';
import { Backlog } from './Backlog'; // Assuming this path after rename
import { useProject } from '@/context/ProjectContext';

// Mock the useProject context
jest.mock('@/context/ProjectContext', () => ({
  useProject: jest.fn(),
}));

describe('Backlog', () => {
  beforeEach(() => {
    // Reset the mock before each test
    (useProject as jest.Mock).mockReturnValue({
      tasksData: {
        epics: [],
      },
      createEpic: jest.fn(),
      createTask: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
      runTasks: jest.fn(),
    });
  });

  it('renders the Backlog title', () => {
    render(<Backlog />);
    expect(screen.getByText('Backlog')).toBeInTheDocument();
  });
});
