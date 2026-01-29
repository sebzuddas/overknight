'use client';
import React, { useState } from 'react';
import { Moon, Sun, Sword, Menu, X } from 'lucide-react';
import { ProjectSelector } from '@/components/ProjectSelector';
import { TaskBoard } from '@/components/TaskBoard';
import { SchedulePanel } from '@/components/SchedulePanel';
import { GitHistory } from '@/components/GitHistory';
import { DrawioEmbed } from '@/components/DrawioEmbed';
import { WorkflowEditor } from '@/components/WorkflowEditor';
import { useProject } from '@/context/ProjectContext';

type Tab = 'tasks' | 'architectures' | 'workflow';

export default function Home() {
  const { tasksData, isRunning, projectPath } = useProject();
  const [activeTab, setActiveTab] = useState<Tab>('tasks');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const tabs: { id: Tab; label: string }[] = [{ id: 'tasks', label: 'Tasks' }, { id: 'architectures', label: 'Architectures' }, { id: 'workflow', label: 'Workflow' }];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <header className="sticky top-0 z-50 border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-white/5 rounded-lg lg:hidden">{sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
            <div className="flex items-center gap-3">
              <div className="relative"><Sword className="w-8 h-8 text-indigo-400" />{isRunning && <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />}</div>
              <div><h1 className="text-xl font-bold gradient-text">OverKnight</h1><p className="text-xs text-gray-500">Agent runs while you sleep</p></div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isRunning && <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/50 rounded-full"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /><span className="text-sm text-green-400">Agent Running</span></div>}
            {tasksData?.project.name && <span className="text-sm text-gray-400">{tasksData.project.name}</span>}
          </div>
        </div>
        {projectPath && <div className="flex gap-1 px-6 pb-2">{tabs.map(tab => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === tab.id ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>{tab.label}</button>)}</div>}
      </header>
      <div className="flex">
        <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-80 border-r border-gray-800/50 bg-gray-950/95 backdrop-blur-xl transform transition-transform duration-300 lg:transform-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} pt-20 lg:pt-0 overflow-y-auto`}>
          <div className="p-4 space-y-4"><ProjectSelector />{projectPath && <><SchedulePanel /><GitHistory /></>}</div>
        </aside>
        <main className="flex-1 p-6 lg:ml-0">
          {!projectPath ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="relative mb-8"><Sword className="w-24 h-24 text-indigo-500/30 animate-float" /><div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full" /></div>
              <h2 className="text-3xl font-bold mb-4 gradient-text">Welcome to OverKnight</h2>
              <p className="text-gray-400 max-w-md mb-8">Select a project folder in the sidebar.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
                <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50"><div className="text-indigo-400 text-2xl mb-2">1</div><h3 className="font-semibold mb-1">Select Project</h3></div>
                <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50"><div className="text-purple-400 text-2xl mb-2">2</div><h3 className="font-semibold mb-1">Define Tasks</h3></div>
                <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50"><div className="text-cyan-400 text-2xl mb-2">3</div><h3 className="font-semibold mb-1">Schedule Run</h3></div>
              </div>
            </div>
          ) : (
            <>{activeTab === 'tasks' && <TaskBoard />}{activeTab === 'architectures' && <DrawioEmbed />}{activeTab === 'workflow' && <WorkflowEditor />}</>
          )}
        </main>
      </div>
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}
