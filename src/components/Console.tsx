import React, { useEffect, useRef } from 'react';
import { Terminal, XCircle } from 'lucide-react';
import { useWorkflow } from '../contexts/WorkflowContext';

export const Console: React.FC = () => {
    const { logs, clearLogs } = useWorkflow();
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <div className="h-48 bg-gray-950 border-t border-gray-800 flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
                <div className="flex items-center gap-2 text-gray-400">
                    <Terminal size={16} />
                    <span className="text-xs font-mono font-medium">CONSOLE OUTPUT</span>
                </div>
                <button
                    onClick={clearLogs}
                    className="p-1 hover:bg-gray-800 rounded text-gray-500 hover:text-white transition-colors"
                    title="Clear Console"
                >
                    <XCircle size={16} />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-1">
                {logs.length === 0 && (
                    <div className="text-gray-600 italic">Ready to execute...</div>
                )}
                {logs.map((log, i) => (
                    <div key={i} className="text-gray-300 break-words whitespace-pre-wrap border-b border-gray-900/50 pb-1">
                        <span className="text-gray-600 select-none mr-2">$</span>
                        {log}
                    </div>
                ))}
                <div ref={endRef} />
            </div>
        </div>
    );
};
