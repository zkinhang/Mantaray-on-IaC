import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

declare global {
  interface Window {
    ROSLIB: any;
  }
}

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

// Combined axis keys — upward/downward → vertical, yaw_left/yaw_right → yaw, leftward/rightward → lateral, top/bottom camera → view
type AxisKey = 'forward' | 'backward' | 'vertical' | 'yaw' | 'lateral' | 'view';

const POWER_LEVELS: { label: string; value: number }[] = [
  { label: 'LOW',  value: 0.3 },
  { label: 'MED',  value: 0.5 },
  { label: 'HIGH', value: 0.7 },
  { label: 'MAX',  value: 1.0 },
];

// Maps each combined key to the underlying ROS topic suffixes it controls
const AXIS_TOPICS: Record<AxisKey, string[]> = {
  forward:  ['forward'],
  backward: ['backward'],
  vertical: ['upward', 'downward'],
  yaw:      ['yaw_left', 'yaw_right'],
  lateral:  ['leftward', 'rightward'],
  view:     ['camera/top', 'camera/bottom'],
};

const AXES: { key: AxisKey; label: string }[] = [
  { key: 'forward',  label: 'Forward'         },
  { key: 'backward', label: 'Backward'         },
  { key: 'vertical', label: 'Up / Down'        },
  { key: 'yaw',      label: 'Yaw'              },
  { key: 'lateral',  label: 'Lateral'          },
  { key: 'view',     label: 'Top / Bot Camera' },
];

interface PowerButtonsProps {
  currentValue: number;
  onSelect: (v: number) => void;
  size?: 'sm' | 'md';
  showProgressBar?: boolean;
}

const PowerButtons: React.FC<PowerButtonsProps> = ({ currentValue, onSelect, size = 'md', showProgressBar = false }) => (
  <div className="flex flex-col gap-2">
    <div className="flex gap-1.5">
      {POWER_LEVELS.map((lvl) => {
        const active = Math.abs(currentValue - lvl.value) < 0.001;
        return (
          <button
            key={lvl.label}
            onClick={() => onSelect(lvl.value)}
            className={[
              'flex-1 rounded font-semibold transition-all relative overflow-hidden border-2',
              size === 'sm' ? 'px-1 py-0.5 text-xs' : 'px-2 py-1 text-sm',
              active
                ? 'bg-k3s-primary/20 border-k3s-primary text-k3s-primary shadow-lg shadow-k3s-primary/20'
                : 'bg-k3s-block border-transparent text-k3s-muted hover:text-white hover:shadow-lg',
            ].join(' ')}
          >
            <span>{lvl.label}</span>
            {size === 'md' && <span className="block text-xs text-k3s-muted">{lvl.value.toFixed(1)}</span>}
            {active && <StatusIndicator active size="sm" showText={false} className="absolute top-1 right-1" />}
          </button>
        );
      })}
    </div>
    {showProgressBar && (
      <div className="w-full h-1.5 rounded-full bg-k3s-border overflow-hidden">
        <div
          className="h-full rounded-full bg-k3s-primary transition-all duration-300"
          style={{ width: `${currentValue * 100}%` }}
        />
      </div>
    )}
  </div>
);

export const TelemetryPage: React.FC = () => {
  const [globalLevel, setGlobalLevel] = useState<number>(0.5);
  const [axisLimits, setAxisLimits] = useState<Record<AxisKey, number>>(() => {
    const init = {} as Record<AxisKey, number>;
    AXES.forEach((a) => (init[a.key] = 0.5));
    return init;
  });
  const rosRef = useRef<any | null>(null);

  const targetHost = useMemo(() => {
    return (
      localStorage.getItem('ros_target_host') ||
      (window.location.hostname.includes('mantaray') || window.location.hostname.includes('rov')
        ? window.location.hostname
        : 'localhost')
    );
  }, []);

  useEffect(() => {
    if (!window.ROSLIB) return;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ros = new window.ROSLIB.Ros({ url: `${protocol}://${targetHost}:9090` });
    rosRef.current = ros;
    ros.on?.('connection', () => console.info('[TelemetryPage] ROS connected'));
    ros.on?.('error',      (e: any) => console.warn('[TelemetryPage] ROS error', e));
    ros.on?.('close',      () => console.info('[TelemetryPage] ROS closed'));
    return () => {
      try { ros.close?.(); } catch {}
      rosRef.current = null;
    };
  }, [targetHost]);

  const publishFloat = (suffix: string, value: number) => {
    const ros = rosRef.current;
    if (!ros || !window.ROSLIB) return;
    try {
      const topic = new window.ROSLIB.Topic({ ros, name: `/power_limit/${suffix}`, messageType: 'std_msgs/Float32' });
      topic.publish(new window.ROSLIB.Message({ data: Number(value) }));
    } catch (err) {
      console.warn('[TelemetryPage] publishFloat failed', suffix, err);
    }
  };

  const setAxisPower = (axis: AxisKey, value: number) => {
    setAxisLimits((prev) => ({ ...prev, [axis]: value }));
    AXIS_TOPICS[axis].forEach((suffix) => publishFloat(suffix, value));
    console.info(`[TelemetryPage] ${axis} → ${value}`);
  };

  const applyGlobalLimit = (value: number) => {
    setGlobalLevel(value);
    const next = {} as Record<AxisKey, number>;
    AXES.forEach((a) => { next[a.key] = value; });
    setAxisLimits(next);
    AXES.forEach((a) => AXIS_TOPICS[a.key].forEach((suffix) => publishFloat(suffix, value)));
    console.info(`[TelemetryPage] global → ${value}`);
  };

  return (
    <div className="h-full bg-k3s-bg">
      <aside className="space-y-4 h-full p-4">

        {/* ── Global Power Limit Section ── */}
        <div className="bg-k3s-block border-2 border-k3s-border p-4 space-y-3 shadow-2xl">
          <div className="flex items-center space-x-2 pb-2 border-b-2 border-k3s-border">
            <div className="w-3 h-3 rounded-full bg-k3s-primary animate-pulse" />
            <div className="text-sm font-bold text-k3s-primary tracking-wide uppercase">Global Power Limit</div>
          </div>

          {/* Current Value Display */}
          <div className="flex items-baseline gap-2 bg-k3s-border/20 rounded px-3 py-2">
            <span className="font-mono text-3xl font-bold text-white">{globalLevel.toFixed(2)}</span>
            <span className="text-xs text-k3s-muted">/ 1.0</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-k3s-border overflow-hidden">
            <div
              className="h-full rounded-full bg-k3s-primary transition-all duration-300 shadow-lg shadow-k3s-primary/50"
              style={{ width: `${globalLevel * 100}%` }}
            />
          </div>

          {/* Power Buttons */}
          <div className="flex gap-1.5">
            {POWER_LEVELS.map((lvl) => {
              const active = Math.abs(globalLevel - lvl.value) < 0.001;
              return (
                <button
                  key={lvl.label}
                  onClick={() => applyGlobalLimit(lvl.value)}
                  className={[
                    'flex-1 flex flex-col items-center rounded font-semibold transition-all relative overflow-hidden py-2 px-1 border-2',
                    active
                      ? 'bg-k3s-primary/20 border-k3s-primary text-k3s-primary shadow-lg shadow-k3s-primary/20'
                      : 'bg-k3s-block border-transparent text-k3s-muted hover:text-white hover:shadow-lg',
                  ].join(' ')}
                >
                  <span className="text-xs font-bold">{lvl.label}</span>
                  <span className="text-xs text-k3s-muted">{lvl.value.toFixed(1)}</span>
                  {active && <StatusIndicator active size="sm" showText={false} className="absolute top-1 right-1" />}
                </button>
              );
            })}
          </div>

        </div>

        {/* ── Per-Axis Power Limits ── */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-k3s-primary tracking-wide uppercase px-1 border-b border-k3s-border pb-2">
            <div className="w-2 h-2 rounded-full bg-k3s-primary" />
            Individual Axis Controls
          </div>
          <div className="grid grid-cols-2 gap-3">
            {AXES.map((a) => (
              <div key={a.key} className="bg-k3s-block border-2 border-k3s-border p-3 space-y-2 shadow-lg transition-all hover:border-k3s-primary/40">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-white tracking-tight uppercase">{a.label}</div>
                  <span className="font-mono text-lg font-bold text-k3s-primary">{axisLimits[a.key].toFixed(2)}</span>
                </div>
                
                {/* Small Progress Bar */}
                <div className="w-full h-1.5 rounded-full bg-k3s-border overflow-hidden">
                  <div
                    className="h-full rounded-full bg-k3s-primary transition-all duration-300"
                    style={{ width: `${axisLimits[a.key] * 100}%` }}
                  />
                </div>

                <PowerButtons
                  currentValue={axisLimits[a.key]}
                  onSelect={(v) => setAxisPower(a.key, v)}
                  size="sm"
                  showProgressBar={false}
                />
              </div>
            ))}
          </div>
        </div>

      </aside>
    </div>
  );
};