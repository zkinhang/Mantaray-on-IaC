import React, { memo } from 'react';
import { Activity, Power, ShieldAlert } from 'lucide-react';
import { MovementControl } from './MovementControl';
import { useRos } from '../context/RosContext';

interface PowerLimitMsg {
  forward: number;
  rightward: number;
  upward: number;
  roll: number;
  pitch: number;
  yaw: number;
}

type AxisKey = keyof PowerLimitMsg;

const POWER_LEVELS: { label: string; value: number }[] = [
  { label: 'LOW', value: 0.3 },
  { label: 'MED', value: 0.5 },
  { label: 'HIGH', value: 0.7 },
  { label: 'MAX', value: 1.0 },
];

const AXES: { key: AxisKey; label: string }[] = [
  { key: 'forward', label: 'Forward' },
  { key: 'rightward', label: 'Rightward' },
  { key: 'upward', label: 'Upward' },
  { key: 'roll', label: 'Roll' },
  { key: 'pitch', label: 'Pitch' },
  { key: 'yaw', label: 'Yaw' },
];

export const ControlPanel: React.FC = memo(() => {
  const { pidOn, togglePid, addLog, powerLimit, setPowerLimit, powerPresets } = useRos();
  const [selectedAxis, setSelectedAxis] = React.useState<AxisKey>('forward');

  const selectAxis = (axis: AxisKey) => {
    setSelectedAxis(axis);
    const label = AXES.find((a) => a.key === axis)?.label ?? axis;
    addLog('info', `Pilot axis selected: ${label}`);
  };

  const setSelectedAxisPreset = (value: number) => {
    const label = AXES.find((a) => a.key === selectedAxis)?.label ?? selectedAxis;
    const next: PowerLimitMsg = {
      ...powerLimit,
      [selectedAxis]: value,
    };
    setPowerLimit(next);
    addLog('info', `Pilot ${label} preset set to ${value.toFixed(1)}`);
  };

  const selectedAxisLabel = AXES.find((a) => a.key === selectedAxis)?.label ?? selectedAxis;

  return (
    <div className="bg-k3s-block border-2 border-k3s-border p-4 flex flex-col h-full shadow-2xl min-h-0 overflow-hidden">
      <div className="flex items-center space-x-3 mb-4 pb-2 border-b-2 border-k3s-border flex-none">
        <Activity className="w-5 h-5 text-k3s-primary" />
        <h2 className="text-lg font-bold text-white tracking-tight uppercase">Mission Control</h2>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
        {/* Movement Module */}
        <MovementControl />

        {/* Pilot Power Axes (6 equal buttons) */}
        <div className="space-y-3 pb-4">
          <div className="flex items-center gap-2 text-sm font-bold text-k3s-primary uppercase tracking-wider border-b border-k3s-border pb-2">
            <Activity className="w-4 h-4" />
            <span>Pilot Power Axes</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {AXES.map((axis) => (
              <button
                key={axis.key}
                onClick={() => selectAxis(axis.key)}
                className={[
                  'py-2 px-2 rounded border text-[10px] font-bold uppercase tracking-wider transition-all',
                  selectedAxis === axis.key
                    ? 'bg-orange-500/20 text-orange-200 border-orange-400 shadow-[0_0_0_1px_rgba(251,146,60,0.45),0_0_16px_rgba(251,146,60,0.24)]'
                    : 'bg-k3s-dark text-k3s-muted border-k3s-border hover:border-orange-400/50 hover:text-orange-200',
                ].join(' ')}
              >
                {axis.label}
              </button>
            ))}
          </div>

          <div className="bg-k3s-dark border border-orange-400/45 rounded px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-orange-200 font-semibold uppercase tracking-wide">{selectedAxisLabel}</span>
              <span className="text-xs font-mono text-orange-200">{powerLimit[selectedAxis].toFixed(2)} / 1.0</span>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1">
              {powerPresets.map((lvl) => {
                const active = Math.abs(powerLimit[selectedAxis] - lvl.value) < 0.001;
                return (
                  <button
                    key={`${selectedAxis}-${lvl.value}`}
                    onClick={() => setSelectedAxisPreset(lvl.value)}
                    className={[
                      'px-1.5 py-1 rounded text-[10px] font-semibold border transition-colors',
                      active
                        ? 'bg-orange-500/30 text-orange-100 border-orange-300'
                        : 'bg-k3s-block border-k3s-border text-k3s-muted hover:text-orange-100 hover:border-orange-300/70',
                    ].join(' ')}
                  >
                    {lvl.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

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
      </div>
      
    </div>
  );
});
