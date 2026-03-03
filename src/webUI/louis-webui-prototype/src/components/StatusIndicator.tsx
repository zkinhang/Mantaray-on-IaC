import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  active: boolean;
  size?: "sm" | "md" | "lg";
  label?: string;
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: "h-2.5 w-2.5",
  md: "h-3.5 w-3.5",
  lg: "h-5 w-5",
};

export const StatusIndicator = ({
  active,
  size = "md",
  label,
  showText = true,
  className,
}: StatusIndicatorProps) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "rounded-full transition-all duration-300 shrink-0",
          sizeMap[size],
          active
            ? "bg-status-green animate-pulse-green"
            : "bg-status-red animate-pulse-red"
        )}
      />
      {showText && (
        <span className="status-label text-muted-foreground">
          {active ? "OPEN" : "OFF"}
        </span>
      )}
      {label && (
        <span className="text-sm text-foreground/80">{label}</span>
      )}
    </div>
  );
};
