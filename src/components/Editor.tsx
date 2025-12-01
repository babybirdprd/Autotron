import React, { useState } from 'react';
import AceEditor from "react-ace";
import { Play, Save, Check } from 'lucide-react';
import { useWorkflow } from '../contexts/WorkflowContext';

// Import Ace configurations
import "ace-builds/src-noconflict/mode-rust";
import "ace-builds/src-noconflict/theme-twilight";
import "ace-builds/src-noconflict/ext-language_tools";

export const Editor: React.FC = () => {
    const {
        currentContent,
        setCurrentContent,
        currentWorkflow,
        saveWorkflow,
        runCurrent,
        isRunning
    } = useWorkflow();

    const [saveName, setSaveName] = useState('');
    const [isNaming, setIsNaming] = useState(false);

    const handleSave = async () => {
        if (currentWorkflow) {
            await saveWorkflow(currentWorkflow, currentContent);
        } else {
            setIsNaming(true);
        }
    };

    const confirmName = async () => {
        if (saveName) {
            await saveWorkflow(saveName, currentContent);
            setIsNaming(false);
            setSaveName('');
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-900">
            {/* Toolbar */}
            <div className="h-12 border-b border-gray-800 flex items-center justify-between px-4 bg-gray-900">
                <div className="flex items-center gap-2">
                    {isNaming ? (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                            <input
                                autoFocus
                                type="text"
                                placeholder="Workflow Name..."
                                className="bg-gray-800 border border-gray-700 text-white text-sm rounded px-2 py-1 outline-none focus:border-blue-500"
                                value={saveName}
                                onChange={e => setSaveName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && confirmName()}
                            />
                            <button onClick={confirmName} className="text-green-400 hover:bg-gray-800 p-1 rounded">
                                <Check size={16} />
                            </button>
                        </div>
                    ) : (
                        <h2 className="text-sm font-medium text-gray-300">
                            {currentWorkflow ? `${currentWorkflow}.rhai` : 'Untitled Script'}
                        </h2>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 text-gray-400 hover:text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors hover:bg-gray-800"
                    >
                        <Save size={14} />
                        Save
                    </button>
                    <button
                        onClick={() => runCurrent()}
                        disabled={isRunning}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${isRunning ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20'}`}
                    >
                        <Play size={14} fill="currentColor" />
                        {isRunning ? 'Running...' : 'Run'}
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 relative">
                <AceEditor
                    mode="rust"
                    theme="twilight"
                    name="main_editor"
                    value={currentContent}
                    onChange={setCurrentContent}
                    width="100%"
                    height="100%"
                    fontSize={14}
                    showPrintMargin={false}
                    showGutter={true}
                    highlightActiveLine={true}
                    setOptions={{
                        enableBasicAutocompletion: true,
                        enableLiveAutocompletion: true,
                        enableSnippets: false,
                        showLineNumbers: true,
                        tabSize: 4,
                        fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace"
                    }}
                />
            </div>
        </div>
    );
};
