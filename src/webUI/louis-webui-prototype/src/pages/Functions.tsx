import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { NavigationHeader } from "@/components/NavigationHeader";
import { ScreenshotCapture } from "@/components/ScreenshotCapture";
import { CapScreenControl } from "@/components/CapScreenControl";
import { ThrusterControl } from "@/components/ThrusterControl";
import { PowerLimitControl } from "@/components/PowerLimitControl";
import { cn } from "@/lib/utils";
import {
  Monitor,
  Gauge,
  Navigation,
  Play,
  Square,
  ChevronDown,
  ChevronRight,
  Compass,
  Layers,
} from "lucide-react";
import { StatusIndicator } from "@/components/StatusIndicator";
import { Button } from "@/components/ui/button";

interface FunctionItem {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  navigateTo?: string;
}

const functions: FunctionItem[] = [
  {
    id: "cap-screen",
    label: "Cap Screen / Screenshot Capture",
    icon: Monitor,
    description: "Cap Screen operations, screenshot capture and monitoring",
  },
  {
    id: "thrusters",
    label: "8-Thruster Control",
    icon: Navigation,
    description: "Individual and group thruster management",
  },
  {
    id: "power-limit",
    label: "Power Limit",
    icon: Gauge,
    description: "Power limit — 4 preset configuration",
  },
  {
    id: "all-except-yaw",
    label: "ALL Except Yaw",
    icon: Layers,
    description: "Power limit configuration for all thrusters except yaw",
    navigateTo: "/functions/all-except-yaw",
  },
  {
    id: "yaw-function",
    label: "YAW Function",
    icon: Compass,
    description: "Yaw-specific power limit and control configuration",
    navigateTo: "/functions/yaw-function",
  },
  {
    id: "rov",
    label: "Start/Terminus RoV",
    icon: Play,
    description: "Start/Terminus — ROV initiation and stop",
  },
];

const Functions = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rovActive, setRovActive] = useState(false);

  // Auto-expand from URL params (e.g., /functions?open=power-limit)
  useEffect(() => {
    const openParam = searchParams.get("open");
    if (openParam) {
      setExpanded(openParam);
    }
  }, [searchParams]);

  const toggle = (fn: FunctionItem) => {
    if (fn.navigateTo) {
      navigate(fn.navigateTo);
      return;
    }
    setExpanded(expanded === fn.id ? null : fn.id);
  };

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader
        title="FUNCTIONS"
        subtitle="Universal Access — All Operational Functions"
      />

      <main className="p-4 md:p-6 space-y-3 max-w-4xl mx-auto">
        {functions.map((fn) => (
          <div key={fn.id} className="control-card">
            <button
              onClick={() => toggle(fn)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary border border-border">
                  <fn.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-semibold tracking-wider text-foreground">
                    {fn.label}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {fn.description}
                  </p>
                </div>
              </div>
              {expanded === fn.id ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
            </button>

            {expanded === fn.id && (
              <div className="mt-4 pt-4 border-t border-border">
                {fn.id === "cap-screen" && <CapScreenControl />}
                {fn.id === "thrusters" && <ThrusterControl />}
                {fn.id === "power-limit" && <PowerLimitControl />}
                {fn.id === "rov" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">
                        Start/Terminus — RoV Control
                      </span>
                      <StatusIndicator active={rovActive} label="RoV" />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setRovActive(true)}
                        className={cn(
                          "flex-1 gap-2 font-display text-xs tracking-wider transition-all border",
                          rovActive
                            ? "bg-status-green/20 text-status-green border-status-green/40"
                            : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                        )}
                        variant="ghost"
                      >
                        <Play className="h-4 w-4" />
                        START
                      </Button>
                      <Button
                        onClick={() => setRovActive(false)}
                        className={cn(
                          "flex-1 gap-2 font-display text-xs tracking-wider transition-all border",
                          !rovActive
                            ? "bg-status-red/20 text-status-red border-status-red/40"
                            : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                        )}
                        variant="ghost"
                      >
                        <Square className="h-4 w-4" />
                        STOP
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </main>

      <ScreenshotCapture floating />
    </div>
  );
};

export default Functions;
