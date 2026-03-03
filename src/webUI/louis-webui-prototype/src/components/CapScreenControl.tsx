import { useState, useEffect } from "react";
import { StatusIndicator } from "./StatusIndicator";
import { Button } from "@/components/ui/button";
import { ScreenshotCapture } from "./ScreenshotCapture";
import { cn } from "@/lib/utils";
import { Shield, Zap, Database, Play, Square, FolderOpen } from "lucide-react";

interface SequentialTask {
  id: number;
  name: string;
  status: "pending" | "running" | "completed";
}

const initialTasks: SequentialTask[] = [
  { id: 1, name: "Task 1 — Initialize", status: "pending" },
  { id: 2, name: "Task 2 — Validate", status: "pending" },
  { id: 3, name: "Task 3 — Execute", status: "pending" },
  { id: 4, name: "Task 4 — Finalize", status: "pending" },
];

export const CapScreenControl = () => {
  const [capScreenActive, setCapScreenActive] = useState(false);
  const [storeDrive, setStoreDrive] = useState(true); // YES = store in C drive
  const [showFolderSelect, setShowFolderSelect] = useState(false);
  const [customFolder, setCustomFolder] = useState("");
  const [emergencyAccess, setEmergencyAccess] = useState(false);
  const [tasks, setTasks] = useState<SequentialTask[]>(initialTasks);
  const [capCapacity, setCapCapacity] = useState(72);
  const [isRunning, setIsRunning] = useState(false);

  // Sequential task automation
  useEffect(() => {
    if (!isRunning) return;
    const pendingTask = tasks.find((t) => t.status === "pending");
    if (!pendingTask) {
      setIsRunning(false);
      return;
    }

    setTasks((prev) =>
      prev.map((t) =>
        t.id === pendingTask.id ? { ...t, status: "running" } : t
      )
    );

    const timer = setTimeout(() => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === pendingTask.id ? { ...t, status: "completed" } : t
        )
      );
    }, 1500);

    return () => clearTimeout(timer);
  }, [isRunning, tasks]);

  const startCapScreen = () => {
    setCapScreenActive(true);
    setIsRunning(true);
    setTasks(initialTasks.map((t) => ({ ...t, status: "pending" })));
  };

  const stopCapScreen = () => {
    setCapScreenActive(false);
    setIsRunning(false);
  };

  const handleStoreDriveChoice = (choice: boolean) => {
    setStoreDrive(choice);
    if (!choice) {
      setShowFolderSelect(true);
    } else {
      setShowFolderSelect(false);
      setCustomFolder("");
    }
  };

  return (
    <div className="space-y-4">
      {/* Cap Screen Core + Screenshot Capture Combined */}
      <div className="control-card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold tracking-wider text-primary">
            CAP SCREEN / SCREENSHOT CAPTURE
          </h3>
          <StatusIndicator active={capScreenActive} label="Cap Screen" />
        </div>

        {/* Capacity Monitor */}
        <div className="rounded-md bg-secondary/50 p-3 border border-border">
          <p className="status-label text-muted-foreground mb-1">
            CAPTURE SCREEN
          </p>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="font-mono text-2xl font-bold text-foreground">
              {capCapacity}%
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                capCapacity > 50 ? "bg-status-green" : "bg-status-red"
              )}
              style={{ width: `${capCapacity}%` }}
            />
          </div>
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCapCapacity(Math.min(100, capCapacity + 10))}
              className="text-xs border border-border text-muted-foreground hover:text-foreground"
            >
              +10%
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCapCapacity(Math.max(0, capCapacity - 10))}
              className="text-xs border border-border text-muted-foreground hover:text-foreground"
            >
              -10%
            </Button>
          </div>
        </div>

        {/* Screenshot Capture Button */}
        <div className="flex flex-col items-center gap-3 py-2">
          <p className="text-sm text-muted-foreground text-center">
            Capture the current screen including all status indicators and controls.
          </p>
          <ScreenshotCapture
            floating={false}
            storagePath={storeDrive ? undefined : customFolder || undefined}
          />
        </div>

        {/* Start / Stop */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={startCapScreen}
            className={cn(
              "gap-2 font-display text-xs tracking-wider transition-all border",
              capScreenActive
                ? "bg-status-green/20 text-status-green border-status-green/40"
                : "bg-secondary text-muted-foreground border-border hover:text-foreground"
            )}
            variant="ghost"
          >
            <Play className="h-4 w-4" />
            START
          </Button>
          <Button
            onClick={stopCapScreen}
            className={cn(
              "gap-2 font-display text-xs tracking-wider transition-all border",
              !capScreenActive
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

      {/* Store Drive */}
      <div className="control-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            <h3 className="font-display text-sm font-semibold tracking-wider text-primary">
              STORE DRIVE
            </h3>
          </div>
          <StatusIndicator active={storeDrive} />
        </div>
        <div className="rounded-md bg-secondary/30 px-3 py-2 border border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground font-mono">Store in C drive?</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleStoreDriveChoice(true)}
                className={cn(
                  "text-xs border px-4",
                  storeDrive
                    ? "border-status-green/40 text-status-green bg-status-green/10"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                YES
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleStoreDriveChoice(false)}
                className={cn(
                  "text-xs border px-4",
                  !storeDrive
                    ? "border-status-red/40 text-status-red bg-status-red/10"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                NO
              </Button>
            </div>
          </div>

          {/* Folder Selection Sub-Panel */}
          {showFolderSelect && (
            <div className="rounded-md bg-background/60 p-3 border border-primary/20 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-primary" />
                <span className="text-sm text-foreground font-display tracking-wider">
                  Please select the folder
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g., /Users/name/captures"
                  value={customFolder}
                  onChange={(e) => setCustomFolder(e.target.value)}
                  className="flex-1 h-9 rounded-md border border-border bg-secondary/50 px-3 py-1 text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowFolderSelect(false)}
                  className={cn(
                    "text-xs border",
                    customFolder
                      ? "border-status-green/40 text-status-green bg-status-green/10"
                      : "border-border text-muted-foreground"
                  )}
                  disabled={!customFolder}
                >
                  CONFIRM
                </Button>
              </div>
              {customFolder && (
                <p className="text-[10px] text-muted-foreground font-mono">
                  Storage path: {customFolder}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Authorization — Emergency Access Only */}
      <div className="control-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <h3 className="font-display text-sm font-semibold tracking-wider text-primary">
              AUTHORIZATION
            </h3>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md bg-secondary/30 px-3 py-2 border border-border">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-status-green" />
            <div>
              <span className="text-sm text-foreground">Enable the emergency quick access</span>
              <p className="text-xs text-muted-foreground">Emergency Quick Access</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEmergencyAccess(!emergencyAccess)}
            className={cn(
              "text-xs border",
              emergencyAccess
                ? "border-status-green/40 text-status-green bg-status-green/10"
                : "border-border text-muted-foreground"
            )}
          >
            {emergencyAccess ? "ACTIVE" : "STANDBY"}
          </Button>
        </div>
      </div>

      {/* Sequential Tasks */}
      <div className="control-card space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm font-semibold tracking-wider text-primary">
            SEQUENTIAL TASKS
          </h3>
        </div>
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "flex items-center justify-between rounded-md px-3 py-2 border transition-all",
                task.status === "running"
                  ? "border-status-green/50 bg-status-green/10"
                  : task.status === "completed"
                  ? "border-status-green/30 bg-status-green/5"
                  : "border-border bg-secondary/30"
              )}
            >
              <span className="text-sm text-foreground">{task.name}</span>
              <StatusIndicator
                active={task.status === "running" || task.status === "completed"}
                size="sm"
              />
            </div>
          ))}
        </div>

        {/* Cantr/Cap screen */}
        <div className="flex items-center justify-between rounded-md bg-secondary/30 px-3 py-2 border border-border mt-2">
          <span className="text-sm text-foreground">Cantr/Cap screen</span>
          <StatusIndicator active={capScreenActive} size="sm" label="Cross-workflow" />
        </div>
      </div>
    </div>
  );
};
