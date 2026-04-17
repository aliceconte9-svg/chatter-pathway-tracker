import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Trophy } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { experimentsStore, uid, type Experiment } from "@/lib/storage";
import { useStore } from "@/hooks/use-storage";
import { currentWeekKey, weekLabel, pct, lastNWeeks } from "@/lib/week";

export const Route = createFileRoute("/experiments")({
  head: () => ({
    meta: [
      { title: "Experiments — Chatter Tracker" },
      {
        name: "description",
        content: "Run weekly A/B tests on openers and messages. Winner stays, loser dies.",
      },
    ],
  }),
  component: ExperimentsPage,
});

const METRICS: { value: Experiment["metric"]; label: string }[] = [
  { value: "replyRate", label: "Reply rate" },
  { value: "convoRate", label: "Conversation rate" },
  { value: "bookingRate", label: "Booking rate" },
  { value: "closeRate", label: "Close rate" },
];

const emptyForm = (): Experiment => ({
  id: uid(),
  weekKey: currentWeekKey(),
  hypothesis: "",
  metric: "replyRate",
  variantAName: "Variant A",
  variantADms: 0,
  variantAReplies: 0,
  variantAConvos: 0,
  variantABooked: 0,
  variantASales: 0,
  variantBName: "Variant B",
  variantBDms: 0,
  variantBReplies: 0,
  variantBConvos: 0,
  variantBBooked: 0,
  variantBSales: 0,
  notes: "",
});

function metricRate(x: Experiment, side: "A" | "B"): number {
  const v =
    side === "A"
      ? {
          dms: x.variantADms,
          replies: x.variantAReplies,
          convos: x.variantAConvos,
          booked: x.variantABooked,
          sales: x.variantASales,
        }
      : {
          dms: x.variantBDms,
          replies: x.variantBReplies,
          convos: x.variantBConvos,
          booked: x.variantBBooked,
          sales: x.variantBSales,
        };
  switch (x.metric) {
    case "replyRate":
      return pct(v.replies, v.dms);
    case "convoRate":
      return pct(v.convos, v.replies);
    case "bookingRate":
      return pct(v.booked, v.replies);
    case "closeRate":
      return pct(v.sales, v.dms);
  }
}

function ExperimentsPage() {
  const all = useStore(() => experimentsStore.list());
  const [form, setForm] = useState<Experiment>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const sorted = useMemo(
    () => [...all].sort((a, b) => b.weekKey.localeCompare(a.weekKey)),
    [all],
  );

  const weeks = useMemo(() => lastNWeeks(12).reverse(), []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.hypothesis.trim()) {
      toast.error("Hypothesis is required");
      return;
    }
    experimentsStore.upsert(form);
    toast.success(editing ? "Experiment updated" : "Experiment created");
    setForm(emptyForm());
    setEditing(false);
    setShowForm(false);
  }

  function edit(x: Experiment) {
    setForm({ ...x });
    setEditing(true);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function remove(id: string) {
    if (!confirm("Delete this experiment?")) return;
    experimentsStore.remove(id);
    toast.success("Deleted");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Experiments</h1>
          <p className="text-sm text-muted-foreground">
            One test per week. Winner stays, loser dies.
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(emptyForm());
            setEditing(false);
            setShowForm((s) => !s);
          }}
        >
          <Plus className="h-4 w-4" />
          {showForm ? "Close" : "New experiment"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editing ? "Edit experiment" : "New experiment"}
            </CardTitle>
            <CardDescription>
              State a clear hypothesis, split your DMs, measure one metric.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Week</Label>
                  <Select
                    value={form.weekKey}
                    onValueChange={(v) => setForm((f) => ({ ...f, weekKey: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {weeks.map((w) => (
                        <SelectItem key={w} value={w}>
                          {weekLabel(w)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Metric to measure</Label>
                  <Select
                    value={form.metric}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, metric: v as Experiment["metric"] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {METRICS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hypothesis">Hypothesis</Label>
                <Textarea
                  id="hypothesis"
                  rows={2}
                  value={form.hypothesis}
                  onChange={(e) => setForm((f) => ({ ...f, hypothesis: e.target.value }))}
                  placeholder="A shorter, curiosity-based opener will improve reply rate"
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <VariantBlock
                  label="A"
                  name={form.variantAName}
                  dms={form.variantADms}
                  replies={form.variantAReplies}
                  convos={form.variantAConvos}
                  booked={form.variantABooked}
                  sales={form.variantASales}
                  onChange={(patch) => setForm((f) => ({ ...f, ...rename(patch, "A") }))}
                />
                <VariantBlock
                  label="B"
                  name={form.variantBName}
                  dms={form.variantBDms}
                  replies={form.variantBReplies}
                  convos={form.variantBConvos}
                  booked={form.variantBBooked}
                  sales={form.variantBSales}
                  onChange={(patch) => setForm((f) => ({ ...f, ...rename(patch, "B") }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes / what you learned</Label>
                <Textarea
                  id="notes"
                  rows={2}
                  value={form.notes ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>

              <div className="flex items-center gap-2">
                <Button type="submit">{editing ? "Save changes" : "Create"}</Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowForm(false);
                    setEditing(false);
                    setForm(emptyForm());
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <h2 className="text-lg font-semibold">No experiments yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Each week, pick one thing to test. Split your DMs into A vs B and let the data decide.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sorted.map((x) => {
            const a = metricRate(x, "A");
            const b = metricRate(x, "B");
            const winner = a === b ? null : a > b ? "A" : "B";
            const metricLabel = METRICS.find((m) => m.value === x.metric)?.label ?? x.metric;
            return (
              <Card key={x.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{weekLabel(x.weekKey)}</Badge>
                      <Badge variant="outline">{metricLabel}</Badge>
                    </div>
                    <CardTitle className="text-base">{x.hypothesis}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => edit(x)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(x.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ResultBlock
                      label={x.variantAName}
                      rate={a}
                      isWinner={winner === "A"}
                      metric={metricLabel}
                    />
                    <ResultBlock
                      label={x.variantBName}
                      rate={b}
                      isWinner={winner === "B"}
                      metric={metricLabel}
                    />
                  </div>
                  {x.notes && (
                    <p className="mt-3 text-sm text-muted-foreground">{x.notes}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

type VariantPatch = {
  name?: string;
  dms?: number;
  replies?: number;
  convos?: number;
  booked?: number;
  sales?: number;
};

function rename(patch: VariantPatch, side: "A" | "B"): Partial<Experiment> {
  const out: Partial<Experiment> = {};
  if (patch.name !== undefined) out[`variant${side}Name` as const] = patch.name;
  if (patch.dms !== undefined) out[`variant${side}Dms` as const] = patch.dms;
  if (patch.replies !== undefined) out[`variant${side}Replies` as const] = patch.replies;
  if (patch.convos !== undefined) out[`variant${side}Convos` as const] = patch.convos;
  if (patch.booked !== undefined) out[`variant${side}Booked` as const] = patch.booked;
  if (patch.sales !== undefined) out[`variant${side}Sales` as const] = patch.sales;
  return out;
}

function VariantBlock({
  label,
  name,
  dms,
  replies,
  convos,
  booked,
  sales,
  onChange,
}: {
  label: string;
  name: string;
  dms: number;
  replies: number;
  convos: number;
  booked: number;
  sales: number;
  onChange: (patch: VariantPatch) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Badge>{label}</Badge>
        <Input
          value={name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder={`Variant ${label} name`}
          className="h-8"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumField label="DMs" value={dms} onChange={(v) => onChange({ dms: v })} />
        <NumField label="Replies" value={replies} onChange={(v) => onChange({ replies: v })} />
        <NumField label="Convos" value={convos} onChange={(v) => onChange({ convos: v })} />
        <NumField label="Booked" value={booked} onChange={(v) => onChange({ booked: v })} />
        <NumField label="Sales" value={sales} onChange={(v) => onChange({ sales: v })} />
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="h-8"
      />
    </div>
  );
}

function ResultBlock({
  label,
  rate,
  isWinner,
  metric,
}: {
  label: string;
  rate: number;
  isWinner: boolean;
  metric: string;
}) {
  return (
    <div
      className={
        "rounded-lg border p-3 " +
        (isWinner
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-border bg-muted/30")
      }
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {isWinner && (
          <Badge className="gap-1 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20">
            <Trophy className="h-3 w-3" /> Winner
          </Badge>
        )}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{rate.toFixed(1)}%</div>
      <div className="text-xs text-muted-foreground">{metric}</div>
    </div>
  );
}
