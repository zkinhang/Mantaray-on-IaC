import { useState } from "react";
import { Plus, FileCode, Play, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface Programme {
  id: string;
  name: string;
  filePath: string;
  status: "idle" | "running" | "completed" | "error";
}

interface ProgrammeLoaderProps {
  title: string;
}

export const ProgrammeLoader = ({ title }: ProgrammeLoaderProps) => {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFilePath, setNewFilePath] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addProgramme = () => {
    if (!newName.trim()) return;
    const prog: Programme = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      filePath: newFilePath.trim(),
      status: "idle",
    };
    setProgrammes((prev) => [...prev, prog]);
    setNewName("");
    setNewFilePath("");
    setShowAddDialog(false);
  };

  const removeProgramme = (id: string) => {
    setProgrammes((prev) => prev.filter((p) => p.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const runProgramme = (id: string) => {
    setProgrammes((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "running" as const } : p))
    );
    // Simulate completion after 2s — replace with real ROS call
    setTimeout(() => {
      setProgrammes((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, status: "completed" as const } : p
        )
      );
    }, 2000);
  };

  const statusColor = (s: Programme["status"]) => {
    if (s === "running") return "bg-yellow-500";
    if (s === "completed") return "bg-green-500";
    if (s === "error") return "bg-destructive";
    return "bg-muted-foreground/40";
  };

  return (
    <div className="control-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold tracking-wider text-primary">
          {title} — PROGRAMMES
        </h3>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          ADD PROGRAMME
        </Button>
      </div>

      {programmes.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          No programmes loaded. Press "ADD PROGRAMME" to begin.
        </p>
      )}

      <div className="space-y-2">
        {programmes.map((prog) => (
          <div key={prog.id} className="rounded-md border border-border bg-card">
            {/* Programme header row */}
            <button
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/50"
              onClick={() =>
                setExpandedId(expandedId === prog.id ? null : prog.id)
              }
            >
              <span
                className={`h-2 w-2 rounded-full ${statusColor(prog.status)}`}
              />
              <FileCode className="h-4 w-4 text-primary shrink-0" />
              <span className="flex-1 text-sm font-medium truncate">
                {prog.name}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {prog.status}
              </span>
            </button>

            {/* Expanded sub-panel */}
            {expandedId === prog.id && (
              <div className="border-t border-border px-3 py-3 space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    File / Path
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={prog.filePath}
                      placeholder="/path/to/programme_file"
                      className="h-8 text-xs font-mono"
                      onChange={(e) =>
                        setProgrammes((prev) =>
                          prev.map((p) =>
                            p.id === prog.id
                              ? { ...p, filePath: e.target.value }
                              : p
                          )
                        )
                      }
                    />
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 shrink-0">
                      <Upload className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="gap-1.5 flex-1"
                    disabled={prog.status === "running"}
                    onClick={() => runProgramme(prog.id)}
                  >
                    <Play className="h-3.5 w-3.5" />
                    RUN
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1.5"
                    onClick={() => removeProgramme(prog.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Programme Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Programme</DialogTitle>
            <DialogDescription>
              Name your programme and specify the file or path to execute.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Programme Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Stabilise Heading"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">File / Path</label>
              <Input
                value={newFilePath}
                onChange={(e) => setNewFilePath(e.target.value)}
                placeholder="/home/ros/scripts/stabilise.py"
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={addProgramme} disabled={!newName.trim()}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
