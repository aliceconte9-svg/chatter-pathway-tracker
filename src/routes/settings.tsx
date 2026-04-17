import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Download, Upload, RotateCcw } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  targetsStore,
  DEFAULT_TARGETS,
  exportAll,
  importAll,
  type Targets,
} from "@/lib/storage";
import { useStore } from "@/hooks/use-storage";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Chatter Tracker" },
      { name: "description", content: "Set weekly targets and manage your data." },
    ],
  }),
  component: SettingsPage,
});

const FIELDS: { key: keyof Targets; label: string; suffix?: string }[] = [
  { key: "dms", label: "DMs / week" },
  { key: "replyRate", label: "Reply rate", suffix: "%" },
  { key: "qualified", label: "Qualified leads / week" },
  { key: "booked", label: "Calls booked / week" },
  { key: "showed", label: "Calls showed / week" },
  { key: "sales", label: "Sales closed / week" },
];

function SettingsPage() {
  const stored = useStore(() => targetsStore.get());
  const [form, setForm] = useState<Targets>(stored);
  const fileRef = useRef<HTMLInputElement>(null);

  function setNum(key: keyof Targets, v: string) {
    const n = Math.max(0, Number(v) || 0);
    setForm((f) => ({ ...f, [key]: n }));
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    targetsStore.set(form);
    toast.success("Targets saved");
  }

  function reset() {
    setForm(DEFAULT_TARGETS);
    targetsStore.set(DEFAULT_TARGETS);
    toast.success("Reset to defaults");
  }

  function doExport() {
    const data = exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chatter-tracker-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported");
  }

  function doImport(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        importAll(data);
        toast.success("Imported successfully");
      } catch {
        toast.error("Invalid file");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Set weekly goals and back up your data.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly targets</CardTitle>
          <CardDescription>
            Goals used to color-code weekly performance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FIELDS.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label htmlFor={f.key}>
                    {f.label}
                    {f.suffix ? ` (${f.suffix})` : ""}
                  </Label>
                  <Input
                    id={f.key}
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={form[f.key]}
                    onChange={(e) => setNum(f.key, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit">Save targets</Button>
              <Button type="button" variant="outline" onClick={reset}>
                <RotateCcw className="h-4 w-4" />
                Reset defaults
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Backup & restore</CardTitle>
          <CardDescription>
            Data lives in your browser. Export regularly so you don't lose it if cache clears.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={doExport}>
              <Download className="h-4 w-4" />
              Export JSON
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" />
              Import JSON
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) doImport(file);
                e.target.value = "";
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
