# Agent Task Assignment Architecture

## Feature Description
This document describes the architectural considerations for allowing users to run specific agents on individual tasks. This feature enables greater flexibility in task execution, as different agents (e.g., Gemini, Claude) may be better suited for different types of tasks or workflows. Users will be able to select an agent at both the workflow settings level and for individual tasks.

## Agent Selection Mechanism
The system will provide a mechanism for users to specify a preferred agent for a given task or workflow. This could involve:
- **Default Agent:** A project-wide default agent that is used if no specific agent is assigned.
- **Workflow-level Agent Assignment:** The ability to assign a specific agent to an entire workflow. This agent would then be the default for all tasks within that workflow, unless overridden.
- **Task-level Agent Assignment:** The ability to override the workflow-level agent (or project default) and assign a specific agent to an individual task.

## Integration with Existing Workflows
The agent selection mechanism needs to integrate seamlessly with the existing workflow and task management system. Key integration points include:
- **Task Creation/Editing:** UI components will be added to allow users to select an agent when creating or editing tasks.
- **Workflow Definition:** UI components will be added to allow users to select an agent when defining or editing workflows.
- **Scheduler:** The scheduler component (`lib/scheduler.ts`) will need to be updated to consider the assigned agent when initiating task execution. It will be responsible for dispatching tasks to the appropriate agent runner.

## Modified Components
- **`src/app/api/tasks/route.ts`:** API endpoints for task management will need to be updated to include the `agent` field in task data.
- **`src/app/api/workflow/route.ts` / `src/app/api/workflows/route.ts`:** API endpoints for workflow management will need to be updated to include the `agent` field in workflow data.
- **`src/components/WorkflowEditor.tsx`:** The workflow editor UI will need modifications to allow agent selection for workflows.
- **`src/components/Backlog.tsx`:** The backlog component (where tasks are displayed and potentially edited) will need UI modifications to allow agent selection for individual tasks.
- **`src/lib/types.ts`:** New types or modifications to existing types will be required to accommodate the `agent` field for tasks and workflows.
- **`src/lib/agent-runner.ts`:** This component will be responsible for abstracting the execution of different agents. It will receive a task and the specified agent, and then invoke the correct agent's API or module to handle the task.
- **`src/lib/scheduler.ts`:** The scheduler will be updated to read the assigned agent from the task/workflow and use the `agent-runner` to execute the task.

## Future Considerations
- **Agent Configuration:** A centralized way to configure different agents (e.g., API keys, specific models).
- **Agent Capabilities:** Mechanisms to define and query agent capabilities to suggest suitable agents for tasks.
- **Monitoring and Logging:** Enhance monitoring and logging to track which agent executed which task.
