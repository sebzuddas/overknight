'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FileImage, Plus, ExternalLink, Wand2 } from 'lucide-react';
import type { Workflow } from '@/lib/types';
import { useProject } from '@/context/ProjectContext';

interface DrawioFile {
    name: string;
    path: string; // This is now just the filename
}

interface DiagramTemplate {
    name: string;
    url: string;
}

const predefinedTemplates: DiagramTemplate[] = [
    { name: 'Blank Diagram', url: '' },
    {
        name: 'ERD',
        url: 'https://raw.githubusercontent.com/jgraph/drawio-diagrams/dev/diagrams/schema.xml',
    },
    {
        name: 'Class Diagram',
        url: 'https://raw.githubusercontent.com/jgraph/drawio/dev/src/main/webapp/templates/basic/classes.xml',
    },
    {
        name: 'Flowchart',
        url: 'https://raw.githubusercontent.com/jgraph/drawio/dev/src/main/webapp/templates/basic/flowchart.xml',
    },
    {
        name: 'Sequence Diagram',
        url: 'https://raw.githubusercontent.com/jgraph/drawio-diagrams/dev/diagrams/basic/sequence.xml',
    },
];

export function DrawioEmbed() {
    const { projectPath } = useProject();
    const [files, setFiles] = useState<DrawioFile[]>([]);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newFileName, setNewFileName] = useState('');
    const [selectedTemplateUrl, setSelectedTemplateUrl] = useState('');
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [editorStatus, setEditorStatus] = useState<'loading' | 'ready' | 'saving' | 'saved'>('loading');

    // Gen AI State
    const [isGenModalOpen, setIsGenModalOpen] = useState(false);
    const [genPrompt, setGenPrompt] = useState('');
    const [genType, setGenType] = useState('Overview');
    const [archWorkflowId, setArchWorkflowId] = useState<string | null>(null);

    // Load file list & Find Architecture Workflow
    useEffect(() => {
        if (!projectPath) return;

        // Fetch files
        fetch(`/api/architectures?projectPath=${encodeURIComponent(projectPath)}`)
            .then(res => res.ok && res.json().then(data => setFiles(data.files || [])));

        // Fetch workflows to find the architecture one
        fetch(`/api/workflows?projectPath=${encodeURIComponent(projectPath)}`)
            .then(res => res.ok && res.json())
            .then((workflows: Workflow[]) => {
                const archWf = workflows.find(w => w.title.toLowerCase().includes('architecture') || w.title.toLowerCase().includes('diagram'));
                if (archWf) setArchWorkflowId(archWf.id);
            });
    }, [projectPath]);

    const handleGenerate = async () => {
        if (!selectedFile || !archWorkflowId || !genPrompt || !projectPath) return;

        try {
            // Find or create an 'Architecture Generation' epic
            let epicId = '';
            // Fetch epics first
            const tasksRes = await fetch(`/api/tasks?projectPath=${encodeURIComponent(projectPath)}`);
            if (tasksRes.ok) {
                const tasksData = await tasksRes.json();
                const epics = tasksData.epics || [];
                const epic = epics.find((e: any) => e.title === 'Architecture Generation');

                if (epic) {
                    epicId = epic.id;
                } else {
                    // Create Architecture Generation epic
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
                alert("Please create an Epic first to hold the generation task.");
                return;
            }

            const taskTitle = `Generate ${genType}: ${selectedFile}`;
            const taskDesc = `Generate a ${genType} diagram for ${selectedFile}.\nRequirements: ${genPrompt}`;

            // Create Task
            await fetch(`/api/tasks?projectPath=${encodeURIComponent(projectPath)}`, {
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

            setIsGenModalOpen(false);
            setGenPrompt('');
            alert(`Task created: ${taskTitle}`);

        } catch (e) {
            console.error("Failed to generate task", e);
            alert("Failed to create generation task.");
        }
    };

    // Handle Draw.io communication
    useEffect(() => {
        const handleMessage = async (event: MessageEvent) => {
            if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;

            // Draw.io sends JSON string, need to parse
            let msg;
            try {
                msg = JSON.parse(event.data);
            } catch (e) {
                return; // Not a JSON message
            }

            if (msg.event === 'init') {
                setEditorStatus('loading');
                // Editor is ready, load the file content
                if (selectedFile && projectPath) {
                    try {
                        const res = await fetch(`/api/architectures?projectPath=${encodeURIComponent(projectPath)}&fileName=${encodeURIComponent(selectedFile)}`);
                        if (res.ok) {
                            const xml = await res.text();
                            // Send load action to iframe
                            iframeRef.current.contentWindow?.postMessage(JSON.stringify({
                                action: 'load',
                                autosave: 0, // We handle save manually or via 'save' event if explicitly added
                                xml: xml,
                                title: selectedFile
                            }), '*');
                            setEditorStatus('ready');
                        } else {
                            console.error("Failed to fetch file content");
                        }
                    } catch (err) {
                        console.error("Error loading file:", err);
                    }
                }
            } else if (msg.event === 'save') {
                console.log("Save triggered (not implemented yet)", msg);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [selectedFile, projectPath]);

    const handleCreateFile = async () => {
        if (!newFileName.trim() || !projectPath) return;
        const fileName = newFileName.endsWith('.drawio') ? newFileName : `${newFileName}.drawio`;

        try {
            const res = await fetch(`/api/architectures?projectPath=${encodeURIComponent(projectPath)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create', data: { fileName, templateUrl: selectedTemplateUrl } }),
            });

            if (res.ok) {
                const file = await res.json();
                setFiles([...files, file]);
                setSelectedFile(file.path); // path is now just filename
                setNewFileName('');
                setIsCreating(false);
            }
        } catch (err) {
            console.error('Failed to create file:', err);
        }
    };

    // Construct URL: embed=1, spin=1 (loading spinner), proto=json (communication)
    const drawioUrl = selectedFile
        ? `https://embed.diagrams.net/?embed=1&ui=dark&spin=1&proto=json`
        : null;

    return (
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl border border-gray-700/50 overflow-hidden relative">
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

            <div className="flex items-center gap-2 p-2 bg-gray-900/50 border-b border-gray-700/50 overflow-x-auto">
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
                    <div className="flex items-center gap-1">
                        <input
                            type="text"
                            value={newFileName}
                            onChange={(e) => setNewFileName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateFile()}
                            placeholder="filename.drawio"
                            className="w-32 bg-gray-800 border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-indigo-500"
                            autoFocus
                        />
                        <select
                            value={selectedTemplateUrl}
                            onChange={(e) => setSelectedTemplateUrl(e.target.value)}
                            className="bg-gray-800 border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-indigo-500"
                        >
                            {predefinedTemplates.map((template) => (
                                <option key={template.name} value={template.url}>
                                    {template.name}
                                </option>
                            ))}
                        </select>
                        <button onClick={handleCreateFile} className="p-1 bg-indigo-500 rounded text-xs">Add</button>
                        <button onClick={() => setIsCreating(false)} className="p-1 text-gray-400 hover:text-white">✕</button>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsCreating(true)}
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
                                    <option>Overview</option>
                                    <option>Block Diagram</option>
                                    <option>Sequence Diagram</option>
                                    <option>Activity Diagram</option>
                                    <option>State Machine</option>
                                    <option>Use Case</option>
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
