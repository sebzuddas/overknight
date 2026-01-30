'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FileImage, Plus, ExternalLink, Save } from 'lucide-react';
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

    // Load file list
    useEffect(() => {
        if (!projectPath) return;
        fetch(`/api/architectures?projectPath=${encodeURIComponent(projectPath)}`)
            .then(res => {
                if (res.ok) {
                    res.json().then(data => setFiles(data.files || []));
                }
            });
    }, [projectPath]);

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
                // User clicked save (if we enabled it) or autosave
                // Implement save logic if 'xml' is present
                // For now we just log it as we haven't implemented 'save' backend fully (only create)
                // To support save, we need to add 'save' action to API. 
                // Currently ignoring to focus on loading fix.
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
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl border border-gray-700/50 overflow-hidden">
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
                    {/* External link is generic now */}
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
        </div>
    );
}
