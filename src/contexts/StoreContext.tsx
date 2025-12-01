import React, { createContext, useContext, useEffect, useState } from 'react';
import { Store } from '@tauri-apps/plugin-store';
import { invoke } from '@tauri-apps/api/core';

interface AppSettings {
  aiBaseUrl: string;
  defaultModel: string;
}

interface StoreContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  secretKeys: string[];
  addSecret: (key: string, value: string) => Promise<void>;
  removeSecret: (key: string) => Promise<void>;
  loading: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [store] = useState(() => new Store('.settings.dat'));
  const [settings, setSettings] = useState<AppSettings>({
    aiBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-3.5-turbo',
  });
  const [secretKeys, setSecretKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
          // Load Settings
          const savedSettings = await store.get<AppSettings>('app_settings');
          if (savedSettings) {
            setSettings((prev) => ({ ...prev, ...savedSettings }));
          }

          // Load Secret Keys List
          const savedKeys = await store.get<string[]>('secret_keys');
          if (savedKeys) {
            setSecretKeys(savedKeys);
          }
      } catch (e) {
          console.error("Failed to load store:", e);
      }
      setLoading(false);
    };
    init();
  }, []);

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await store.set('app_settings', updated);
    await store.save();
  };

  const addSecret = async (key: string, value: string) => {
    // Call Rust to secure save
    await invoke('save_secret', { key, value });

    // Update local list
    if (!secretKeys.includes(key)) {
      const updated = [...secretKeys, key];
      setSecretKeys(updated);
      await store.set('secret_keys', updated);
      await store.save();
    }
  };

  const removeSecret = async (key: string) => {
    await invoke('delete_secret', { key });
    const updated = secretKeys.filter(k => k !== key);
    setSecretKeys(updated);
    await store.set('secret_keys', updated);
    await store.save();
  };

  return (
    <StoreContext.Provider value={{ settings, updateSettings, secretKeys, addSecret, removeSecret, loading }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useAppStore must be used within StoreProvider');
  return context;
};
