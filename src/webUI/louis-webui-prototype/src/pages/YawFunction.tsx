import { NavigationHeader } from "@/components/NavigationHeader";
import { ScreenshotCapture } from "@/components/ScreenshotCapture";
import { ProgrammeLoader } from "@/components/ProgrammeLoader";

const YawFunction = () => {
  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader title="YAW FUNCTION" subtitle="Yaw Control Configuration" />

      <main className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        <div className="control-card space-y-4">
          <h3 className="font-display text-sm font-semibold tracking-wider text-primary">
            YAW FUNCTION — POWER LIMIT
          </h3>
          <p className="text-sm text-muted-foreground">
            Yaw-specific power limit configuration. Instructions pending.
          </p>
        </div>

        <ProgrammeLoader title="YAW FUNCTION" />
      </main>

      <ScreenshotCapture floating />
    </div>
  );
};

export default YawFunction;
