import { Settings, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CameraFeedProps {
  title: string;
  hostAddress?: string;
  isRovActive: boolean;
  onSnap?: () => void;
}

export const CameraFeed = ({
  title,
  hostAddress,
  isRovActive,
  onSnap,
}: CameraFeedProps) => {
  return (
    <div className="flex-1 flex flex-col border border-border rounded-lg overflow-hidden bg-card min-h-0">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-secondary/50 shrink-0">
        <span className="font-display text-[10px] font-semibold tracking-wider text-foreground truncate">
          {title}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
          >
            <Settings className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            onClick={onSnap}
            className="h-6 px-2 text-[10px] font-display tracking-wider bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 hover:bg-yellow-500/30"
            variant="ghost"
          >
            SNAP
          </Button>
        </div>
      </div>
      <div
        className={cn(
          "flex-1 flex items-center justify-center min-h-[160px]",
          isRovActive ? "bg-secondary/20" : "bg-background"
        )}
      >
        {isRovActive ? (
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full border-2 border-status-green/40 flex items-center justify-center mx-auto animate-pulse">
              <Camera className="h-5 w-5 text-status-green" />
            </div>
            <p className="text-[10px] text-status-green font-mono tracking-wider">
              LIVE
            </p>
            {hostAddress && (
              <p className="text-[9px] text-muted-foreground font-mono">
                {hostAddress}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center space-y-1">
            <p className="font-display text-xl font-bold text-muted-foreground/20">
              OFF
            </p>
            {hostAddress && (
              <p className="text-[9px] text-muted-foreground/40 font-mono">
                {hostAddress}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
