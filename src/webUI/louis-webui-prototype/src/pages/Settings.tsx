import { NavigationHeader } from "@/components/NavigationHeader";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sun, Moon, SunMedium } from "lucide-react";

const Settings = () => {
  const { theme, setTheme } = useTheme();

  const themes = [
    { key: "dark" as const, label: "DARK MODE", icon: Moon },
    { key: "medium" as const, label: "MEDIUM (Normalized)", icon: SunMedium },
    { key: "light" as const, label: "LIGHT MODE", icon: Sun },
  ];

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader title="SETTINGS" subtitle="System Configuration" />

      <main className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        {/* Theme Selection */}
        <div className="control-card space-y-4">
          <h3 className="font-display text-sm font-semibold tracking-wider text-primary">
            APPEARANCE
          </h3>
          <p className="text-sm text-muted-foreground">
            Select your preferred interface theme.
          </p>

          <div className="grid grid-cols-3 gap-3">
            {themes.map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant="ghost"
                onClick={() => setTheme(key)}
                className={cn(
                  "flex flex-col items-center gap-3 h-auto py-6 border transition-all",
                  theme === key
                    ? "border-primary bg-primary/10 text-primary glow-cyan"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                )}
              >
                <Icon className="h-8 w-8" />
                <span className="font-display text-[9px] tracking-wider text-center">{label}</span>
              </Button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
