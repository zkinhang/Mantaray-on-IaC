import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckSquare,
  Layers,
  PauseCircle,
  Rocket,
  Save,
  Send,
  Zap,
} from 'lucide-react';

interface ThrusterSlot {
  slotId: number;
  motorId: number;
  direction: 1 | -1;
  power: number;
  active: boolean;
  busy: boolean;
}

interface ThrusterPosition {
  id: number;
  x: string;
  y: string;
}

const POWER_PRESETS: number[] = [0.3, 0.5, 0.7, 1.0];

const THRUSTER_LAYOUT: ThrusterPosition[] = [
  { id: 1, x: '18%', y: '28%' },
  { id: 2, x: '34%', y: '20%' },
  { id: 3, x: '66%', y: '20%' },
  { id: 4, x: '82%', y: '28%' },
  { id: 5, x: '18%', y: '72%' },
  { id: 6, x: '34%', y: '80%' },
  { id: 7, x: '66%', y: '80%' },
  { id: 8, x: '82%', y: '72%' },
];

const createInitialSlots = (): ThrusterSlot[] => {
  return Array.from({ length: 8 }, (_, index) => {
    const id = index + 1;
    return {
      slotId: id,
      motorId: id,
      direction: 1,
      power: 0.5,
      active: false,
      busy: false,
    };
  });
};

const apiPost = async (url: string, payload: unknown): Promise<unknown> => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  const text = await res.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export const SyncMapConfiguratorPage: React.FC = () => {
  const [slots, setSlots] = useState<ThrusterSlot[]>(() => createInitialSlots());
  const [allStartPower, setAllStartPower] = useState<number>(0.5);
  const [isStartingAll, setIsStartingAll] = useState(false);
  const [isStoppingAll, setIsStoppingAll] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [swapFirstSlot, setSwapFirstSlot] = useState<number | null>(null);
  const [status, setStatus] = useState<string>('Ready');

  const mappingArray = useMemo(
    () => slots.map((slot) => slot.motorId * slot.direction),
    [slots]
  );

  const mappingPreview = useMemo(() => `[${mappingArray.join(', ')}]`, [mappingArray]);

  const updateSlot = (slotId: number, updater: (slot: ThrusterSlot) => ThrusterSlot) => {
    setSlots((prev) => prev.map((slot) => (slot.slotId === slotId ? updater(slot) : slot)));
  };

  const setSlotBusy = (slotId: number, busy: boolean) => {
    updateSlot(slotId, (slot) => ({ ...slot, busy }));
  };

  const handleToggleThruster = async (slotId: number) => {
    const current = slots.find((slot) => slot.slotId === slotId);
    if (!current || current.busy) {
      return;
    }

    setSlotBusy(slotId, true);
    try {
      if (current.active) {
        await apiPost('/api/stop', { thruster: slotId });
        updateSlot(slotId, (slot) => ({ ...slot, active: false }));
        setStatus(`Thruster ${slotId} stopped`);
      } else {
        await apiPost('/api/test', {
          thruster: slotId,
          power: current.power,
          mapping: mappingArray,
        });
        updateSlot(slotId, (slot) => ({ ...slot, active: true }));
        setStatus(`Thruster ${slotId} running @ power ${current.power.toFixed(2)}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setStatus(`Thruster ${slotId} command failed: ${message}`);
    } finally {
      setSlotBusy(slotId, false);
    }
  };

  const handleAllStart = async () => {
    setIsStartingAll(true);
    setStatus('Dispatching ALL START command...');
    try {
      await apiPost('/api/test', { thruster: 0, power: allStartPower, mapping: mappingArray });
      setSlots((prev) => prev.map((slot) => ({ ...slot, active: true })));
      setStatus(`ALL START sent: thruster=0, power=${allStartPower.toFixed(2)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setStatus(`ALL START failed: ${message}`);
    } finally {
      setIsStartingAll(false);
    }
  };

  const handleEStop = async () => {
    setIsStoppingAll(true);
    setStatus('Dispatching E-STOP...');
    try {
      await apiPost('/api/stop', { thruster: 0 });
      setSlots((prev) => prev.map((slot) => ({ ...slot, active: false, busy: false })));
      setStatus('E-STOP sent. All thrusters are stopped.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setStatus(`E-STOP failed: ${message}`);
    } finally {
      setIsStoppingAll(false);
    }
  };

  const handleSwapPick = (slotId: number) => {
    if (swapFirstSlot === null) {
      setSwapFirstSlot(slotId);
      setStatus(`Swap armed: select second thruster to swap with slot ${slotId}.`);
      return;
    }

    if (swapFirstSlot === slotId) {
      setSwapFirstSlot(null);
      setStatus('Swap canceled.');
      return;
    }

    setSlots((prev) => {
      const next = [...prev];
      const aIndex = next.findIndex((slot) => slot.slotId === swapFirstSlot);
      const bIndex = next.findIndex((slot) => slot.slotId === slotId);

      if (aIndex < 0 || bIndex < 0) {
        return prev;
      }

      const a = next[aIndex];
      const b = next[bIndex];

      next[aIndex] = {
        ...a,
        motorId: b.motorId,
        direction: b.direction,
        power: b.power,
      };

      next[bIndex] = {
        ...b,
        motorId: a.motorId,
        direction: a.direction,
        power: a.power,
      };

      return next;
    });

    setStatus(`Swapped slot ${swapFirstSlot} with slot ${slotId}.`);
    setSwapFirstSlot(null);
  };

  const handleSave = async () => {
    const accepted = window.confirm(
      `Save this mapping to backend?\n\nMapping Array: ${mappingPreview}\n\nThis will POST to /api/save.`
    );
    if (!accepted) {
      return;
    }

    setIsSaving(true);
    setStatus('Saving configuration...');
    try {
      await apiPost('/api/save', {
        mapping: mappingArray,
        mapping_string: mappingPreview,
        thrusters: slots.map((slot) => ({
          slot: slot.slotId,
          motor_id: slot.motorId,
          direction: slot.direction,
          power: slot.power,
        })),
      });
      setStatus(`Configuration saved successfully: ${mappingPreview}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setStatus(`Save failed: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar pr-1 relative">
      <div
        className="absolute inset-0 pointer-events-none opacity-45"
        style={{
          backgroundImage:
            "linear-gradient(rgba(8,12,20,0.75), rgba(8,12,20,0.75)), url('/mapping-config-bg.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_rgba(255,198,28,0.07),_transparent_58%)]" />

      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 relative z-10">
        <section className="bg-k3s-block border-2 border-k3s-primary rounded p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <Layers className="w-5 h-5 text-k3s-primary" />
            <h1 className="text-xl md:text-2xl font-black text-white uppercase tracking-wide">
              Causality: One-Veneration Configurator (Mapping)
            </h1>
          </div>
          <p className="text-sm text-k3s-muted leading-relaxed">
            Live control mode is enabled: visual thruster control, mapping editor, swap mode, global start/stop,
            and persistent save to backend APIs.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-2.5 py-1 border border-k3s-border rounded bg-k3s-dark/40">
            <CheckSquare className="w-4 h-4 text-k3s-primary" />
            <span className="text-xs text-k3s-muted uppercase tracking-wide">Runtime Configurator</span>
          </div>
        </section>

        <section className="bg-k3s-block border-2 border-k3s-primary rounded p-5 md:p-7">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-k3s-border bg-k3s-dark/40 mb-3">
              <Rocket className="w-4 h-4 text-k3s-primary" />
              <span className="text-xs text-k3s-muted uppercase tracking-widest">Fleet Controls</span>
            </div>
            <h2 className="text-lg md:text-xl font-black uppercase tracking-wide text-white">
              Full Fleet Launch and Emergency Stop
            </h2>
            <p className="mt-2 text-sm text-k3s-muted">
              All Start sends <span className="text-k3s-primary font-semibold">thruster=0</span>. E-Stop sends
              <span className="text-k3s-primary font-semibold"> /api/stop</span> and clears active states.
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {POWER_PRESETS.map((value) => (
                <button
                  key={value}
                  onClick={() => setAllStartPower(value)}
                  className={[
                    'px-3 py-1.5 text-sm font-semibold rounded border transition-colors',
                    Math.abs(allStartPower - value) < 0.001
                      ? 'bg-k3s-primary text-white border-k3s-primary'
                      : 'bg-k3s-dark text-k3s-muted border-k3s-border hover:text-white hover:border-k3s-primary',
                  ].join(' ')}
                >
                  P={value.toFixed(1)}
                </button>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                onClick={handleAllStart}
                disabled={isStartingAll || isStoppingAll}
                className="inline-flex items-center gap-2 px-8 py-3 rounded text-sm md:text-base font-black uppercase tracking-wider bg-k3s-primary text-white border-2 border-k3s-primary hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                <Rocket className="w-4 h-4" />
                {isStartingAll ? 'Launching...' : 'All Start'}
              </button>

              <button
                onClick={handleEStop}
                disabled={isStartingAll || isStoppingAll}
                className="inline-flex items-center gap-2 px-8 py-3 rounded text-sm md:text-base font-black uppercase tracking-wider bg-red-600 text-white border-2 border-red-500 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                <AlertTriangle className="w-4 h-4" />
                {isStoppingAll ? 'Stopping...' : 'Global E-Stop'}
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <article className="xl:col-span-5 bg-k3s-block border border-k3s-border rounded p-4 md:p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm md:text-base font-bold text-white uppercase tracking-wide">Robot View</h3>
              <span className="text-xs text-k3s-muted uppercase">Click to Test/Stop</span>
            </div>

            <div className="mt-4 relative mx-auto w-full max-w-[430px] aspect-[4/3] bg-k3s-dark border border-k3s-border rounded-lg overflow-hidden">
              <div className="absolute inset-[18%_20%] rounded-[45%] border-2 border-k3s-primary/70 bg-k3s-primary/10" />
              <div className="absolute inset-[42%_48%] rounded-full border border-k3s-primary/70 bg-k3s-primary/20" />

              {THRUSTER_LAYOUT.map((pos) => {
                const slot = slots.find((item) => item.slotId === pos.id);
                if (!slot) {
                  return null;
                }
                const isSwapTarget = swapFirstSlot === pos.id;

                return (
                  <button
                    key={pos.id}
                    onClick={() => handleToggleThruster(pos.id)}
                    className={[
                      'absolute -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-2 text-xs font-bold transition-all',
                      slot.active
                        ? 'bg-emerald-500/30 border-emerald-400 text-white shadow-[0_0_18px_rgba(16,185,129,0.45)] animate-pulse'
                        : 'bg-k3s-block border-k3s-border text-k3s-muted hover:text-white hover:border-k3s-primary',
                      slot.busy ? 'opacity-75 cursor-wait' : '',
                      isSwapTarget ? 'ring-2 ring-yellow-300' : '',
                    ].join(' ')}
                    style={{ left: pos.x, top: pos.y }}
                    title={`Slot ${slot.slotId} -> motor ${slot.motorId}`}
                    disabled={slot.busy}
                  >
                    <div className="leading-tight">
                      <div>T{slot.slotId}</div>
                      <div className="font-mono text-[10px]">{slot.direction * slot.motorId}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => setSwapFirstSlot(null)}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded border border-k3s-border bg-k3s-dark text-k3s-muted hover:text-white hover:border-k3s-primary"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                Reset Swap
              </button>
              <span className="inline-flex items-center px-3 py-1.5 text-xs rounded border border-k3s-border bg-k3s-dark text-k3s-muted">
                Step 1: click Swap on a slot, Step 2: click Swap on another slot.
              </span>
            </div>

            <p className="mt-3 text-[11px] text-k3s-muted italic">
              Note: This view is intended to support configuration and operational mapping. It is not a complete physical representation of the full vehicle model. (Louis)
            </p>
          </article>

          <article className="xl:col-span-7 bg-k3s-block border border-k3s-border rounded p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm md:text-base font-bold text-white uppercase tracking-wide">Real-time Parameter Editor</h3>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-3 py-2 rounded text-xs font-black uppercase tracking-wide bg-k3s-primary text-white border border-k3s-primary hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? 'Saving...' : 'Save Config'}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {slots.map((slot) => (
                <div key={slot.slotId} className="border border-k3s-border rounded p-3 bg-k3s-dark/40">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="text-xs text-white font-bold uppercase tracking-wide">Thruster {slot.slotId}</div>
                    <div
                      className={[
                        'text-[10px] px-2 py-0.5 rounded border',
                        slot.active
                          ? 'text-emerald-300 border-emerald-500/70 bg-emerald-600/20'
                          : 'text-k3s-muted border-k3s-border bg-k3s-dark',
                      ].join(' ')}
                    >
                      {slot.active ? 'ACTIVE' : 'IDLE'}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 items-center">
                    <label className="text-xs text-k3s-muted">Motor ID</label>
                    <select
                      value={slot.motorId}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        updateSlot(slot.slotId, (curr) => ({ ...curr, motorId: value }));
                      }}
                      className="col-span-2 bg-k3s-dark border border-k3s-border rounded px-2 py-1 text-xs text-white"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((id) => (
                        <option key={id} value={id}>{id}</option>
                      ))}
                    </select>

                    <label className="text-xs text-k3s-muted">Direction</label>
                    <button
                      onClick={() => {
                        updateSlot(slot.slotId, (curr) => ({
                          ...curr,
                          direction: curr.direction === 1 ? -1 : 1,
                        }));
                      }}
                      className={[
                        'col-span-2 rounded px-2 py-1 text-xs font-bold border transition-colors',
                        slot.direction === 1
                          ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                          : 'bg-amber-600/20 border-amber-500 text-amber-300',
                      ].join(' ')}
                    >
                      {slot.direction === 1 ? '+ (clockwise)' : '- (counter-clockwise)'}
                    </button>

                    <label className="text-xs text-k3s-muted">Power</label>
                    <div className="col-span-2 flex gap-1">
                      {POWER_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          onClick={() => updateSlot(slot.slotId, (curr) => ({ ...curr, power: preset }))}
                          className={[
                            'px-2 py-1 text-[11px] rounded border font-semibold transition-colors',
                            Math.abs(slot.power - preset) < 0.001
                              ? 'bg-k3s-primary border-k3s-primary text-white'
                              : 'bg-k3s-dark border-k3s-border text-k3s-muted hover:text-white hover:border-k3s-primary',
                          ].join(' ')}
                        >
                          {preset.toFixed(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleToggleThruster(slot.slotId)}
                      disabled={slot.busy}
                      className={[
                        'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded border transition-colors',
                        slot.active
                          ? 'bg-red-600/25 border-red-500 text-red-200 hover:bg-red-600/35'
                          : 'bg-emerald-600/25 border-emerald-500 text-emerald-200 hover:bg-emerald-600/35',
                        slot.busy ? 'opacity-60 cursor-wait' : '',
                      ].join(' ')}
                    >
                      {slot.active ? <PauseCircle className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                      {slot.active ? 'Stop' : 'Test'}
                    </button>

                    <button
                      onClick={() => handleSwapPick(slot.slotId)}
                      className={[
                        'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded border transition-colors',
                        swapFirstSlot === slot.slotId
                          ? 'bg-yellow-600/25 border-yellow-400 text-yellow-200'
                          : 'bg-k3s-dark border-k3s-border text-k3s-muted hover:text-white hover:border-k3s-primary',
                      ].join(' ')}
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      {swapFirstSlot === slot.slotId ? 'Armed' : 'Swap'}
                    </button>

                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded border bg-k3s-dark border-k3s-border text-k3s-muted">
                      <Zap className="w-3 h-3" />
                      map={slot.direction * slot.motorId}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="bg-k3s-block border border-k3s-border rounded p-4 md:p-5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wide">Live Mapping Array Preview</h3>
          <div className="mt-2 text-sm text-k3s-muted">Signed values represent direction (+/-) per slot position 1..8.</div>
          <div className="mt-3 p-3 rounded border border-k3s-border bg-k3s-dark font-mono text-sm text-k3s-primary break-all">
            {mappingPreview}
          </div>
          <div className="mt-3 text-xs text-k3s-muted">
            Status: {status}
          </div>
        </section>
      </div>
    </div>
  );
};
