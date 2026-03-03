import { useState } from "react";
import { StatusIndicator } from "./StatusIndicator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const POWER_PRESETS = [
  { label: "LOW", value: 0.3 },
  { label: "MED", value: 0.5 },
  { label: "HIGH", value: 0.7 },
  { label: "MAX", value: 1.0 },
] as const;

interface ThrusterState {
  id: number;
  name: string;
  active: boolean;
  tested: boolean;
  powerPreset: number; // index into POWER_PRESETS
}

const initialThrusters: ThrusterState[] = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  name: i === 0 ? "Thruster I" : `Thruster ${i + 1}`,
  active: false,
  tested: false,
  powerPreset: 1, // default MEDIUM
}));

export const ThrusterControl = () => {
  const [thrusters, setThrusters] = useState<ThrusterState[]>(initialThrusters);

  const toggleThruster = (id: number) => {
    setThrusters((prev) =>
      prev.map((t) => (t.id === id ? { ...t, active: !t.active } : t))
    );
  };

  const testThruster = (id: number) => {
    setThrusters((prev) =>
      prev.map((t) => (t.id === id ? { ...t, tested: true } : t))
    );
  };

  const setPowerPreset = (id: number, presetIndex: number) => {
    setThrusters((prev) =>
      prev.map((t) => (t.id === id ? { ...t, powerPreset: presetIndex } : t))
    );
  };

  const toggleAll = (active: boolean) => {
    setThrusters((prev) => prev.map((t) => ({ ...t, active })));
  };

  return (
    <div className="control-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold tracking-wider text-primary">
          8-THRUSTER SYSTEM
        </h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => toggleAll(true)}
            className="border-status-green/40 text-status-green hover:bg-status-green/10 text-xs"
          >
            All OPEN
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toggleAll(false)}
            className="border-status-red/40 text-status-red hover:bg-status-red/10 text-xs"
          >
            All OFF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {thrusters.map((thruster) => (
          <div
            key={thruster.id}
            className={cn(
              "rounded-md border p-3 transition-all duration-300 space-y-2",
              thruster.active
                ? "border-status-green/40 bg-status-green/5"
                : "border-status-red/20 bg-status-red/5"
            )}
          >
            {/* Thruster Header */}
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-foreground">
                {thruster.name}
              </span>
              <StatusIndicator active={thruster.active} size="sm" showText={false} />
            </div>

            {/* Power Limit Presets for this thruster */}
            <div className="space-y-1">
              <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
                Power Limit
              </p>
              <div className="grid grid-cols-4 gap-0.5">
                {POWER_PRESETS.map((preset, i) => (
                  <button
                    key={preset.label}
                    onClick={() => setPowerPreset(thruster.id, i)}
                    className={cn(
                      "text-[8px] font-display font-bold py-1 rounded transition-all",
                      thruster.powerPreset === i
                        ? "bg-primary/25 text-primary border border-primary/50"
                        : "bg-secondary/60 text-muted-foreground border border-transparent hover:border-primary/30 hover:text-foreground"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${POWER_PRESETS[thruster.powerPreset].value * 100}%` }}
                  />
                </div>
                <span className="text-[9px] font-mono text-muted-foreground">
                  {POWER_PRESETS[thruster.powerPreset].value}
                </span>
              </div>
            </div>

            {/* Toggle Button */}
            <div>
              <Button
                size="sm"
                onClick={() => toggleThruster(thruster.id)}
                className={cn(
                  "w-full text-[10px] h-8",
                  thruster.active
                    ? "bg-status-green/20 text-status-green hover:bg-status-green/30 border border-status-green/30"
                    : "bg-status-red/20 text-status-red hover:bg-status-red/30 border border-status-red/30"
                )}
                variant="ghost"
              >
                {thruster.active ? "OPEN" : "OFF"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
