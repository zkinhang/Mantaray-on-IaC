import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Pin } from 'lucide-react';
import { useRos } from '../context/RosContext';
import type { PowerAxisKey } from '../types';

declare global {
  interface Window {
    ROSLIB: any;
  }
}

// Combined axis keys — upward/downward → vertical, yaw_left/yaw_right → yaw, leftward/rightward → lateral, top/bottom camera → view
type AxisKey = PowerAxisKey;

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
}

const PowerButtons: React.FC<PowerButtonsProps> = ({ currentValue, onSelect, size = 'md' }) => (
  <div className="flex gap-1.5">
    {POWER_LEVELS.map((lvl) => {
      const active = Math.abs(currentValue - lvl.value) < 0.001;
      return (
        <button
          key={lvl.label}
          onClick={() => onSelect(lvl.value)}
          className={[
            'flex-1 rounded font-semibold transition-colors',
            size === 'sm' ? 'px-1 py-0.5 text-xs' : 'px-2 py-1 text-sm',
            active
              ? 'bg-k3s-primary text-white ring-1 ring-white'
              : 'bg-k3s-block border border-k3s-border text-k3s-muted hover:border-k3s-primary hover:text-white',
          ].join(' ')}
        >
          {lvl.label}
        </button>
      );
    })}
  </div>
);

export const TelemetryPage: React.FC = () => {
  const { pinnedLimits, setPinnedLimit } = useRos();
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
    <div className="h-full">
      <aside className="space-y-4 h-full">

        {/* ── Global Power Limit ── */}
        <div className="bg-k3s-block border-2 border-k3s-primary rounded p-4">
          <div className="text-sm font-bold text-k3s-primary mb-1 tracking-wide uppercase">
            Global Power Limit
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="font-mono text-3xl text-white">{globalLevel.toFixed(2)}</span>
            <span className="text-xs text-k3s-muted">/ 1.0 — applies to all axes</span>
          </div>
          <PowerButtons currentValue={globalLevel} onSelect={applyGlobalLimit} />
        </div>

        {/* ── Per-Axis Power Limits ── */}
        <div className="grid grid-cols-2 gap-3"> /* Good Thing(should use), but can be improved with dynamic column count based on screen width , by Louis*/
          {AXES.map((a) => {
            const pinned = pinnedLimits[a.key];
            const currentLevelLabel = POWER_LEVELS.find(
              (l) => Math.abs(axisLimits[a.key] - l.value) < 0.001
            )?.label ?? '—';
            return (
            <div key={a.key} className="bg-k3s-block border border-k3s-border rounded p-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-white">{a.label}</div>
                <button
                  title={pinned ? 'Unpin from Pilot Panel' : 'Pin to Pilot Panel'}
                  onClick={() =>
                    setPinnedLimit(
                      a.key,
                      pinned
                        ? null
                        : { axisLabel: a.label, levelLabel: currentLevelLabel, value: axisLimits[a.key] }
                    )
                  }
                  className={[
                    'p-0.5 rounded transition-colors',
                    pinned
                      ? 'text-k3s-primary'
                      : 'text-k3s-muted hover:text-white',
                  ].join(' ')}
                >
                  <Pin className="w-3 h-3" fill={pinned ? 'currentColor' : 'none'} />
                </button>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-2xl text-white">{axisLimits[a.key].toFixed(2)}</span>
                <span className="text-xs text-k3s-muted">/ 1.0</span>
              </div>
              <PowerButtons
                currentValue={axisLimits[a.key]}
                onSelect={(v) => {
                  setAxisPower(a.key, v);
                  // auto-update pin value if this axis is already pinned
                  if (pinned) {
                    const lbl = POWER_LEVELS.find((l) => Math.abs(v - l.value) < 0.001)?.label ?? '—';
                    setPinnedLimit(a.key, { axisLabel: a.label, levelLabel: lbl, value: v });
                  }
                }}
                size="sm"
              />
            </div>
          );
          })}
        </div>

      </aside>
    </div>
  );
};