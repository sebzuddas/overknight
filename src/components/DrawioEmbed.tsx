'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileImage, Plus, ExternalLink, Wand2, Trash2, RefreshCcw } from 'lucide-react';
import type { Workflow, Epic } from '@/lib/types';
import { useProject } from '@/context/ProjectContext';

interface DrawioFile {
    name: string;
    path: string;
}

interface DiagramType {
    name: string;
    templateUrl: string;
    genType: string; // Matches the generation type in the modal
}

// Unified Diagram Types
const DIAGRAM_TYPES: DiagramType[] = [
    { name: 'Overview', templateUrl: '', genType: 'Overview' },
    { name: 'Block Diagram', templateUrl: '', genType: 'Block Diagram' },
    {
        name: 'Sequence Diagram',
        templateUrl: 'https://raw.githubusercontent.com/jgraph/drawio-diagrams/dev/diagrams/basic/sequence.xml',
        genType: 'Sequence Diagram'
    },
    {
        name: 'Activity Diagram',
        templateUrl: 'https://raw.githubusercontent.com/jgraph/drawio/dev/src/main/webapp/templates/basic/flowchart.xml',
        genType: 'Activity Diagram'
    },
    {
        name: 'State Machine',
        templateUrl: 'https://raw.githubusercontent.com/jgraph/drawio/dev/src/main/webapp/templates/basic/flowchart.xml',
        genType: 'State Machine'
    },
    {
        name: 'Use Case',
        templateUrl: 'https://raw.githubusercontent.com/jgraph/drawio/dev/src/main/webapp/templates/basic/classes.xml',
        genType: 'Use Case'
    },
    {
        name: 'ERD',
        templateUrl: 'https://raw.githubusercontent.com/jgraph/drawio-diagrams/dev/diagrams/schema.xml',
        genType: 'ERD'
    },
    { name: 'Flowchart', templateUrl: 'https://raw.githubusercontent.com/jgraph/drawio/dev/src/main/webapp/templates/basic/flowchart.xml', genType: 'Flowchart' },
];

export function DrawioEmbed() {
    const { projectPath } = useProject();
    const [files, setFiles] = useState<DrawioFile[]>([]);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Creation State
    const [newFileName, setNewFileName] = useState('');
    const [selectedType, setSelectedType] = useState<DiagramType>(DIAGRAM_TYPES[0]);

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [editorStatus, setEditorStatus] = useState<'loading' | 'ready' | 'saving' | 'saved'>('loading');

    // Gen AI State
    const [isGenModalOpen, setIsGenModalOpen] = useState(false);
    const [genPrompt, setGenPrompt] = useState('');
    const [genType, setGenType] = useState('Overview');
    const [archWorkflowId, setArchWorkflowId] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(false);

    // Initial Load
    useEffect(() => {
        if (!projectPath) return;

        // Fetch files
        fetch(`/api/architectures?projectPath=${encodeURIComponent(projectPath)}`)
            .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch architecture files'))
            .then(data => setFiles(data.files || []))
            .catch(err => console.error('Failed to load architecture files:', err));

        // Fetch workflows
        fetch(`/api/workflows?projectPath=${encodeURIComponent(projectPath)}`)
            .then(res => res.ok && res.json())
            .then((workflows: Workflow[]) => {
                const archWf = workflows.find(w => w.title.toLowerCase().includes('architecture') || w.title.toLowerCase().includes('diagram'));
                if (archWf) setArchWorkflowId(archWf.id);
            });
    }, [projectPath]);

    const handleStartCreate = () => {
        if (projectPath) {
            const projectName = projectPath.split('/').pop() || 'Project';
            const suffix = selectedType.name.toLowerCase().replace(/\s+/g, '-');
            setNewFileName(`${projectName}-${suffix}.drawio`);
            setGenType(selectedType.genType);
        }
        setIsCreating(true);
    };


    const handleGenerate = async () => {
        if (!selectedFile || !archWorkflowId || !genPrompt || !projectPath) return;

        try {
            // Find or create Epic
            let epicId = '';
            const tasksRes = await fetch(`/api/tasks?projectPath=${encodeURIComponent(projectPath)}`);
            if (tasksRes.ok) {
                const tasksData = await tasksRes.json();
                const epics = tasksData.epics || [];
                const epic = epics.find((e: Epic) => e.title === 'Architecture Generation');

                if (epic) {
                    epicId = epic.id;
                } else {
                    const createEpicRes = await fetch(`/api/tasks?projectPath=${encodeURIComponent(projectPath)}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'createEpic',
                            data: {
                                title: 'Architecture Generation',
                                description: 'Tasks for generating and updating architecture diagrams'
                            }
                        })
                    });

                    if (createEpicRes.ok) {
                        const newEpic = await createEpicRes.json();
                        epicId = newEpic.id;
                    } else if (epics.length > 0) {
                        epicId = epics[0].id;
                    }
                }
            }

            if (!epicId) {
                alert("Please create an Epic first.");
                return;
            }

            const taskTitle = `Generate ${genType}: ${selectedFile}`;
            const taskDesc = `Generate a ${genType} diagram for ${selectedFile}.\nRequirements: ${genPrompt}`;
            // Create Task
            const createRes = await fetch(`/api/tasks?projectPath=${encodeURIComponent(projectPath)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'createTask',
                    data: {
                        epicId,
                        title: taskTitle,
                        description: taskDesc,
                        workflowId: archWorkflowId
                    }
                })
            });

            if (createRes.ok) {
                const newTask = await createRes.json();
                // Trigger Agent
                await fetch(`/api/run?projectPath=${encodeURIComponent(projectPath)}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'runSingleTask',
                        data: { taskId: newTask.id }
                    })
                });
                // Enable temporary auto-refresh
                setAutoRefresh(true);
                // Disable it after 2 minutes
                setTimeout(() => setAutoRefresh(false), 120000);
            }

            setIsGenModalOpen(false);
            setGenPrompt('');
            alert(`Task created and Agent started: ${taskTitle}. Auto-refresh enabled for 2 mins.`);

        } catch (e) {
            console.error("Failed to generate task", e);
            alert("Failed to create generation task.");
        }
    };

    const [iframeReady, setIframeReady] = useState(false);

    // 1. Listen for Draw.io Init
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
            let msg;
            try { msg = JSON.parse(event.data); } catch { return; }

            if (msg.event === 'init') {
                setIframeReady(true);
            } else if (msg.event === 'save') {
                console.log("Save triggered (not implemented yet)", msg);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const loadContent = useCallback(async () => {
        if (!selectedFile || !projectPath || !iframeRef.current) return;
        setIframeReady(false); // Reset ready state while loading? No, keeping it true if iframe persists.
        setEditorStatus('loading');
        try {
            const res = await fetch(`/api/architectures?projectPath=${encodeURIComponent(projectPath)}&fileName=${encodeURIComponent(selectedFile)}`);
            if (res.ok) {
                const xml = await res.text();
                iframeRef.current.contentWindow?.postMessage(JSON.stringify({
                    action: 'load',
                    autosave: 0,
                    xml: xml,
                    title: selectedFile
                }), '*');
                setEditorStatus('ready');
            } else {
                console.error("Failed to fetch file content");
                setEditorStatus('ready');
            }
        } catch (err) {
            console.error("Error loading file:", err);
            setEditorStatus('ready');
        }
    }, [selectedFile, projectPath]);

    // 2. Load File Content when Ready or Selection Changes
    useEffect(() => {
        if (!iframeReady) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadContent();
    }, [iframeReady, loadContent]);
    // 3. Auto-refresh during generation
    useEffect(() => {
        if (!autoRefresh || !selectedFile) return;
        const interval = setInterval(() => {
            loadContent();
        }, 8000); // Every 8 seconds
        return () => clearInterval(interval);
    }, [autoRefresh, selectedFile, loadContent]);

    const handleDelete = async () => {
        if (!selectedFile || !projectPath) return;
        if (!confirm(`Are you sure you want to delete ${selectedFile}?`)) return;

        try {
            const res = await fetch(`/api/architectures?projectPath=${encodeURIComponent(projectPath)}&fileName=${encodeURIComponent(selectedFile)}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setFiles(files.filter(f => f.path !== selectedFile));
                setSelectedFile(null);
            } else {
                alert("Failed to delete file");
            }
        } catch (e) {
            console.error("Delete failed", e);
        }
    };


    const createAndSelectFile = async (): Promise<boolean> => {
        if (!newFileName.trim() || !projectPath) return false;
        const fileName = newFileName.endsWith('.drawio') ? newFileName : `${newFileName}.drawio`;

        try {
            const res = await fetch(`/api/architectures?projectPath=${encodeURIComponent(projectPath)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create', data: { fileName, templateUrl: selectedType.templateUrl } }),
            });

            if (res.ok) {
                const file = await res.json();
                setFiles([...files, file]);
                setSelectedFile(file.path);
                setNewFileName('');
                setIsCreating(false);
                return true;
            }
        } catch (err) {
            console.error('Failed to create file:', err);
        }
        return false;
    };

    const handleGenerateWithCreation = async () => {
        // First create the file
        const success = await createAndSelectFile();
        if (success) {
            // Then open gen modal
            setIsGenModalOpen(true);
            setGenType(selectedType.genType);
        }
    };

    const drawioUrl = selectedFile ? `https://embed.diagrams.net/?embed=1&ui=dark&spin=1&proto=json` : null;

    return (
        <div className="bg-linear-to-br from-gray-800/50 to-gray-900/50 rounded-xl border border-gray-700/50 overflow-hidden relative">
            <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
                <div className="flex items-center gap-3">
                    <FileImage className="w-5 h-5 text-cyan-400" />
                    <h2 className="font-semibold">Architectures</h2>
                    {selectedFile && <span className="text-gray-500 text-sm">/ {selectedFile}</span>}
                    <span className={`text-xs ml-2 px-2 py-0.5 rounded-full ${editorStatus === 'ready' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {editorStatus === 'ready' ? 'Ready' : 'Loading...'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadContent}
                        disabled={!selectedFile}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                        title="Refresh Diagram"
                    >
                        <RefreshCcw className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={!selectedFile}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete Diagram"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-gray-700 mx-1" />
                    <button
                        onClick={() => setIsGenModalOpen(true)}
                        disabled={!selectedFile || !archWorkflowId}
                        className={`
                            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                            ${selectedFile && archWorkflowId
                                ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                                : 'bg-gray-800 text-gray-500 cursor-not-allowed'}
                        `}
                    >
                        <Wand2 className="w-3.5 h-3.5" />
                        Generate with Agent
                    </button>
                    <a
                        href="https://app.diagrams.net/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-white"
                    >
                        <ExternalLink className="w-3 h-3" />
                        Draw.io App
                    </a>
                </div>
            </div>

            <div className="flex items-center gap-2 p-2 bg-gray-900/50 border-b border-gray-700/50 overflow-x-auto min-h-[50px]">
                {files.map(file => (
                    <button
                        key={file.path}
                        onClick={() => setSelectedFile(file.path)}
                        className={`
              px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all
              ${selectedFile === file.path
                                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'}
            `}
                    >
                        {file.name}
                    </button>
                ))}

                {isCreating ? (
                    <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1 border border-gray-700">
                        <input
                            type="text"
                            value={newFileName}
                            onChange={(e) => setNewFileName(e.target.value)}
                            // Enter key defaults to Add (manual create)
                            onKeyDown={(e) => e.key === 'Enter' && createAndSelectFile()}
                            placeholder="filename.drawio"
                            className="w-48 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-indigo-500"
                            autoFocus
                        />
                        <select
                            value={selectedType.name}
                            onChange={(e) => {
                                const type = DIAGRAM_TYPES.find(t => t.name === e.target.value);
                                if (type) {
                                    setSelectedType(type);
                                    if (projectPath) {
                                        const projectName = projectPath.split('/').pop() || 'Project';
                                        const suffix = type.name.toLowerCase().replace(/\s+/g, '-');
                                        setNewFileName(`${projectName}-${suffix}.drawio`);
                                    }
                                    setGenType(type.genType);
                                }
                            }}
                            className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-indigo-500 max-w-[120px]"
                        >
                            {DIAGRAM_TYPES.map((type) => (
                                <option key={type.name} value={type.name}>
                                    {type.name}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={() => createAndSelectFile()}
                            className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium"
                        >
                            Add
                        </button>
                        <button
                            onClick={handleGenerateWithCreation}
                            disabled={!archWorkflowId}
                            className="flex items-center gap-1 px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-medium disabled:opacity-50"
                        >
                            <Wand2 className="w-3 h-3" />
                            Gen
                        </button>
                        <button onClick={() => setIsCreating(false)} className="px-2 text-gray-400 hover:text-white">✕</button>
                    </div>
                ) : (
                    <button
                        onClick={handleStartCreate}
                        className="flex items-center gap-1 px-2 py-1 text-gray-400 hover:text-white hover:bg-white/5 rounded"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="relative h-[800px] bg-gray-900 border-t border-gray-800">
                {selectedFile ? (
                    <iframe
                        ref={iframeRef}
                        src={drawioUrl || undefined}
                        className="w-full h-full border-0"
                        title="Draw.io Editor"
                        allow="clipboard-read; clipboard-write"
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <FileImage className="w-12 h-12 mb-4 opacity-50" />
                        <p className="text-sm">Select or create an architecture diagram</p>
                    </div>
                )}
            </div>

            {isGenModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                    <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-96 max-w-full shadow-2xl">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Wand2 className="w-5 h-5 text-purple-400" />
                            Generate Architecture
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Diagram Type</label>
                                <select
                                    value={genType}
                                    onChange={(e) => setGenType(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                                >
                                    {DIAGRAM_TYPES.map(t => (
                                        <option key={t.genType} value={t.genType}>{t.genType}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Requirements / Prompt</label>
                                <textarea
                                    value={genPrompt}
                                    onChange={(e) => setGenPrompt(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm min-h-[100px] focus:outline-none focus:border-purple-500"
                                    placeholder="Describe the architecture you want to generate..."
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={handleGenerate}
                                    className="flex-1 bg-purple-600 hover:bg-purple-500 text-white rounded py-2 text-sm font-medium transition-colors"
                                >
                                    Generate
                                </button>
                                <button
                                    onClick={() => setIsGenModalOpen(false)}
                                    className="px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded py-2 text-sm font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
