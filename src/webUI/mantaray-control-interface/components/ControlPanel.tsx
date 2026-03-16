import React, { memo } from 'react';
import { Activity, Power, ShieldAlert, Pin } from 'lucide-react';
import { MovementControl } from './MovementControl';
import { useRos } from '../context/RosContext';

export const ControlPanel: React.FC = memo(() => {
  const { pidOn, togglePid, pinnedLimits, setPinnedLimit } = useRos();
  const pinnedEntries = Object.entries(pinnedLimits) as [string, { axisLabel: string; levelLabel: string; value: number }][];

  return (
    <div className="bg-k3s-block border-2 border-k3s-border p-4 flex flex-col h-full shadow-2xl min-h-0 overflow-hidden">
      <div className="flex items-center space-x-3 mb-4 pb-2 border-b-2 border-k3s-border flex-none">
        <Activity className="w-5 h-5 text-k3s-primary" />
        <h2 className="text-lg font-bold text-white tracking-tight uppercase">Mission Control</h2>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
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
              onClick={() => togglePid(!pidOn)}
              className={`py-3 font-bold border-2 transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95 ${
                pidOn 
                  ? 'bg-green-600 text-white border-green-400 hover:bg-green-500 shadow-green-900/50' 
                  : 'bg-red-600 text-white border-red-400 hover:bg-red-500 shadow-red-900/50'
              }`}
            >
              <Power className={`w-5 h-5 ${pidOn ? 'animate-pulse' : ''}`} />
              <span className="text-xs">{pidOn ? "PID ENABLED" : "PID DISABLED"}</span>
            </button>
          </div>

        </div>

        {/* Pilot Reference Control (PRC) — pinned power limits */}
        <div className="space-y-2 pb-4">
          <div className="flex items-center gap-2 text-sm font-bold text-k3s-primary uppercase tracking-wider border-b border-k3s-border pb-2">
            <Pin className="w-4 h-4" />
            <span>PRC</span>
          </div>
          {pinnedEntries.length === 0 ? (
            <p className="text-xs text-k3s-muted italic">
              No limits pinned — go to Telemetry and pin an axis.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {pinnedEntries.map(([axis, pin]) => (
                <div
                  key={axis}
                  className="flex items-center gap-1 bg-k3s-dark border border-k3s-border rounded px-2 py-0.5"
                >
                  <span className="text-xs text-white font-semibold">{pin.axisLabel}</span>
                  <span className="text-xs text-k3s-primary font-bold">{pin.levelLabel}</span>
                  <button
                    title="Unpin"
                    onClick={() => setPinnedLimit(axis as any, null)}
                    className="ml-0.5 text-k3s-muted hover:text-red-400 transition-colors"
                  >
                    <Pin className="w-2.5 h-2.5" fill="currentColor" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
      
    </div>
  );
});
