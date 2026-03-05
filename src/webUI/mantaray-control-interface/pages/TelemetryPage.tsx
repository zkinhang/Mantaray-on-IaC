import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity } from 'lucide-react';

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
  const [globalLimit, setGlobalLimit] = useState<number | null>(null);
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

      // Subscribe to a global power limit topic if present
      try {
        const globalTopic = new window.ROSLIB.Topic({
          ros,
          name: '/power_limit',
          messageType: 'std_msgs/Float32'
        });

        globalTopic.subscribe((msg: { data: number }) => {
          const v = Number(msg?.data ?? 0);
          setGlobalLimit(v);
          // initialize axis limits to global if they are unset or null
          setAxisLimits((prev) => {
            const next = { ...prev } as Record<AxisKey, number>;
            AXES.forEach((a) => {
              if (next[a.key] === undefined || next[a.key] === null) next[a.key] = v;
            });
            return next;
          });
        });

        subsRef.current.push(globalTopic);
      } catch (err) {
        console.warn('[TelemetryPage] Failed subscribe /power_limit', err);
      }
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

  const setAllFromGlobal = () => {
    if (globalLimit == null) return;
    const next = { ...axisLimits };
    AXES.forEach((a) => (next[a.key] = globalLimit));
    setAxisLimits(next);
  };

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="lg:col-span-8">
        <div className="h-full flex items-center justify-center border-2 border-dashed border-k3s-border rounded-lg bg-k3s-block">
          <div className="text-center">
            <div className="w-16 h-16 bg-k3s-dark rounded-full flex items-center justify-center mx-auto mb-4 border border-k3s-primary/50 text-k3s-primary">
              <Activity size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-white">Telemetry View</h2>
            <p className="text-k3s-muted italic">Advanced telemetry metrics coming soon...</p>
          </div>
        </div>
      </div>

      <aside className="lg:col-span-4 space-y-4">
        <div className="bg-k3s-block border border-k3s-border rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-white">Global Power Limit</h3>
            <div className="text-xs text-k3s-muted">{globalLimit == null ? '—' : globalLimit.toFixed(2)}</div>
          </div>
          <div className="flex gap-2">
            <button
              className="flex-1 py-2 rounded bg-k3s-primary text-white text-sm"
              onClick={() => setAllFromGlobal()}
            >
              Apply Global To All
            </button>
            <button
              className="py-2 px-3 rounded bg-k3s-block border border-k3s-border text-k3s-muted text-sm"
              onClick={() => console.info('Open advanced...')}
            >
              Advanced
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