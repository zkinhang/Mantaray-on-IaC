import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface LogEntry {
  id: string;
  timestamp: Date;
  message: string;
  type: "info" | "warning" | "error" | "system";
}

interface TerminalLogProps {
  logs: LogEntry[];
  statusMessage?: string;
  className?: string;
}

const typeColors: Record<LogEntry["type"], string> = {
  info: "text-foreground",
  warning: "text-yellow-400",
  error: "text-status-red",
  system: "text-primary",
};

export const TerminalLog = ({
  logs,
  statusMessage = "Ready",
  className,
}: TerminalLogProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  return (
    <div
      className={cn(
        "flex flex-col border border-border rounded-lg bg-card overflow-hidden shrink-0",
        className
      )}
    >
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-secondary/50">
        <span className="font-display text-[10px] font-semibold tracking-wider text-primary">
          TERMINAL_LOG:
        </span>
        <span className="text-[10px] text-muted-foreground font-mono truncate">
          {statusMessage}
        </span>
      </div>
      <div
        ref={scrollRef}
        className="overflow-y-auto p-2 space-y-0.5"
        style={{ maxHeight: "180px", minHeight: "100px" }}
      >
        {logs.map((log) => (
          <div
            key={log.id}
            className="flex gap-2 text-[11px] font-mono leading-relaxed"
          >
            <span className="text-muted-foreground shrink-0">
              [{formatTime(log.timestamp)}]
            </span>
            <span className={typeColors[log.type]}>{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
