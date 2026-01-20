import React, { useState, useEffect } from 'react';
import { Activity, Power, ShieldAlert } from 'lucide-react';
import { MovementControl } from './MovementControl';
import { rosService } from '../services/rosService';

export const ControlPanel: React.FC = () => {
  const [pidOn, setPidOn] = useState(true);

  useEffect(() => {
    const unsub = rosService.subscribePid(setPidOn);
    return () => unsub();
  }, []);

  return (
    <div className="bg-k3s-block border-2 border-k3s-border p-5 flex flex-col h-full shadow-2xl min-h-0 overflow-hidden">
      <div className="flex items-center space-x-3 mb-6 pb-4 border-b-2 border-k3s-border flex-none">
        <Activity className="w-6 h-6 text-k3s-primary" />
        <h2 className="text-xl font-bold text-white tracking-tight uppercase">Mission Control</h2>
      </div>

      <div className="space-y-8 flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
        {/* Movement Module */}
        <MovementControl />

        {/* PID Toggle Section */}
        <div className="space-y-4 pb-4">
           <div className="flex items-center gap-2 text-sm font-bold text-k3s-primary uppercase tracking-wider border-b border-k3s-border pb-2">
            <ShieldAlert className="w-4 h-4" />
            <span>Systems</span>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            <button 
              onClick={() => rosService.publishPidToggle(!pidOn)}
              className={`py-4 font-bold border-2 transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95 ${
                pidOn 
                  ? 'bg-green-600 text-white border-green-400 hover:bg-green-500 shadow-green-900/50' 
                  : 'bg-red-600 text-white border-red-400 hover:bg-red-500 shadow-red-900/50'
              }`}
            >
              <Power className={`w-5 h-5 ${pidOn ? 'animate-pulse' : ''}`} />
              <span>{pidOn ? "PID ENABLED" : "PID DISABLED"}</span>
            </button>
          </div>

        </div>
      </div>
      
    </div>
  );
};