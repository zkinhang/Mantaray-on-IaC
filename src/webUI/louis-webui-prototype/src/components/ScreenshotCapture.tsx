import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ScreenshotCaptureProps {
  floating?: boolean;
  storagePath?: string;
  className?: string;
}

export const ScreenshotCapture = ({
  floating = true,
  storagePath,
  className,
}: ScreenshotCaptureProps) => {
  const { toast } = useToast();

  const capture = async () => {
    try {
      const canvas = await html2canvas(document.body, {
        backgroundColor: "#0d1117",
        scale: 2,
      });
      const link = document.createElement("a");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `rov-capture-${timestamp}.png`;
      link.download = storagePath ? `${storagePath}/${filename}` : filename;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({
        title: "Screenshot Captured",
        description: `Saved as ${filename}`,
      });
    } catch {
      toast({
        title: "Capture Failed",
        description: "Unable to capture screenshot",
        variant: "destructive",
      });
    }
  };

  if (floating) {
    return (
      <Button
        onClick={capture}
        size="icon"
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg glow-cyan hover:bg-primary/80 transition-all",
          className
        )}
      >
        <Camera className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Button
      onClick={capture}
      variant="outline"
      className={cn("gap-2 border-primary/30 text-primary hover:bg-primary/10", className)}
    >
      <Camera className="h-4 w-4" />
      Capture Screenshot
    </Button>
  );
};
