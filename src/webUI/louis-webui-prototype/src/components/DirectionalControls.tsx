import { useState } from "react";
import { StatusIndicator } from "./StatusIndicator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, Play, Square } from "lucide-react";

const MODES = ["Mode V", "Mode VI", "Mode VII", "Mode VIII"] as const;

export const DirectionalControls = () => {
  const [rovActive, setRovActive] = useState(false);
  const [forward, setForward] = useState(false);
  const [backward, setBackward] = useState(false);
  const [activeModes, setActiveModes] = useState<Set<string>>(new Set());

  const toggleMode = (mode: string) => {
    setActiveModes((prev) => {
      const next = new Set(prev);
      if (next.has(mode)) next.delete(mode);
      else next.add(mode);
      return next;
    });
  };

  return (
    <div className="control-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold tracking-wider text-primary">
          DIRECTIONAL & ROV CONTROLS
        </h3>
        <StatusIndicator active={rovActive} label="RoV" />
      </div>

      {/* Start/Terminate ROV */}
      <div className="flex gap-2">
        <Button
          onClick={() => setRovActive(true)}
          className={cn(
            "flex-1 gap-2 font-display text-xs tracking-wider transition-all",
            rovActive
              ? "bg-status-green/20 text-status-green border border-status-green/40"
              : "bg-secondary border border-border text-muted-foreground hover:text-foreground"
          )}
          variant="ghost"
        >
          <Play className="h-4 w-4" />
          Start/Terminus — START
        </Button>
        <Button
          onClick={() => setRovActive(false)}
          className={cn(
            "flex-1 gap-2 font-display text-xs tracking-wider transition-all",
            !rovActive
              ? "bg-status-red/20 text-status-red border border-status-red/40"
              : "bg-secondary border border-border text-muted-foreground hover:text-foreground"
          )}
          variant="ghost"
        >
          <Square className="h-4 w-4" />
          Start/Terminus — STOP
        </Button>
      </div>

      {/* Forward / Back */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => { setForward(!forward); if (!forward) setBackward(false); }}
          className={cn(
            "flex flex-col items-center gap-2 rounded-lg border p-4 transition-all",
            forward
              ? "border-status-green/50 bg-status-green/10 text-status-green glow-green"
              : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-primary/30"
          )}
        >
          <ArrowUp className="h-8 w-8" />
          <span className="font-display text-xs font-semibold tracking-wider">Frant IV</span>
          <StatusIndicator active={forward} size="sm" />
        </button>
        <button
          onClick={() => { setBackward(!backward); if (!backward) setForward(false); }}
          className={cn(
            "flex flex-col items-center gap-2 rounded-lg border p-4 transition-all",
            backward
              ? "border-status-green/50 bg-status-green/10 text-status-green glow-green"
              : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-primary/30"
          )}
        >
          <ArrowDown className="h-8 w-8" />
          <span className="font-display text-xs font-semibold tracking-wider">BACK</span>
          <StatusIndicator active={backward} size="sm" />
        </button>
      </div>

      {/* 8 Directional Modes */}
      <div>
        <p className="status-label text-muted-foreground mb-2">Operational Modes</p>
        <div className="grid grid-cols-4 gap-2">
          {MODES.map((mode) => {
            const isActive = activeModes.has(mode);
            return (
              <Button
                key={mode}
                onClick={() => toggleMode(mode)}
                variant="ghost"
                className={cn(
                  "flex flex-col items-center gap-1 h-auto py-3 text-xs transition-all border",
                  isActive
                    ? "border-status-green/40 bg-status-green/10 text-status-green"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="font-display text-[10px] font-bold">{mode}</span>
                <StatusIndicator active={isActive} size="sm" showText={false} />
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
