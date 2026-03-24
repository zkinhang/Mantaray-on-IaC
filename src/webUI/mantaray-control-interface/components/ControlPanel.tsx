import React, { memo } from 'react';
import { Activity, Power, ShieldAlert } from 'lucide-react';
import { MovementControl } from './MovementControl';
import { useRos } from '../context/RosContext';
import { rosService } from '../services/rosService';
import type { PinnedPowerLimit, PowerAxisKey } from '../types';

const POWER_LEVELS: { label: string; value: number }[] = [
  { label: 'LOW', value: 0.3 },
  { label: 'MED', value: 0.5 },
  { label: 'HIGH', value: 0.7 },
  { label: 'MAX', value: 1.0 },
];

const AXIS_ORDER: PowerAxisKey[] = ['forward', 'backward', 'vertical', 'yaw', 'lateral', 'view'];
const AXIS_META: { key: PowerAxisKey; label: string }[] = [
  { key: 'forward', label: 'Forward' },
  { key: 'backward', label: 'Backward' },
  { key: 'vertical', label: 'Up / Down' },
  { key: 'yaw', label: 'Yaw' },
  { key: 'lateral', label: 'Lateral' },
  { key: 'view', label: 'Top / Bot Camera' },
];

export const ControlPanel: React.FC = memo(() => {
  const { pidOn, togglePid, pinnedLimits, setPinnedLimit, addLog } = useRos();
  const [selectedPilotAxis, setSelectedPilotAxis] = React.useState<PowerAxisKey>('forward');
  const [axisLevels, setAxisLevels] = React.useState<Record<PowerAxisKey, number>>({
    forward: 0.5,
    backward: 0.5,
    vertical: 0.5,
    yaw: 0.5,
    lateral: 0.5,
    view: 0.5,
  });

  const pinnedEntries = Object.entries(pinnedLimits)
    .filter((entry): entry is [PowerAxisKey, PinnedPowerLimit] => Boolean(entry[1]))
    .sort((a, b) => AXIS_ORDER.indexOf(a[0]) - AXIS_ORDER.indexOf(b[0]));
  const activeEntry = pinnedEntries[0] ?? null;

  const setPinnedAxisLevel = (axis: PowerAxisKey, pin: PinnedPowerLimit, value: number) => {
    const nextLevel = POWER_LEVELS.find((item) => Math.abs(item.value - value) < 0.001)?.label ?? 'CUSTOM';
    rosService.publishAxisPowerLimit(axis, value);
    setPinnedLimit(axis, {
      ...pin,
      levelLabel: nextLevel,
      value,
    });
  };

  const setSelectedAxisPreset = (value: number) => {
    const levelLabel = POWER_LEVELS.find((item) => Math.abs(item.value - value) < 0.001)?.label ?? 'CUSTOM';
    const axisLabel = AXIS_META.find((item) => item.key === selectedPilotAxis)?.label ?? selectedPilotAxis;

    setAxisLevels((prev) => ({
      ...prev,
      [selectedPilotAxis]: value,
    }));

    rosService.publishAxisPowerLimit(selectedPilotAxis, value);
    setPinnedLimit(selectedPilotAxis, {
      axisLabel,
      levelLabel,
      value,
    });

    addLog('info', `Pilot ${axisLabel} preset set to ${value.toFixed(1)}`);
  };

  const selectPilotAxis = (axis: PowerAxisKey) => {
    setSelectedPilotAxis(axis);
    const axisLabel = AXIS_META.find((item) => item.key === axis)?.label ?? axis;
    addLog('info', `Pilot axis selected: ${axisLabel}`);
  };

  const selectedAxisLabel = AXIS_META.find((item) => item.key === selectedPilotAxis)?.label ?? selectedPilotAxis;

  return (
    <div className="bg-k3s-block border-2 border-k3s-border p-4 flex flex-col h-full shadow-2xl min-h-0 overflow-hidden">
      <div className="flex items-center space-x-3 mb-4 pb-2 border-b-2 border-k3s-border flex-none">
        <Activity className="w-5 h-5 text-k3s-primary" />
        <h2 className="text-lg font-bold text-white tracking-tight uppercase">Mission Control</h2>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
        {/* Movement Module */}
        <MovementControl />

        {/* Pilot Power Axes (6 axes with equal priority) */}
        <div className="space-y-3 pb-4">
          <div className="flex items-center gap-2 text-sm font-bold text-k3s-primary uppercase tracking-wider border-b border-k3s-border pb-2">
            <Activity className="w-4 h-4" />
            <span>Pilot Power Axes</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {AXIS_META.map((axis) => (
              <button
                key={axis.key}
                onClick={() => selectPilotAxis(axis.key)}
                className={[
                  'py-2 px-2 rounded border text-[10px] font-bold uppercase tracking-wider transition-all',
                  selectedPilotAxis === axis.key
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
              <span className="text-xs font-mono text-orange-200">{axisLevels[selectedPilotAxis].toFixed(2)} / 1.0</span>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1">
              {POWER_LEVELS.map((lvl) => {
                const active = Math.abs(axisLevels[selectedPilotAxis] - lvl.value) < 0.001;
                return (
                  <button
                    key={`${selectedPilotAxis}-${lvl.value}`}
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
              <span className="text-xs">{pidOn ? 'PID ENABLED' : 'PID DISABLED'}</span>
            </button>
          </div>
        </div>

        {/* Pilot Follow Axis (Auto-follow latest telemetry axis) */}
        <div className="space-y-2 pb-4">
          <div className="flex items-center gap-2 text-sm font-bold text-k3s-primary uppercase tracking-wider border-b border-k3s-border pb-2">
            <Activity className="w-4 h-4" />
            <span>Causality Guiding Axis</span>
          </div>
          {!activeEntry ? (
            <p className="text-xs text-k3s-muted italic">
              No recent axis update yet — adjust any axis in Telemetry, Pilot will auto-follow it.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {(() => {
                const [axis, pin] = activeEntry;
                return (
                  <div
                    key={axis}
                    className="bg-k3s-dark border border-k3s-border rounded px-2 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white font-semibold">{pin.axisLabel}</span>
                        <span className="text-[10px] text-k3s-primary font-bold">{pin.levelLabel}</span>
                        <span className="text-[10px] text-k3s-muted font-mono">{pin.value.toFixed(2)}</span>
                      </div>
                      <span className="text-[10px] text-k3s-muted uppercase tracking-wide">Auto-follow</span>
                    </div>

                    <div className="mt-2 flex gap-1">
                      {POWER_LEVELS.map((lvl) => {
                        const active = Math.abs(pin.value - lvl.value) < 0.001;
                        return (
                          <button
                            key={`${axis}-${lvl.value}`}
                            onClick={() => setPinnedAxisLevel(axis, pin, lvl.value)}
                            className={[
                              'flex-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-colors',
                              active
                                ? 'bg-k3s-primary text-white border-k3s-primary'
                                : 'bg-k3s-block border-k3s-border text-k3s-muted hover:text-white hover:border-k3s-primary',
                            ].join(' ')}
                          >
                            {lvl.value.toFixed(1)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
