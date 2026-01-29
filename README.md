# OverKnight

> **"Agent runs while you sleep"**

OverKnight is a specialized task manager designed for **Agentic Development**. It bridges the gap between high-level project planning and autonomous AI agent execution. Instead of copy-pasting prompts manually, you define **Epics** and **Tasks**, assign them to a workflow, and let OverKnight orchestrate the agents to do the work—even overnight.

## 🚀 Purpose

The goal of OverKnight is to maximize AI agent utilization by providing a structured environment where tasks are clearly defined, prioritized, and executed autonomously. It handles the "glue code" of managing git branches, running agent CLI commands, and tracking progress without a database.

## ✨ Key Features

- **🛡️ Project Backlog**: Organize work into Epics and granular Tasks.
- **🤖 Agent Runner**: Automatically spawns agent processes (e.g., specialized CLI agents) to execute tasks.
- **🔄 Workflow Engine**: Define custom reasoning flows and steps for your agents via `workflow.json`.
- **🪵 Transparent Logs**: View real-time logs and chat with your agents while they work.
- **📐 Architecture View**: Integrated Draw.io support for visualizing system designs.
- **📅 Scheduling**: Queue tasks to run at specific times (e.g., 2 AM).
- **📂 Local-First**: No database required. All data is stored in human-readable JSON files within your project.

## 🛠️ Technology Stack

- **Framework**: [Next.js 14+](https://nextjs.org/) (App Router)
- **UI**: React 18, TailwindCSS, Lucide Icons
- **State Management**: React Context + File System Watchers
- **Drag & Drop**: `@dnd-kit` for task prioritization
- **System Integ**: `node-child-process` for running agents, `simple-git` for version control

## 📦 Usage

1.  **Select Project**: Point OverKnight to your project's root directory.
2.  **Define Tasks**: Create Epics and Tasks in the Backlog.
3.  **Prioritize**: Drag and drop tasks to set the execution order.
4.  **Configure Workflow**: Edit `plan/workflow.json` to define how the agent should behave.
5.  **Run**: Select tasks and click "Run". OverKnight will:
    - Create a dedicated git branch for the task.
    - Invoke the agent with the tasks' context.
    - Monitor progress and logs.

## 🏗️ Project Structure

OverKnight expects a `plan/` directory in your project root:

```
my-project/
├── plan/
│   ├── tasks.json       # Stores Epics, Tasks, and Status
│   ├── workflow.json    # Defines agent behavior and steps
│   └── schedule.json    # Queued runs
└── docs/
    └── architectures/   # .drawio or .svg diagrams
```

## 📜 License

MIT
