import React from 'react';
import { FileCode, Plus, Settings, Trash2 } from 'lucide-react';
import { useWorkflow } from '../contexts/WorkflowContext';

interface SidebarProps {
    onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenSettings }) => {
    const { workflows, loadWorkflow, deleteWorkflow, createNew, currentWorkflow } = useWorkflow();

    return (
        <div className="w-64 bg-gray-900 text-white h-full flex flex-col border-r border-gray-800">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <h1 className="font-bold text-lg tracking-tight">Automator</h1>
                <button onClick={onOpenSettings} className="p-2 hover:bg-gray-800 rounded-md transition-colors">
                    <Settings size={18} />
                </button>
            </div>

            <div className="p-4">
                <button
                    onClick={createNew}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md flex items-center justify-center gap-2 transition-colors font-medium text-sm"
                >
                    <Plus size={16} />
                    New Workflow
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
                    My Workflows
                </div>
                {workflows.map(wf => (
                    <div
                        key={wf}
                        className={`group flex items-center justify-between p-2 rounded-md mb-1 cursor-pointer transition-colors ${currentWorkflow === wf ? 'bg-gray-800 text-blue-400' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
                        onClick={() => loadWorkflow(wf)}
                    >
                        <div className="flex items-center gap-2 truncate">
                            <FileCode size={16} />
                            <span className="truncate text-sm">{wf}</span>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); deleteWorkflow(wf); }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded text-gray-500 hover:text-red-400 transition-all"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
