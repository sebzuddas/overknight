'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Key, Check, AlertCircle, Loader2, Eye, EyeOff, RefreshCw } from 'lucide-react';

interface ProviderStatus {
    configured: boolean;
    masked: string;
}

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PROVIDER_INFO: Record<string, { name: string; placeholder: string; docsUrl: string }> = {
    gemini: {
        name: 'Google Gemini',
        placeholder: 'AIzaSy...',
        docsUrl: 'https://aistudio.google.com/app/apikey',
    },
    openai: {
        name: 'OpenAI',
        placeholder: 'sk-...',
        docsUrl: 'https://platform.openai.com/api-keys',
    },
    anthropic: {
        name: 'Anthropic Claude',
        placeholder: 'sk-ant-...',
        docsUrl: 'https://console.anthropic.com/settings/keys',
    },
};

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [status, setStatus] = useState<Record<string, ProviderStatus>>({});
    const [providers, setProviders] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [showKey, setShowKey] = useState<Record<string, boolean>>({});
    const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchStatus = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/settings');
            if (res.ok) {
                const data = await res.json();
                setStatus(data.status || {});
                setProviders(data.providers || []);
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchStatus();
            setKeyInputs({});
            setMessage(null);
        }
    }, [isOpen, fetchStatus]);

    const handleSaveKey = async (provider: string) => {
        const apiKey = keyInputs[provider];
        if (!apiKey?.trim()) return;

        setSaving(provider);
        setMessage(null);

        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider, apiKey }),
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: data.message });
                setKeyInputs(prev => ({ ...prev, [provider]: '' }));
                await fetchStatus();
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to save' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Network error' });
            console.error(error);
        } finally {
            setSaving(null);
        }
    };

    const handleRemoveKey = async (provider: string) => {
        setSaving(provider);
        setMessage(null);

        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider, apiKey: '' }),
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: `${PROVIDER_INFO[provider]?.name || provider} key removed` });
                await fetchStatus();
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to remove' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Network error' });
            console.error(error);
        } finally {
            setSaving(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg mx-4 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-950">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-lg">
                            <Key className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">API Settings</h2>
                            <p className="text-xs text-gray-500">Configure your LLM provider API keys</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                    {/* Message */}
                    {message && (
                        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${message.type === 'success'
                            ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                            : 'bg-red-500/10 border border-red-500/30 text-red-400'
                            }`}>
                            {message.type === 'success' ? (
                                <Check className="w-4 h-4 shrink-0" />
                            ) : (
                                <AlertCircle className="w-4 h-4 shrink-0" />
                            )}
                            <span>{message.text}</span>
                        </div>
                    )}

                    {/* Note about restart */}
                    <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-400">
                        <RefreshCw className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>After saving an API key, restart the dev server for changes to take effect.</span>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {providers.map((provider) => {
                                const info = PROVIDER_INFO[provider] || { name: provider, placeholder: '', docsUrl: '' };
                                const providerStatus = status[provider];
                                const isConfigured = providerStatus?.configured;
                                const isSaving = saving === provider;

                                return (
                                    <div
                                        key={provider}
                                        className="p-4 bg-gray-800/50 border border-gray-700 rounded-xl space-y-3"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-white">{info.name}</span>
                                                {isConfigured && (
                                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                                                        <Check className="w-3 h-3" />
                                                        Configured
                                                    </span>
                                                )}
                                            </div>
                                            <a
                                                href={info.docsUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                                            >
                                                Get API Key →
                                            </a>
                                        </div>

                                        {isConfigured && (
                                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                                <span className="font-mono">{providerStatus.masked}</span>
                                            </div>
                                        )}

                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <input
                                                    type={showKey[provider] ? 'text' : 'password'}
                                                    value={keyInputs[provider] || ''}
                                                    onChange={(e) => setKeyInputs(prev => ({ ...prev, [provider]: e.target.value }))}
                                                    placeholder={isConfigured ? 'Enter new key to replace...' : info.placeholder}
                                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-3 pr-10 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowKey(prev => ({ ...prev, [provider]: !prev[provider] }))}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-300 transition-colors"
                                                >
                                                    {showKey[provider] ? (
                                                        <EyeOff className="w-4 h-4" />
                                                    ) : (
                                                        <Eye className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => handleSaveKey(provider)}
                                                disabled={!keyInputs[provider]?.trim() || isSaving}
                                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition-colors"
                                            >
                                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                                            </button>
                                            {isConfigured && (
                                                <button
                                                    onClick={() => handleRemoveKey(provider)}
                                                    disabled={isSaving}
                                                    className="px-3 py-2 text-red-400 hover:bg-red-500/10 text-sm font-medium rounded-lg transition-colors"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-800 bg-gray-950/50">
                    <p className="text-xs text-gray-500">
                        API keys are stored in <code className="text-gray-400">.env.local</code> and never shared.
                    </p>
                </div>
            </div>
        </div>
    );
}
