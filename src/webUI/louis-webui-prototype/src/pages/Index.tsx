import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Compass, Monitor, LayoutGrid, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const options = [
  {
    label: "Proceed to Pilot gp",
    description: "Real-time thruster, power limit & ROV control interface",
    icon: Compass,
    path: "/pilot-gp",
    accentClass: "group-hover:text-status-green group-hover:border-status-green/40",
    glowClass: "group-hover:glow-green",
  },
  {
    label: "Proceed to Task gp",
    description: "Exclusive Cap Screen operational workflows",
    icon: Monitor,
    path: "/task-gp",
    accentClass: "group-hover:text-primary group-hover:border-primary/40",
    glowClass: "group-hover:glow-cyan",
  },
  {
    label: "Functions",
    description: "Ad-hoc access to all operational functions",
    icon: LayoutGrid,
    path: "/functions",
    accentClass: "group-hover:text-primary group-hover:border-primary/40",
    glowClass: "group-hover:glow-cyan",
  },
  {
    label: "Settings",
    description: "System configuration",
    icon: Settings,
    path: "/settings",
    accentClass: "group-hover:text-muted-foreground group-hover:border-muted-foreground/30",
    glowClass: "",
  },
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-12 text-center"
      >
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-wider text-foreground mb-2">
          ROV CONTROL SYSTEM
        </h1>
        <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-primary to-transparent mb-3" />
        <p className="text-sm text-muted-foreground font-mono tracking-wide">
          SELECT OPERATIONAL MODE
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-2xl">
        {options.map((opt, i) => (
          <motion.button
            key={opt.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 * i }}
            onClick={() => navigate(opt.path)}
            className={cn(
              "group relative flex flex-col items-center gap-4 rounded-xl border border-border bg-card/80 backdrop-blur-sm p-8 text-center transition-all duration-300 hover:bg-secondary/50 cursor-pointer",
              opt.glowClass
            )}
          >
            <div
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-full border-2 border-border bg-secondary/50 transition-all duration-300",
                opt.accentClass
              )}
            >
              <opt.icon className="h-8 w-8 text-muted-foreground transition-colors duration-300 group-hover:text-inherit" />
            </div>
            <div>
              <h2 className="font-display text-sm font-bold tracking-wider text-foreground mb-1">
                {opt.label}
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {opt.description}
              </p>
            </div>
            <div className="absolute inset-0 rounded-xl border-2 border-transparent transition-all duration-300 group-hover:border-primary/20" />
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default Index;
