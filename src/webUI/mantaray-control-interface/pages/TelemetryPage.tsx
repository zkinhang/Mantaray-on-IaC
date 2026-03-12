import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
declare global {
  interface Window {
    ROSLIB: any;
  }
}

type AxisKey =
  | 'forward'
  | 'backward'
  | 'upward'
  | 'downward'
  | 'yaw_left'
  | 'yaw_right'
  | 'leftward'
  | 'rightward';

const AXES: { key: AxisKey; label: string }[] = [
  { key: 'forward', label: 'Forward' },
  { key: 'backward', label: 'Backward' },
  { key: 'upward', label: 'Upward' },
  { key: 'downward', label: 'Downward' },
  { key: 'yaw_left', label: 'yaw (towards left)' },
  { key: 'yaw_right', label: 'yaw (toward right)' },
  { key: 'leftward', label: 'Directly leftward' },
  { key: 'rightward', label: 'Directly rightward' }
];

export const TelemetryPage: React.FC = () => {
  const [globalLimit, setGlobalLimit] = useState<number>(0.5);
  const [axisLimits, setAxisLimits] = useState<Record<AxisKey, number>>(() => {
    const initial = {} as Record<AxisKey, number>;
    AXES.forEach((a) => (initial[a.key] = 0.5));
    return initial;
  });

  const rosRef = useRef<any | null>(null);
  const subsRef = useRef<any[]>([]);

  const targetHost = useMemo(() => {
    return (
      localStorage.getItem('ros_target_host') ||
      (window.location.hostname.includes('mantaray') || window.location.hostname.includes('rov')
        ? window.location.hostname
        : 'localhost')
    );
  }, []);

  useEffect(() => {
    // Connect to ROS bridge locally inside this page only.
    if (!window.ROSLIB) return;

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${protocol}://${targetHost}:9090`;

    const ros = new window.ROSLIB.Ros({ url });
    rosRef.current = ros;

    ros.on && ros.on('connection', () => {
      console.info('[TelemetryPage] ROS connected', url);
    });

    ros.on && ros.on('error', (e: any) => console.warn('[TelemetryPage] ROS error', e));
    ros.on && ros.on('close', () => console.info('[TelemetryPage] ROS closed'));

    return () => {
      // unsubscribe and close connection
      subsRef.current.forEach((t) => {
        try {
          t.unsubscribe && t.unsubscribe();
        } catch (e) {}
      });
      subsRef.current = [];
      try {
        ros.close && ros.close();
      } catch (e) {}
      rosRef.current = null;
    };
  }, [targetHost]);

  const publishAxis = (axis: AxisKey, value: number) => {
    // Publish to per-axis topic: /power_limit/<axis>
    const ros = rosRef.current;
    if (!ros || !window.ROSLIB) {
      // still update UI
      setAxisLimits((prev) => ({ ...prev, [axis]: value }));
      console.log('[TelemetryPage] ROS not ready, updated local only', axis, value);
      return;
    }

    try {
      const topicName = `/power_limit/${axis}`;
      const topic = new window.ROSLIB.Topic({ ros, name: topicName, messageType: 'std_msgs/Float32' });
      const message = new window.ROSLIB.Message({ data: Number(value) });
      topic.publish(message);
      // update UI state
      setAxisLimits((prev) => ({ ...prev, [axis]: value }));
      console.info(`[TelemetryPage] Published ${topicName}=${value}`);
    } catch (err) {
      console.warn('[TelemetryPage] publishAxis failed', err);
    }
  };

  const applyGlobalLimit = () => {
    const next = {} as Record<AxisKey, number>;
    AXES.forEach((a) => (next[a.key] = globalLimit));
    setAxisLimits(next);
    AXES.forEach((a) => publishAxis(a.key, globalLimit));
  };

  return (
    <div className="h-full">
      <aside className="space-y-4 h-full">

        {/* Global Power Limit — 25% larger than axis cards (h-35 vs h-28, text-3xl vs text-2xl) */}
        <div className="bg-k3s-block border-2 border-k3s-primary rounded p-4 flex flex-col justify-between h-[8.75rem]">
          <div>
            <div className="text-sm font-bold text-k3s-primary mb-1 tracking-wide uppercase">Global Power Limit</div>
            <div className="flex items-baseline gap-2">
              <div className="font-mono text-3xl text-white">{globalLimit.toFixed(2)}</div>
              <div className="text-xs text-k3s-muted">/ 1.0 — applies to all axes</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={globalLimit}
              onChange={(e) => setGlobalLimit(Number(e.target.value))}
              className="flex-1"
            />
            <button
              onClick={applyGlobalLimit}
              className="ml-2 px-3 py-1.5 rounded bg-k3s-primary text-white text-sm font-semibold"
            >
              Set All
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {AXES.map((a) => (
            <div key={a.key} className="bg-k3s-block border border-k3s-border rounded p-3 flex flex-col justify-between h-28">
              <div>
                <div className="text-xs font-semibold text-white mb-1">{a.label}</div>
                <div className="flex items-baseline gap-2">
                  <div className="font-mono text-2xl text-white">{axisLimits[a.key].toFixed(2)}</div>
                  <div className="text-xs text-k3s-muted">/ 1.0</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={axisLimits[a.key]}
                  onChange={(e) => setAxisLimits((prev) => ({ ...prev, [a.key]: Number(e.target.value) }))}
                  className="flex-1"
                />
                <button
                  onClick={() => publishAxis(a.key, axisLimits[a.key])}
                  className="ml-2 px-2 py-1 rounded bg-k3s-primary text-white text-xs"
                >
                  Set
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
};