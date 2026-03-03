import { useState } from "react";
import { StatusIndicator } from "./StatusIndicator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PRESETS = [
  { label: "LOW", value: 0.3 },
  { label: "MEDIUM", value: 0.5 },
  { label: "HIGH", value: 0.7 },
  { label: "MAX", value: 1.0 },
] as const;

export const PowerLimitControl = () => {
  const [activePreset, setActivePreset] = useState<number>(0);
  const [powerActive, setPowerActive] = useState(false);
  const [threshold10A, setThreshold10A] = useState(false);

  const currentValue = PRESETS[activePreset].value;

  return (
    <div className="control-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold tracking-wider text-primary">
          POWER LIMIT
        </h3>
        <StatusIndicator active={powerActive} label="Power System" />
      </div>

      {/* 4 Preset Buttons */}
      <div className="space-y-2">
        <p className="status-label text-muted-foreground">Select Preset</p>
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((preset, i) => (
            <Button
              key={preset.label}
              onClick={() => {
                setActivePreset(i);
                setPowerActive(true);
              }}
              className={cn(
                "relative flex flex-col items-center py-3 h-auto transition-all",
                activePreset === i
                  ? "bg-primary/20 border-2 border-primary text-primary glow-cyan"
                  : "bg-secondary border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
              )}
              variant="ghost"
            >
              <span className="font-display text-xs font-bold">{preset.label}</span>
              <span className="font-mono text-lg font-bold">{preset.value}</span>
              {activePreset === i && (
                <StatusIndicator active size="sm" showText={false} className="absolute top-1 right-1" />
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Power Value Display */}
      <div className="flex items-center gap-4 rounded-md bg-secondary/50 p-3 border border-border">
        <div className="flex-1">
          <p className="status-label text-muted-foreground mb-1">
            Power Limit
          </p>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-foreground">
              {currentValue.toFixed(1)}
            </span>
            <span className="text-xs text-muted-foreground">/ 1.0</span>
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${currentValue * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* 10A Threshold */}
      <div className="flex items-center justify-between rounded-md bg-secondary/30 px-3 py-2 border border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground">10A Power Limit Threshold</span>
          <StatusIndicator active={threshold10A} size="sm" />
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setThreshold10A(!threshold10A)}
          className={cn(
            "text-xs border",
            threshold10A
              ? "border-status-green/40 text-status-green"
              : "border-status-red/40 text-status-red"
          )}
        >
          {threshold10A ? "ACTIVE" : "INACTIVE"}
        </Button>
      </div>

      {/* Power Toggle */}
      <Button
        onClick={() => setPowerActive(!powerActive)}
        className={cn(
          "w-full font-display tracking-wider transition-all",
          powerActive
            ? "bg-status-green/20 text-status-green border border-status-green/40 hover:bg-status-green/30"
            : "bg-status-red/20 text-status-red border border-status-red/40 hover:bg-status-red/30"
        )}
        variant="ghost"
      >
        {powerActive ? "POWER LIMIT OPEN" : "POWER LIMIT OFF"}
      </Button>
    </div>
  );
};
