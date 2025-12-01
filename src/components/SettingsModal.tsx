import React, { useState } from 'react';
import { X, Key, Save, Trash2, Globe } from 'lucide-react';
import { useAppStore } from '../contexts/StoreContext';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const { settings, updateSettings, secretKeys, addSecret, removeSecret } = useAppStore();
    const [activeTab, setActiveTab] = useState<'general' | 'secrets'>('general');

    // Form States
    const [baseUrl, setBaseUrl] = useState(settings.aiBaseUrl);
    const [newSecretKey, setNewSecretKey] = useState('');
    const [newSecretVal, setNewSecretVal] = useState('');

    const handleSaveGeneral = async () => {
        await updateSettings({ aiBaseUrl: baseUrl });
    };

    const handleAddSecret = async () => {
        if (!newSecretKey || !newSecretVal) return;
        await addSecret(newSecretKey, newSecretVal);
        setNewSecretKey('');
        setNewSecretVal('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-700 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-950">
                    <h2 className="text-white font-semibold text-lg">Settings</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex bg-gray-900 border-b border-gray-800">
                    <button
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'general' ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800/50' : 'text-gray-400 hover:text-white'}`}
                        onClick={() => setActiveTab('general')}
                    >
                        General & AI
                    </button>
                    <button
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'secrets' ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800/50' : 'text-gray-400 hover:text-white'}`}
                        onClick={() => setActiveTab('secrets')}
                    >
                        Secrets & Keys
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 text-gray-200">

                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                                    <Globe size={16} />
                                    AI Provider Base URL
                                </label>
                                <input
                                    type="text"
                                    value={baseUrl}
                                    onChange={(e) => setBaseUrl(e.target.value)}
                                    className="w-full bg-gray-950 border border-gray-700 rounded-md p-2 text-white focus:outline-none focus:border-blue-500"
                                    placeholder="https://api.openai.com/v1"
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    For Ollama, use: <code>http://localhost:11434/v1</code>
                                </p>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    onClick={handleSaveGeneral}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium"
                                >
                                    <Save size={16} />
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'secrets' && (
                        <div className="space-y-6">
                            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                                <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
                                    <Key size={16} />
                                    Add New Secret
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <input
                                        type="text"
                                        placeholder="KEY_NAME (e.g. OPENAI_KEY)"
                                        value={newSecretKey}
                                        onChange={(e) => setNewSecretKey(e.target.value.toUpperCase().replace(/\s/g, '_'))}
                                        className="bg-gray-950 border border-gray-700 rounded-md p-2 text-white text-sm"
                                    />
                                    <input
                                        type="password"
                                        placeholder="sk-..."
                                        value={newSecretVal}
                                        onChange={(e) => setNewSecretVal(e.target.value)}
                                        className="bg-gray-950 border border-gray-700 rounded-md p-2 text-white text-sm"
                                    />
                                </div>
                                <button
                                    onClick={handleAddSecret}
                                    disabled={!newSecretKey || !newSecretVal}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-md text-sm font-medium transition-colors"
                                >
                                    Securely Save to Keychain
                                </button>
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-gray-400 mb-3 uppercase text-xs tracking-wider">Stored Secrets</h3>
                                {secretKeys.length === 0 ? (
                                    <div className="text-gray-500 text-sm italic">No secrets stored.</div>
                                ) : (
                                    <div className="space-y-2">
                                        {secretKeys.map(key => (
                                            <div key={key} className="flex items-center justify-between bg-gray-950 p-3 rounded-md border border-gray-800">
                                                <div className="flex items-center gap-3">
                                                    <Key size={14} className="text-yellow-500" />
                                                    <span className="font-mono text-sm text-gray-300">{key}</span>
                                                </div>
                                                <button
                                                    onClick={() => removeSecret(key)}
                                                    className="text-gray-500 hover:text-red-400 transition-colors p-1"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
