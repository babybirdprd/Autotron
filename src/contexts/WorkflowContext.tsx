import React, { createContext, useContext, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useAppStore } from './StoreContext';

interface WorkflowResult {
    output: string;
    execution_time_ms: number;
}

interface WorkflowContextType {
  workflows: string[];
  currentWorkflow: string | null; // Name of file, null if new
  currentContent: string;
  refreshWorkflows: () => Promise<void>;
  loadWorkflow: (name: string) => Promise<void>;
  saveWorkflow: (name: string, content: string) => Promise<void>;
  deleteWorkflow: (name: string) => Promise<void>;
  createNew: () => void;
  setCurrentContent: (content: string) => void;
  runCurrent: () => Promise<WorkflowResult>;
  logs: string[];
  isRunning: boolean;
  clearLogs: () => void;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export const WorkflowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, secretKeys } = useAppStore();
  const [workflows, setWorkflows] = useState<string[]>([]);
  const [currentWorkflow, setCurrentWorkflow] = useState<string | null>(null);
  const [currentContent, setCurrentContent] = useState<string>('// Write your Rhai script here\nprint("Hello World!");');
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
      refreshWorkflows();

      const unlisten = listen<string>('log_event', (event) => {
          setLogs((prev) => [...prev, event.payload]);
      });

      return () => {
          unlisten.then(f => f());
      };
  }, []);

  const refreshWorkflows = async () => {
      try {
        const list = await invoke<string[]>('list_workflows');
        setWorkflows(list);
      } catch (e) {
          console.error("Failed to list workflows", e);
      }
  };

  const loadWorkflow = async (name: string) => {
      try {
          const content = await invoke<string>('read_workflow', { name });
          setCurrentWorkflow(name);
          setCurrentContent(content);
          setLogs([]);
      } catch (e) {
          console.error("Failed to load workflow", e);
      }
  };

  const saveWorkflow = async (name: string, content: string) => {
      await invoke('save_workflow', { name, content });
      await refreshWorkflows();
      setCurrentWorkflow(name);
  };

  const deleteWorkflow = async (name: string) => {
      await invoke('delete_workflow', { name });
      await refreshWorkflows();
      if (currentWorkflow === name) {
          createNew();
      }
  };

  const createNew = () => {
      setCurrentWorkflow(null);
      setCurrentContent('// New Workflow\n');
      setLogs([]);
  };

  const clearLogs = () => {
      setLogs([]);
  };

  const runCurrent = async () => {
      setIsRunning(true);
      setLogs([]); // Clear logs on new run? Yes.
      try {
          const result = await invoke<WorkflowResult>('run_workflow', {
              script: currentContent,
              inputs: {}, // For Phase 1 we don't have dynamic inputs UI yet, just secrets
              secretKeys: secretKeys,
              aiBaseUrl: settings.aiBaseUrl
          });
          setIsRunning(false);
          return result;
      } catch (e) {
          setIsRunning(false);
          const err = String(e);
          setLogs(prev => [...prev, `[Error]: ${err}`]);
          throw e;
      }
  };

  return (
    <WorkflowContext.Provider value={{
        workflows,
        currentWorkflow,
        currentContent,
        refreshWorkflows,
        loadWorkflow,
        saveWorkflow,
        deleteWorkflow,
        createNew,
        setCurrentContent,
        runCurrent,
        logs,
        isRunning,
        clearLogs
    }}>
      {children}
    </WorkflowContext.Provider>
  );
};

export const useWorkflow = () => {
  const context = useContext(WorkflowContext);
  if (!context) throw new Error('useWorkflow must be used within WorkflowProvider');
  return context;
};
