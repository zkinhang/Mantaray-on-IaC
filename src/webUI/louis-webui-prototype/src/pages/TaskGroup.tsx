import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { CameraFeed } from "@/components/CameraFeed";
import { TerminalLog, LogEntry } from "@/components/TerminalLog";
import { Button } from "@/components/ui/button";
import { ScreenshotCapture } from "@/components/ScreenshotCapture";
import { Monitor, Home } from "lucide-react";

const TaskGroup = () => {
  const navigate = useNavigate();
  const [rovActive] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: "init-1",
      timestamp: new Date(),
      message: "Task GP initialized",
      type: "system",
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

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
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
            TASK GP
          </span>
        </div>
      </header>

      {/* Dual Camera Feeds (larger) */}
      <div className="flex gap-3 p-3 flex-1 min-h-0">
        <CameraFeed
          title="ROV CAMERA FEED"
          hostAddress="localhost:8082"
          isRovActive={rovActive}
          onSnap={() => addLog("SNAP — Screenshot captured", "system")}
        />
        <CameraFeed
          title="ROV-CAM CAMERA FEED"
          hostAddress="localhost:8083"
          isRovActive={rovActive}
          onSnap={() => addLog("SNAP — Screenshot captured", "system")}
        />
      </div>

      {/* Cap Screening Button */}
      <div className="px-3 pb-3 flex justify-center">
        <Button
          onClick={() => {
            addLog("Cap screening button tapped", "info");
            navigate("/functions?open=cap-screen");
          }}
          className="gap-2 font-display text-xs tracking-wider border border-primary/40 text-primary hover:bg-primary/10 px-8 py-5"
          variant="ghost"
        >
          <Monitor className="h-5 w-5" />
          Cap screening
        </Button>
      </div>

      {/* Terminal Log */}
      <div className="px-3 pb-3">
        <TerminalLog
          logs={logs}
          statusMessage="Task GP — Cap Screen Mode"
        />
      </div>

      <ScreenshotCapture floating />
    </div>
  );
};

export default TaskGroup;
