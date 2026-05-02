import React, { useState, useEffect } from 'react';
import { Settings, Home, Layout as LayoutIcon, Activity, Save, CheckCircle2, History, Edit3 } from 'lucide-react';
import { RobotConfigurator } from '../components/RobotConfigurator';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'editor' | 'history'>('editor');

  return (
    <div className="h-full p-8 max-w-[1400px] w-full mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between border-b-2 border-k3s-primary pb-4">
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8 text-k3s-primary" />
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">System Configuration</h1>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('editor')}
            className={`flex items-center gap-2 px-6 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'editor' ? 'bg-k3s-primary text-black' : 'bg-k3s-block border border-k3s-border text-k3s-muted hover:text-white'}`}
          >
            <Edit3 className="w-4 h-4" />
            Configurator
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-6 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'history' ? 'bg-k3s-primary text-black' : 'bg-k3s-block border border-k3s-border text-k3s-muted hover:text-white'}`}
          >
            <History className="w-4 h-4" />
            Version History
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <RobotConfigurator activeTab={activeTab} />
      </div>
    </div>
  );
};
