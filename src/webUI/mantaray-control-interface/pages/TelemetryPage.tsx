import React, { useState, useEffect } from 'react';
import { rosService } from '../services/rosService';

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

const POWER_LEVELS: { label: string; value: number }[] = [
  { label: 'LOW',  value: 0.3 },
  { label: 'MED',  value: 0.5 },
  { label: 'HIGH', value: 0.7 },
  { label: 'MAX',  value: 1.0 },
];

const AXES: { key: AxisKey; label: string }[] = [
  { key: 'forward',   label: 'Forward' },
  { key: 'rightward', label: 'Rightward' },
  { key: 'upward',    label: 'Upward' },
  { key: 'roll',      label: 'Roll' },
  { key: 'pitch',     label: 'Pitch' },
  { key: 'yaw',       label: 'Yaw' },
];

export const TelemetryPage: React.FC = () => {
  const [powerLimit, setPowerLimit] = useState<PowerLimitMsg>({
    forward: 0.5,
    rightward: 0.5,
    upward: 0.5,
    roll: 0.5,
    pitch: 0.5,
    yaw: 0.5,
  });

  const [globalLevel, setGlobalLevel] = useState<number>(0.5);

  // Subscribe to power limit updates from ROS channel
  useEffect(() => {
    const unsubscribe = rosService.subscribePowerLimit((receivedPowerLimit) => {
      console.log('[TelemetryPage] Received power limit update:', receivedPowerLimit);
      setPowerLimit(receivedPowerLimit);
      // Update global level to match the first axis (or average if you prefer)
      setGlobalLevel(receivedPowerLimit.forward);
    });

    return unsubscribe;
  }, []);

  const publishPowerLimit = (msg: PowerLimitMsg) => {
    rosService.publishPowerLimit(msg);
  };

  const setAxisPower = (axis: AxisKey, value: number) => {
    setPowerLimit((prev) => {
      const updated: PowerLimitMsg = { ...prev, [axis]: value };
      publishPowerLimit(updated);
      console.info(`[TelemetryPage] ${axis} → ${value}`);
      return updated;
    });
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
    publishPowerLimit(updated);
    console.info(`[TelemetryPage] global → ${value}`);
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
            <span className="font-mono text-3xl font-bold text-k3s-primary">{globalLevel.toFixed(2)}</span>
            <span className="text-xs text-k3s-muted">/ 1.0</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-k3s-border overflow-hidden">
            <div
              className="h-full rounded-full bg-k3s-primary transition-all duration-300 shadow-lg shadow-k3s-primary/50"
              style={{ width: `${globalLevel * 100}%` }}
            />
          </div>

          {/* Power Buttons - 4 in a row */}
          <div className="flex gap-3">
            {POWER_LEVELS.map((lvl) => {
              const active = Math.abs(globalLevel - lvl.value) < 0.001;
              return (
                <button
                  key={lvl.label}
                  onClick={() => applyGlobalLimit(lvl.value)}
                  className={[
                    'flex-1 flex flex-col items-center justify-center rounded font-semibold transition-all relative overflow-hidden py-3 px-2 border-2 min-h-16',
                    active
                      ? 'bg-k3s-primary/20 border-k3s-primary text-k3s-primary shadow-lg shadow-k3s-primary/20'
                      : 'bg-k3s-block border-k3s-border/50 text-k3s-muted hover:text-white hover:border-k3s-primary/50 hover:shadow-lg',
                  ].join(' ')}
                >
                  <span className="text-base font-bold">{lvl.label}</span>
                  <span className="text-xs text-k3s-muted mt-0.5">{lvl.value.toFixed(1)}</span>
                  {active && <StatusIndicator active size="sm" showText={false} className="absolute top-2 right-2" />}
                </button>
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
                  {POWER_LEVELS.map((lvl) => {
                    const active = Math.abs(powerLimit[a.key] - lvl.value) < 0.001;
                    return (
                      <button
                        key={lvl.label}
                        onClick={() => setAxisPower(a.key, lvl.value)}
                        className={[
                          'flex-1 rounded font-semibold transition-all relative overflow-hidden border-2 flex flex-col items-center justify-center py-2 px-0.5 text-xs min-h-12',
                          active
                            ? 'bg-k3s-primary/20 border-k3s-primary text-k3s-primary shadow-md shadow-k3s-primary/20'
                            : 'bg-k3s-block border-k3s-border/40 text-k3s-muted hover:text-white hover:border-k3s-primary/40 hover:shadow-md',
                        ].join(' ')}
                      >
                        <span className="font-bold text-xs">{lvl.label}</span>
                        <span className="text-xs text-k3s-muted">{lvl.value.toFixed(1)}</span>
                        {active && <StatusIndicator active size="sm" showText={false} className="absolute top-1 right-1" />}
                      </button>
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