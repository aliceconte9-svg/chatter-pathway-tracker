import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Trash2, Pencil, Plus } from "lucide-react";

import { Link } from "@tanstack/react-router";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  dailyStore,
  leadsStore,
  uid,
  type DailyEntry,
  type ContactStage,
} from "@/lib/storage";
import { useStore } from "@/hooks/use-storage";

const STAGE_COLORS: Record<ContactStage, string> = {
  "Messaggio mandato": "bg-slate-500/15 text-slate-600 dark:text-slate-400",
  "Conversazione iniziata": "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  "Follow-up mandato": "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  "Da ricontattare": "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

export const Route = createFileRoute("/daily")({
  head: () => ({
    meta: [
      { title: "Daily Log — Chatter Tracker" },
      { name: "description", content: "Log today's outreach numbers." },
    ],
  }),
  component: DailyPage,
});

const FIELDS: { key: keyof Omit<DailyEntry, "id" | "date" | "note">; label: string }[] = [
  { key: "dms", label: "DMs sent" },
  { key: "replies", label: "Replies" },
  { key: "convos", label: "Convos started" },
  { key: "qualified", label: "Qualified leads" },
  { key: "booked", label: "Calls booked" },
  { key: "showed", label: "Calls showed" },
  { key: "sales", label: "Sales closed" },
];

const emptyForm = (): DailyEntry => ({
  id: uid(),
  date: format(new Date(), "yyyy-MM-dd"),
  dms: 0,
  replies: 0,
  convos: 0,
  qualified: 0,
  booked: 0,
  showed: 0,
  sales: 0,
  note: "",
});

function DailyPage() {
  const entries = useStore(() => dailyStore.list());
  const [form, setForm] = useState<DailyEntry>(emptyForm);
  const [editing, setEditing] = useState(false);

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  function setNum(key: keyof DailyEntry, v: string) {
    const n = Math.max(0, Math.floor(Number(v) || 0));
    setForm((f) => ({ ...f, [key]: n }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    dailyStore.upsert(form);
    toast.success(editing ? "Entry updated" : "Day logged");
    setForm(emptyForm());
    setEditing(false);
  }

  function edit(entry: DailyEntry) {
    setForm({ ...entry });
    setEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function remove(id: string) {
    if (!confirm("Delete this entry?")) return;
    dailyStore.remove(id);
    toast.success("Deleted");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Daily Log</h1>
        <p className="text-sm text-muted-foreground">
          Log each day's outreach. Weekly totals update automatically.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" />
            {editing ? "Edit entry" : "New entry"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {FIELDS.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label htmlFor={f.key}>{f.label}</Label>
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
            <div className="space-y-1.5">
              <Label htmlFor="note">What I changed today (optional)</Label>
              <Textarea
                id="note"
                placeholder="New opener, switched niche, tested voice notes..."
                value={form.note ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit">{editing ? "Save changes" : "Add entry"}</Button>
              {editing && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setForm(emptyForm());
                    setEditing(false);
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">History ({entries.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {sorted.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              No entries yet. Log your first day above.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">DMs</TableHead>
                  <TableHead className="text-right">Replies</TableHead>
                  <TableHead className="text-right">Convos</TableHead>
                  <TableHead className="text-right">Qual.</TableHead>
                  <TableHead className="text-right">Booked</TableHead>
                  <TableHead className="text-right">Showed</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap font-medium">
                      {format(new Date(e.date), "EEE, MMM d")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{e.dms}</TableCell>
                    <TableCell className="text-right tabular-nums">{e.replies}</TableCell>
                    <TableCell className="text-right tabular-nums">{e.convos}</TableCell>
                    <TableCell className="text-right tabular-nums">{e.qualified}</TableCell>
                    <TableCell className="text-right tabular-nums">{e.booked}</TableCell>
                    <TableCell className="text-right tabular-nums">{e.showed}</TableCell>
                    <TableCell className="text-right tabular-nums">{e.sales}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => edit(e)}
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => remove(e.id)}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
