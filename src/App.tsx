import { StoreProvider } from './contexts/StoreContext';
import { WorkflowProvider } from './contexts/WorkflowContext';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { Console } from './components/Console';
import { SettingsModal } from './components/SettingsModal';
import { useState } from 'react';
import './App.css';

function AppContent() {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    return (
        <div className="flex h-screen w-screen bg-black text-white overflow-hidden font-sans">
            <Sidebar onOpenSettings={() => setIsSettingsOpen(true)} />
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <Editor />
                <Console />
            </div>
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div>
    );
}

export default function App() {
    return (
        <StoreProvider>
            <WorkflowProvider>
                <AppContent />
            </WorkflowProvider>
        </StoreProvider>
    );
}
