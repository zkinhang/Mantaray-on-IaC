import { Button } from "@/components/ui/button";
import { StatusIndicator } from "./StatusIndicator";
import { Play, Square, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface GlobalControlsProps {
  systemActive: boolean;
  onStart: () => void;
  onStop: () => void;
  showDownload?: boolean;
}

export const GlobalControls = ({
  systemActive,
  onStart,
  onStop,
  showDownload = true,
}: GlobalControlsProps) => {
  const { toast } = useToast();

  const handleDownload = () => {
    toast({
      title: "Downl — Export Initiated",
      description: "Operational data export has been triggered.",
    });
  };

  return (
    <div className="control-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-sm font-semibold tracking-wider text-primary">
          SYSTEM CONTROLS
        </h3>
        <StatusIndicator active={systemActive} label="System" />
      </div>
      <div className="flex gap-3">
        <Button
          onClick={onStart}
          className={cn(
            "flex-1 gap-2 font-display tracking-wider transition-all border",
            systemActive
              ? "bg-status-green/20 text-status-green border-status-green/40 glow-green"
              : "bg-secondary text-muted-foreground border-border hover:border-status-green/40 hover:text-status-green"
          )}
          variant="ghost"
        >
          <Play className="h-5 w-5" />
          START
        </Button>
        <Button
          onClick={onStop}
          className={cn(
            "flex-1 gap-2 font-display tracking-wider transition-all border",
            !systemActive
              ? "bg-status-red/20 text-status-red border-status-red/40 glow-red"
              : "bg-secondary text-muted-foreground border-border hover:border-status-red/40 hover:text-status-red"
          )}
          variant="ghost"
        >
          <Square className="h-5 w-5" />
          STOP
        </Button>
        {showDownload && (
          <Button
            onClick={handleDownload}
            variant="ghost"
            className="gap-2 font-display tracking-wider border border-primary/30 text-primary hover:bg-primary/10"
          >
            <Download className="h-5 w-5" />
            Downl
          </Button>
        )}
      </div>
    </div>
  );
};
