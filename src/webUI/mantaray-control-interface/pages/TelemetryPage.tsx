import React, { useState, useEffect } from 'react';
import { useRosApp } from '../context/RosContext';

// StatusIndicator Component - inline for consistency
const StatusIndicator: React.FC<{ active: boolean; label?: string; size?: 'sm' | 'md'; showText?: boolean; className?: string }> = ({
  active,
  label,
  size = 'md',
  showText = true,
  className = '',
}) => {
  const sizeClass = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className={`rounded-full ${sizeClass} transition-all ${active ? 'bg-k3s-primary ring-2 ring-k3s-primary/50 animate-pulse' : 'bg-k3s-muted'}`} />
      {showText && label && <span className="text-xs text-k3s-muted">{label}</span>}
    </div>
  );
};

// PowerLimit message structure matching ROS custom_interfaces/PowerLimit
interface PowerLimitMsg {
  forward: number;
  rightward: number;
  upward: number;
  roll: number;
  pitch: number;
  yaw: number;
}

type AxisKey = keyof PowerLimitMsg;
type PresetGroupKey = 'global' | AxisKey;

const AXES: { key: AxisKey; label: string }[] = [
  { key: 'forward',   label: 'Forward' },
  { key: 'rightward', label: 'Rightward' },
  { key: 'upward',    label: 'Upward' },
  { key: 'roll',      label: 'Roll' },
  { key: 'pitch',     label: 'Pitch' },
  { key: 'yaw',       label: 'Yaw' },
];

// Helper: Check if all axes are synchronized to the same value
const areAllAxesSynchronized = (limits: PowerLimitMsg): boolean => {
  const values = [limits.forward, limits.rightward, limits.upward, limits.roll, limits.pitch, limits.yaw];
  return values.every((v) => Math.abs(v - values[0]) < 0.001);
};

// Helper: Get the synchronized value if all axes match, otherwise undefined
const getSynchronizedValue = (limits: PowerLimitMsg): number | null => {
  return areAllAxesSynchronized(limits) ? limits.forward : null;
};

export const TelemetryPage: React.FC = () => {
  const { powerLimit, setPowerLimit, addLog, powerPresets, updatePowerPresets } = useRosApp();

  const [globalLevel, setGlobalLevel] = useState<number>(() => {
    const syncValue = getSynchronizedValue(powerLimit);
    return syncValue !== null ? syncValue : 0.5;
  });
  const [editingPreset, setEditingPreset] = useState<{ group: PresetGroupKey; index: number } | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  // Update global level when powerLimit changes
  useEffect(() => {
    const syncValue = getSynchronizedValue(powerLimit);
    if (syncValue !== null) {
      setGlobalLevel(syncValue);
    }
  }, [powerLimit]);

  const startEditingPreset = (group: PresetGroupKey, index: number) => {
    setEditingPreset({ group, index });
    setEditingValue(powerPresets[group][index].value.toString());
  };

  const setAxisPower = (axis: AxisKey, value: number) => {
    const updated: PowerLimitMsg = { ...powerLimit, [axis]: value };
    setPowerLimit(updated);
    addLog('info', `[Telemetry] ${axis} → ${value}`);
  };

  const applyGlobalLimit = (value: number) => {
    setGlobalLevel(value);
    const updated: PowerLimitMsg = {
      forward: value,
      rightward: value,
      upward: value,
      roll: value,
      pitch: value,
      yaw: value,
    };
    setPowerLimit(updated);
    addLog('info', `[Telemetry] global → ${value}`);
  };

  const finishEditingPreset = () => {
    if (!editingPreset) return;
    const { group, index } = editingPreset;
    const newValue = Math.max(0, Math.min(1, parseFloat(editingValue) || 0));
    
    const newPresets = { ...powerPresets };
    
    if (group === 'global') {
      // If editing global, cascade the newly set preset value to all individual axes
      (Object.keys(newPresets) as PresetGroupKey[]).forEach((g) => {
        const groupPresets = [...newPresets[g]];
        groupPresets[index] = { ...groupPresets[index], value: newValue };
        groupPresets.sort((a, b) => a.value - b.value);
        newPresets[g] = groupPresets;
      });
      addLog('info', `[Telemetry] Global & All Axes Preset updated: ${newPresets.global[index].label} → ${newValue.toFixed(2)}`);
      
      // Automatically apply the new global value
      applyGlobalLimit(newValue);
    } else {
      // Otherwise just update the specific axis
      const groupPresets = [...newPresets[group]];
      groupPresets[index] = { ...groupPresets[index], value: newValue };
      groupPresets.sort((a, b) => a.value - b.value);
      newPresets[group] = groupPresets;
      addLog('info', `[Telemetry] ${group} Preset updated: ${groupPresets[index].label} → ${newValue.toFixed(2)}`);
      
      // Automatically apply the new axis value
      setAxisPower(group, newValue);
    }
    
    updatePowerPresets(newPresets);
    setEditingPreset(null);
  };

  const cancelEditingPreset = () => {
    setEditingPreset(null);
    setEditingValue('');
  };

  return (
    <div className="h-full bg-k3s-bg flex items-center justify-center p-4">
      <aside className="space-y-6 h-full w-full max-w-6xl overflow-y-auto">

        {/* ── Global Power Limit Section ── */}
        <div className="bg-gradient-to-br from-k3s-block to-k3s-block/80 border-2 border-k3s-primary/40 p-4 space-y-3 shadow-2xl rounded-lg">
          <div className="flex items-center space-x-2 pb-3 border-b-2 border-k3s-primary/30">
            <div className="text-sm font-bold text-k3s-primary tracking-wide uppercase">Global Power Limit</div>
          </div>

          {/* Current Value Display */}
          <div className="flex items-center justify-between gap-2 bg-k3s-border/20 rounded px-3 py-2">
            <span className="font-mono text-3xl font-bold text-k3s-primary">
              {areAllAxesSynchronized(powerLimit) ? globalLevel.toFixed(2) : '-'}
            </span>
            <span className="text-xs text-k3s-muted">
              {areAllAxesSynchronized(powerLimit) ? '/ 1.0' : 'Mixed'}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-k3s-border overflow-hidden">
            <div
              className="h-full rounded-full bg-k3s-primary transition-all duration-300 shadow-lg shadow-k3s-primary/50"
              style={{ width: `${areAllAxesSynchronized(powerLimit) ? globalLevel * 100 : 0}%` }}
            />
          </div>

          {/* Power Buttons - 4 in a row */}
          <div className="flex gap-3">
            {powerPresets.global.map((lvl, idx) => {
              const synchronized = areAllAxesSynchronized(powerLimit);
              const active = synchronized && Math.abs(globalLevel - lvl.value) < 0.001;
              const isEditing = editingPreset?.group === 'global' && editingPreset.index === idx;
              return (
                <div key={lvl.label} className="flex-1 flex flex-col items-center justify-center">
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => finishEditingPreset()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') finishEditingPreset();
                        if (e.key === 'Escape') cancelEditingPreset();
                      }}
                      autoFocus
                      className="w-full px-2 py-1 rounded border border-k3s-primary bg-k3s-dark text-white font-semibold text-center text-xs focus:outline-none"
                    />
                  ) : (
                    <button
                      onClick={() => applyGlobalLimit(lvl.value)}
                      onDoubleClick={() => startEditingPreset('global', idx)}
                      title="Click to apply, double-click to edit preset"
                      className={[
                        'w-full flex flex-col items-center justify-center rounded font-semibold transition-all relative overflow-hidden py-3 px-2 border-2 min-h-16 cursor-pointer',
                        active
                          ? 'bg-k3s-primary/20 border-k3s-primary text-k3s-primary shadow-lg shadow-k3s-primary/20'
                          : 'bg-k3s-block border-k3s-border/50 text-k3s-muted hover:text-white hover:border-k3s-primary/50 hover:shadow-lg',
                      ].join(' ')}
                    >
                      <span className="text-base font-bold">{lvl.label}</span>
                      <span className="text-xs text-k3s-muted mt-0.5">{lvl.value.toFixed(2)}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Per-Axis Power Limits ── */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-sm font-bold text-k3s-primary tracking-wide uppercase px-1 border-b-2 border-k3s-primary/30 pb-2">
            Individual Axis Controls
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {AXES.map((a) => (
              <div 
                key={a.key} 
                className="bg-gradient-to-br from-k3s-block to-k3s-block/70 border-2 border-k3s-border/50 p-3 space-y-2 shadow-lg rounded transition-all hover:border-k3s-primary/40 hover:shadow-xl"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-bold text-white tracking-tight uppercase">{a.label}</div>
                  <span className="font-mono text-base font-bold text-k3s-primary flex-shrink-0">{powerLimit[a.key].toFixed(2)}</span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full h-1.5 rounded-full bg-k3s-border overflow-hidden">
                  <div
                    className="h-full rounded-full bg-k3s-primary transition-all duration-300"
                    style={{ width: `${powerLimit[a.key] * 100}%` }}
                  />
                </div>

                {/* Power Buttons - 4 in a row, more compact */}
                <div className="flex gap-2">
                  {powerPresets[a.key].map((lvl, idx) => {
                    const active = Math.abs(powerLimit[a.key] - lvl.value) < 0.001;
                    const isEditing = editingPreset?.group === a.key && editingPreset.index === idx;
                    return (
                      <div key={lvl.label} className="flex-1 flex flex-col items-center justify-center">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            max="1"
                            step="0.01"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => finishEditingPreset()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') finishEditingPreset();
                              if (e.key === 'Escape') cancelEditingPreset();
                            }}
                            autoFocus
                            className="w-full px-1 py-1 rounded border border-k3s-primary bg-k3s-dark text-white font-semibold text-center text-[10px] focus:outline-none"
                          />
                        ) : (
                          <button
                            onClick={() => setAxisPower(a.key, lvl.value)}
                            onDoubleClick={() => startEditingPreset(a.key, idx)}
                            title="Click to apply preset, double-click to edit"
                            className={[
                              'w-full flex-1 rounded font-semibold transition-all relative overflow-hidden border-2 flex flex-col items-center justify-center py-2 px-0.5 text-xs min-h-12 cursor-pointer',
                              active
                                ? 'bg-k3s-primary/20 border-k3s-primary text-k3s-primary shadow-md shadow-k3s-primary/20'
                                : 'bg-k3s-block border-k3s-border/40 text-k3s-muted hover:text-white hover:border-k3s-primary/40 hover:shadow-md',
                            ].join(' ')}
                          >
                            <span className="font-bold text-xs">{lvl.label}</span>
                            <span className="text-xs text-k3s-muted">{lvl.value.toFixed(2)}</span>
                            {active && <StatusIndicator active size="sm" showText={false} className="absolute top-1 right-1" />}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

      </aside>
    </div>
  );
};