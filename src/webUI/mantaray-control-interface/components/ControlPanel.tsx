import React, { memo } from 'react';
import { Activity, Power, ShieldAlert } from 'lucide-react';
import { useRosApp, useRosTelemetry } from '../context/RosContext';

interface PowerLimitMsg {
  forward: number;
  rightward: number;
  upward: number;
  roll: number;
  pitch: number;
  yaw: number;
}

type AxisKey = keyof PowerLimitMsg;

const AXES: { key: AxisKey; label: string }[] = [
  { key: 'forward', label: 'Forward' },
  { key: 'rightward', label: 'Rightward' },
  { key: 'upward', label: 'Upward' },
  { key: 'roll', label: 'Roll' },
  { key: 'pitch', label: 'Pitch' },
  { key: 'yaw', label: 'Yaw' },
];

export const ControlPanel: React.FC = memo(() => {
  const { pidOn, togglePid, addLog, powerLimit, setPowerLimit, powerPresets, calibrateDepthBaseline, isConnected } = useRosApp();
  const { eulerAngles, depthRaw, depthCalculatedCm } = useRosTelemetry();
  const [selectedAxis, setSelectedAxis] = React.useState<AxisKey>('forward');
  const yawZeroRef = React.useRef<number | null>(null);
  const prevYawRef = React.useRef<number | null>(null);

  const selectAxis = (axis: AxisKey) => {
    setSelectedAxis(axis);
    const label = AXES.find((a) => a.key === axis)?.label ?? axis;
    addLog('info', `Pilot axis selected: ${label}`);
  };

  // Check if we have valid telemetry data (not just connection)
  const hasValidTelemetry = isConnected && (
    Math.abs(eulerAngles.roll) > 0.01 || 
    Math.abs(eulerAngles.pitch) > 0.01 || 
    Math.abs(eulerAngles.yaw) > 0.01 || 
    depthRaw > 0.1
  );

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
  const formatAngle = (value: number) => `${value.toFixed(2)}°`;

  React.useEffect(() => {
    if (!isConnected) {
      yawZeroRef.current = null;
      prevYawRef.current = null;
      return;
    }

    // Calibrate once per connection: first stable yaw sample becomes North (0 deg).
    if (yawZeroRef.current === null) {
      const currentYaw = eulerAngles.yaw;
      if (prevYawRef.current === null) {
        prevYawRef.current = currentYaw;
        return;
      }

      if (Math.abs(currentYaw - prevYawRef.current) > 0.0001 || Math.abs(currentYaw) > 0.0001) {
        yawZeroRef.current = currentYaw;
      }

      prevYawRef.current = currentYaw;
    }
  }, [isConnected, eulerAngles.yaw]);

  const yawBaseline = yawZeroRef.current ?? 0;
  const calibratedYaw = eulerAngles.yaw - yawBaseline;
  const normalizeYawDegrees = (value: number) => {
    const wrapped = ((value % 360) + 360) % 360;
    return wrapped;
  };
  const yawDegrees = normalizeYawDegrees(calibratedYaw);
  const yawRadians = (yawDegrees * Math.PI) / 180;
  const yawBallX = 50 + Math.cos(yawRadians - Math.PI / 2) * 30;
  const yawBallY = 50 + Math.sin(yawRadians - Math.PI / 2) * 30;
  const clampAngle = (value: number, limit = 45) => Math.max(-limit, Math.min(limit, value));
  const rollForViz = clampAngle(eulerAngles.roll);
  const pitchForViz = clampAngle(eulerAngles.pitch);
  const tiltScale = 0.55;
  const rollArrowX = 50 + rollForViz * tiltScale;
  const pitchArrowY = 50 - pitchForViz * tiltScale;

  return (
    <div className="bg-k3s-block border-2 border-k3s-border p-4 flex flex-col h-full shadow-2xl min-h-0 overflow-hidden">
      <div className="flex items-center space-x-3 mb-4 pb-2 border-b-2 border-k3s-border flex-none">
        <Activity className="w-5 h-5 text-k3s-primary" />
        <h2 className="text-lg font-bold text-white tracking-tight uppercase">Mission Control</h2>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
        {/* Euler Angles */}
        <div className="space-y-3 pb-4">
          <div className="flex items-center justify-between gap-2 text-sm font-bold text-k3s-primary uppercase tracking-wider border-b border-k3s-border pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span>System Euler Angles</span>
            </div>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 border ${hasValidTelemetry ? 'text-green-300 border-green-500/60' : 'text-red-300 border-red-500/60'}`}>
              {hasValidTelemetry ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>

          <div className="bg-k3s-dark border border-k3s-border rounded px-3 py-3">
            <div className="text-[10px] text-k3s-muted uppercase tracking-wider mb-2">Euler Attitude</div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-center">
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded border border-k3s-border bg-k3s-block/40 px-2 py-1.5">
                  <span className="text-[11px] text-k3s-muted uppercase">Roll</span>
                  <span className="font-mono text-sm text-orange-300">{formatAngle(eulerAngles.roll)}</span>
                </div>
                <div className="flex items-center justify-between rounded border border-k3s-border bg-k3s-block/40 px-2 py-1.5">
                  <span className="text-[11px] text-k3s-muted uppercase">Pitch</span>
                  <span className="font-mono text-sm text-cyan-300">{formatAngle(eulerAngles.pitch)}</span>
                </div>
                <div className="flex items-center justify-between rounded border border-k3s-border bg-k3s-block/40 px-2 py-1.5">
                  <span className="text-[11px] text-k3s-muted uppercase">Yaw</span>
                  <span className="font-mono text-sm text-k3s-primary">{yawDegrees.toFixed(1)}°</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-k3s-muted">
                  <div>
                    Zero: <span className="font-mono">{formatAngle(yawBaseline)}</span>
                  </div>
                  <button
                    onClick={() => {
                      yawZeroRef.current = eulerAngles.yaw;
                      addLog('info', `Yaw zero calibrated to ${formatAngle(eulerAngles.yaw)}`);
                    }}
                    disabled={!hasValidTelemetry}
                    className={`uppercase tracking-wider ${
                      hasValidTelemetry ? 'text-k3s-primary hover:underline' : 'opacity-60 cursor-not-allowed'
                    }`}
                    title="Set current yaw as North (0°)"
                  >
                    set zero
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-44 h-44 md:w-52 md:h-52">
                  <circle cx="50" cy="50" r="34" className="fill-transparent stroke-k3s-border" strokeWidth="2" />
                  <circle cx="50" cy="50" r="26" className="fill-transparent stroke-k3s-border" strokeWidth="1.6" strokeDasharray="3 2" />
                  <circle cx="50" cy="16" r="2" className="fill-k3s-muted" />
                  <line x1="50" y1="50" x2={yawBallX} y2={yawBallY} className="stroke-k3s-primary" strokeWidth="1.5" />
                  <circle cx={yawBallX} cy={yawBallY} r="5" className="fill-k3s-primary" />

                  <line x1="34" y1="50" x2="66" y2="50" className="stroke-k3s-muted" strokeWidth="0.7" />
                  <line x1="50" y1="34" x2="50" y2="66" className="stroke-k3s-muted" strokeWidth="0.7" />

                  <line x1="50" y1="50" x2={rollArrowX} y2="50" className="stroke-orange-200" strokeWidth="3.2" />
                  {rollArrowX >= 50 ? (
                    <polygon
                      points={`${rollArrowX},50 ${rollArrowX - 5},46.5 ${rollArrowX - 5},53.5`}
                      className="fill-orange-200"
                    />
                  ) : (
                    <polygon
                      points={`${rollArrowX},50 ${rollArrowX + 5},46.5 ${rollArrowX + 5},53.5`}
                      className="fill-orange-200"
                    />
                  )}

                  <line x1="50" y1="50" x2="50" y2={pitchArrowY} className="stroke-cyan-200" strokeWidth="3.2" />
                  {pitchArrowY <= 50 ? (
                    <polygon
                      points={`50,${pitchArrowY} 46.5,${pitchArrowY + 5} 53.5,${pitchArrowY + 5}`}
                      className="fill-cyan-200"
                    />
                  ) : (
                    <polygon
                      points={`50,${pitchArrowY} 46.5,${pitchArrowY - 5} 53.5,${pitchArrowY - 5}`}
                      className="fill-cyan-200"
                    />
                  )}
                </svg>
              </div>
            </div>

            <div className="mt-1.5 flex items-center justify-between rounded border border-k3s-border bg-k3s-block/40 px-2 py-1.5">
              <span className="text-[11px] text-k3s-muted uppercase tracking-wider">Depth (cm)</span>
              <span className="font-mono text-sm text-k3s-primary font-bold">{depthCalculatedCm.toFixed(2)}</span>
            </div>

            <div className="mt-1 flex items-center justify-between text-[9px] text-k3s-muted">
              <span className="font-mono">Raw={depthRaw.toFixed(2)}</span>
              <button
                onClick={calibrateDepthBaseline}
                disabled={!hasValidTelemetry}
                className={`uppercase tracking-wider ${
                  hasValidTelemetry ? 'text-k3s-primary hover:underline' : 'opacity-60 cursor-not-allowed'
                }`}
                title="Set current depth sample as surface baseline"
              >
                set zero
              </button>
            </div>
          </div>
        </div>

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
              {powerPresets[selectedAxis].map((lvl) => {
                const active = Math.abs(powerLimit[selectedAxis] - lvl.value) < 0.001;
                return (
                  <button
                    key={`${selectedAxis}-${lvl.label}`}
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
