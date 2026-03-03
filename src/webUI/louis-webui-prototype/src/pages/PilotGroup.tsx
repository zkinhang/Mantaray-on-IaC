import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { CameraFeed } from "@/components/CameraFeed";
import { TerminalLog, LogEntry } from "@/components/TerminalLog";
import { StatusIndicator } from "@/components/StatusIndicator";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ScreenshotCapture } from "@/components/ScreenshotCapture";
import { rosService, Twist } from "@/services/rosService";
import { cn } from "@/lib/utils";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  Play,
  Square,
  Home,
  Wifi,
  WifiOff,
} from "lucide-react";

const PilotGroup = () => {
  const navigate = useNavigate();
  const [rovActive, setRovActive] = useState(false);
  const [pidEnabled, setPidEnabled] = useState(false);
  const [systemsExpanded, setSystemsExpanded] = useState(true);
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [shiftHeld, setShiftHeld] = useState(false);
  const [powerLimit, setPowerLimit] = useState(0.5);
  const [rosStatus, setRosStatus] = useState(rosService.getStatus());
  const [rosHost, setRosHost] = useState(rosService.getTargetHost());
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: "init-1",
      timestamp: new Date(),
      message: "Pilot GP initialized",
      type: "system",
    },
    {
      id: "init-2",
      timestamp: new Date(),
      message: "RoV Disconnected",
      type: "warning",
    },
  ]);

  const addLog = useCallback(
    (message: string, type: LogEntry["type"] = "info") => {
      setLogs((prev) => [
        ...prev,
        {
          id: Date.now().toString() + Math.random(),
          timestamp: new Date(),
          message,
          type,
        },
      ]);
    },
    []
  );

  const toggleRov = (active: boolean) => {
    setRovActive(active);
    addLog(
      active ? "RoV Connected — Stream active" : "RoV Disconnected",
      active ? "system" : "warning"
    );
  };

  // ROS status listener
  useEffect(() => {
    const unsub = rosService.onStatusChange(setRosStatus);
    return unsub;
  }, []);

  // Build and publish a Twist message
  const publishMove = useCallback(
    (direction: 'forward' | 'backward' | 'yaw_left' | 'yaw_right' | 'up' | 'down' | 'stop') => {
      const speed = shiftHeld ? 1.0 : powerLimit;
      const twist: Twist = {
        linear: { x: 0, y: 0, z: 0 },
        angular: { x: 0, y: 0, z: 0 },
      };
      if (direction === 'forward') twist.linear.x = speed;
      if (direction === 'backward') twist.linear.x = -speed;
      if (direction === 'yaw_left') twist.angular.z = speed;
      if (direction === 'yaw_right') twist.angular.z = -speed;
      if (direction === 'up') twist.linear.z = speed;
      if (direction === 'down') twist.linear.z = -speed;

      rosService.publishTwist(twist);
    },
    [shiftHeld, powerLimit]
  );

  const stopAll = useCallback(() => {
    rosService.publishTwist({ linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } });
  }, []);

  // Keyboard controls
  useEffect(() => {
    const directionMap: Record<string, { label: string; ros: 'forward' | 'backward' | 'yaw_left' | 'yaw_right' | 'up' | 'down' }> = {
      w: { label: "Forward", ros: "forward" },
      x: { label: "Backward", ros: "backward" },
      a: { label: "Rotate Left", ros: "yaw_left" },
      d: { label: "Rotate Right", ros: "yaw_right" },
      q: { label: "Yaw Left", ros: "yaw_left" },
      e: { label: "Yaw Right", ros: "yaw_right" },
      z: { label: "Ascending", ros: "up" },
      c: { label: "Descending", ros: "down" },
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      if (key in directionMap) {
        setActiveKeys((prev) => new Set(prev).add(key));
        const dir = directionMap[key];
        addLog(`Movement: ${dir.label}${e.shiftKey ? " (MAX SPEED)" : ""}`, "info");
        publishMove(dir.ros);
      }
      if (key === "s") {
        setActiveKeys(new Set());
        addLog("STOP — All movement halted", "warning");
        stopAll();
      }
      if (e.key === "Shift") setShiftHeld(true);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      setActiveKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      if (key in directionMap) stopAll();
      if (e.key === "Shift") setShiftHeld(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [addLog, publishMove, stopAll]);

  const functionButtons = [
    { label: "Power Limit", param: "power-limit" },
    { label: "Start/Terminus (RoV)", param: "rov" },
  ];

  const navButtons = [
    { label: "ALL EXCEPT YAW", path: "/functions/all-except-yaw" },
    { label: "YAW FUNCTION", path: "/functions/yaw-function" },
  ];

  const handleSnap = () => {
    addLog("SNAP — Screenshot captured", "system");
  };

  const rosDirectionMap: Record<string, 'forward' | 'backward' | 'yaw_left' | 'yaw_right' | 'up' | 'down'> = {
    w: 'forward', x: 'backward', a: 'yaw_left', d: 'yaw_right', q: 'yaw_left', e: 'yaw_right', z: 'up', c: 'down',
  };

  const dpadBtn = (
    key: string,
    label: string,
    icon: React.ReactNode,
    keyLabel: string
  ) => (
    <Button
      variant="ghost"
      onMouseDown={() => {
        setActiveKeys((prev) => new Set(prev).add(key));
        addLog(`${label}${shiftHeld ? " (MAX SPEED)" : ""}`, "info");
        if (rosDirectionMap[key]) publishMove(rosDirectionMap[key]);
      }}
      onMouseUp={() => {
        setActiveKeys((prev) => {
          const n = new Set(prev);
          n.delete(key);
          return n;
        });
        stopAll();
      }}
      className={cn(
        "w-14 h-11 font-display text-xs border transition-all flex flex-col items-center gap-0.5",
        activeKeys.has(key)
          ? "bg-status-green/20 text-status-green border-status-green/40"
          : "bg-secondary border-border text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      <span className="text-[8px] opacity-60">[{keyLabel}]</span>
    </Button>
  );

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-border px-4 py-2 bg-background/95 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <Home className="h-4 w-4" />
          </Button>
          <span className="font-display text-sm font-bold tracking-wider text-foreground">
            PILOT GP
          </span>
        </div>
        <div className="flex items-center gap-3">
          <StatusIndicator active={rovActive} label="RoV" size="sm" />
          {shiftHeld && (
            <span className="text-[10px] font-mono text-yellow-400 border border-yellow-500/30 bg-yellow-500/10 px-1.5 py-0.5 rounded">
              MAX SPEED
            </span>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        {/* Left Panel — cameras + terminal (non-scrollable) */}
        <div className="flex-1 flex flex-col p-3 gap-3 min-w-0 min-h-0">
          {/* Dual Camera Feeds */}
          <div className="flex gap-3 flex-1 min-h-0">
            <CameraFeed
              title="ROV CAMERA FEED"
              hostAddress="localhost:8080"
              isRovActive={rovActive}
              onSnap={handleSnap}
            />
            <CameraFeed
              title="ROV-CAM CAMERA FEED"
              hostAddress="localhost:8081"
              isRovActive={rovActive}
              onSnap={handleSnap}
            />
          </div>

          {/* Terminal Log */}
          <TerminalLog
            logs={logs}
            statusMessage={rovActive ? "RoV Connected" : "RoV Disconnected"}
          />
        </div>

        {/* Right Panel — Mission Control (scrollable) */}
        <div className="w-full lg:w-[360px] xl:w-[400px] border-t lg:border-t-0 lg:border-l border-border overflow-y-auto p-3 space-y-3 shrink-0">
          {/* Header */}
          <div className="text-center pb-2 border-b border-border">
            <h2 className="font-display text-sm font-bold tracking-wider text-foreground">
              MISSION CONTROL
            </h2>
           <p className="text-[10px] text-muted-foreground font-mono tracking-wider">
              CONTROL PANEL
            </p>
          </div>

          {/* ROS Connection */}
          <div className="control-card space-y-2">
            <p className="status-label text-muted-foreground">ROS BRIDGE</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={rosHost}
                onChange={(e) => setRosHost(e.target.value)}
                className="flex-1 h-7 px-2 text-[10px] font-mono bg-secondary border border-border rounded text-foreground"
                placeholder="host:port"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  rosService.setTargetHost(rosHost);
                  if (rosStatus === 'connected') {
                    rosService.disconnect();
                    addLog("ROS disconnected", "warning");
                  } else {
                    rosService.connect();
                    addLog(`ROS connecting to ${rosHost}...`, "system");
                  }
                }}
                className={cn(
                  "h-7 px-2 text-[10px] font-display tracking-wider border",
                  rosStatus === 'connected'
                    ? "border-status-green/40 text-status-green"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {rosStatus === 'connected' ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                <span className="ml-1">{rosStatus === 'connected' ? 'ON' : 'CONNECT'}</span>
              </Button>
            </div>
            <StatusIndicator active={rosStatus === 'connected'} label={`ROS: ${rosStatus}`} size="sm" />
          </div>

          {/* Power Limit Presets */}
          <div className="control-card space-y-2">
            <div className="flex items-center justify-between">
              <p className="status-label text-muted-foreground">POWER LIMIT</p>
              <span className="text-xs font-mono text-primary">{powerLimit.toFixed(1)}</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {([
                { label: "LOW", value: 0.3 },
                { label: "MED", value: 0.5 },
                { label: "HIGH", value: 0.7 },
                { label: "MAX", value: 1.0 },
              ] as const).map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => setPowerLimit(preset.value)}
                  className={cn(
                    "text-[8px] font-display font-bold py-1 rounded transition-all",
                    powerLimit === preset.value
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
                  style={{ width: `${powerLimit * 100}%` }}
                />
              </div>
              <span className="text-[9px] font-mono text-muted-foreground">
                {powerLimit.toFixed(1)}
              </span>
            </div>
          </div>

          {/* RoV Start/Stop */}
          <div className="flex gap-2">
            <Button
              onClick={() => toggleRov(true)}
              className={cn(
                "flex-1 gap-1.5 font-display text-[10px] tracking-wider transition-all border h-8",
                rovActive
                  ? "bg-status-green/20 text-status-green border-status-green/40"
                  : "bg-secondary text-muted-foreground border-border hover:text-foreground"
              )}
              variant="ghost"
            >
              <Play className="h-3 w-3" /> START RoV
            </Button>
            <Button
              onClick={() => toggleRov(false)}
              className={cn(
                "flex-1 gap-1.5 font-display text-[10px] tracking-wider transition-all border h-8",
                !rovActive
                  ? "bg-status-red/20 text-status-red border-status-red/40"
                  : "bg-secondary text-muted-foreground border-border hover:text-foreground"
              )}
              variant="ghost"
            >
              <Square className="h-3 w-3" /> STOP RoV
            </Button>
          </div>

          {/* D-Pad Direction Control */}
          <div className="control-card space-y-3">
            <p className="status-label text-muted-foreground text-center">
              DIRECTION CONTROL
            </p>
            <div className="flex flex-col items-center gap-1.5">
              {/* Row 1: Q, W, E */}
              <div className="flex gap-1.5">
                {dpadBtn("q", "Yaw Left", <ArrowLeft className="h-4 w-4" />, "Q")}
                {dpadBtn("w", "Forward", <ArrowUp className="h-4 w-4" />, "W")}
                {dpadBtn("e", "Yaw Right", <ArrowRight className="h-4 w-4" />, "E")}
              </div>

              {/* Row 2: A, STOP, D */}
              <div className="flex gap-1.5">
                {dpadBtn("a", "Rotate Left", <ArrowLeft className="h-4 w-4" />, "A")}
                <Button
                  variant="ghost"
                  onClick={() => {
                    setActiveKeys(new Set());
                    addLog("STOP — All movement halted", "warning");
                    stopAll();
                  }}
                  className="w-14 h-11 font-display text-[10px] font-bold border border-status-red/50 bg-status-red/15 text-status-red hover:bg-status-red/25 flex flex-col items-center gap-0.5"
                >
                   STOP
                  <span className="text-[7px] opacity-60">[S]</span>
                </Button>
                {dpadBtn("d", "Rotate Right", <ArrowRight className="h-4 w-4" />, "D")}
              </div>

              {/* Row 3: Z, X, C */}
              <div className="flex gap-1.5">
                {dpadBtn("z", "Ascending", <ChevronUp className="h-4 w-4" />, "Z")}
                {dpadBtn("x", "Backward", <ArrowDown className="h-4 w-4" />, "X")}
                {dpadBtn("c", "Descending", <ChevronDown className="h-4 w-4" />, "C")}
              </div>
            </div>
          </div>

          {/* Systems Section */}
          <div className="control-card space-y-3">
            <button
              onClick={() => setSystemsExpanded(!systemsExpanded)}
              className="flex items-center justify-between w-full"
            >
              <span className="font-display text-xs font-semibold tracking-wider text-primary">
                SYSTEMS
              </span>
              <span className="text-muted-foreground text-xs">
                {systemsExpanded ? "▼" : "▶"}
              </span>
            </button>

            {systemsExpanded && (
              <div className="space-y-3">
                {/* PID Control Toggle */}
                <Button
                  onClick={() => {
                    setPidEnabled(!pidEnabled);
                    addLog(
                      `PID Control ${!pidEnabled ? "ENABLED" : "DISABLED"}`,
                      "system"
                    );
                  }}
                  className={cn(
                    "w-full h-12 font-display text-sm tracking-wider transition-all border",
                    pidEnabled
                      ? "bg-status-green/20 text-status-green border-status-green/40 glow-green"
                      : "bg-status-red/10 text-status-red border-status-red/30"
                  )}
                  variant="ghost"
                >
                  PID CONTROL — {pidEnabled ? "ENABLED" : "DISABLED"}
                </Button>

                {/* Navigation Buttons */}
                <div className="space-y-1.5">
                  <p className="status-label text-muted-foreground">
                    POWER CONTROL
                  </p>
                  {navButtons.map((btn) => (
                    <Button
                      key={btn.path}
                      variant="ghost"
                      onClick={() => {
                        navigate(btn.path);
                        addLog(`Navigating to ${btn.label}`, "info");
                      }}
                      className="w-full h-10 text-xs font-display tracking-wider border border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50 justify-start px-3"
                    >
                      → {btn.label}
                    </Button>
                  ))}
                </div>

                {/* Function Buttons */}
                <div className="space-y-1.5">
                  <p className="status-label text-muted-foreground">
                    FUNCTIONS
                  </p>
                  {functionButtons.map((btn) => (
                    <Button
                      key={btn.param}
                      variant="ghost"
                      onClick={() => {
                        navigate(`/functions?open=${btn.param}`);
                        addLog(`Navigating to ${btn.label}`, "info");
                      }}
                      className="w-full h-8 text-[10px] font-display tracking-wider border border-border text-muted-foreground hover:text-primary hover:border-primary/40 justify-start px-3"
                    >
                      → {btn.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ScreenshotCapture floating />
    </div>
  );
};

export default PilotGroup;
