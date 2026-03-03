import { NavigationHeader } from "@/components/NavigationHeader";
import { ScreenshotCapture } from "@/components/ScreenshotCapture";
import { ProgrammeLoader } from "@/components/ProgrammeLoader";

const AllExceptYaw = () => {
  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader title="ALL EXCEPT YAW" subtitle="Power Limit Configuration" />

      <main className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        <div className="control-card space-y-4">
          <h3 className="font-display text-sm font-semibold tracking-wider text-primary">
            ALL EXCEPT YAW — POWER LIMIT
          </h3>
          <p className="text-sm text-muted-foreground">
            Power limit configuration for all thrusters except yaw. Instructions pending.
          </p>
        </div>

        <ProgrammeLoader title="ALL EXCEPT YAW" />
      </main>

      <ScreenshotCapture floating />
    </div>
  );
};

export default AllExceptYaw;
