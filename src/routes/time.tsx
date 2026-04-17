import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Play, Square, Trash2, Plus, Timer } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  timeStore,
  uid,
  TIME_ACTIVITIES,
  TIME_ACTIVITY_LABELS,
  type TimeActivity,
  type TimeEntry,
} from "@/lib/storage";
import { useStore } from "@/hooks/use-storage";

export const Route = createFileRoute("/time")({
  head: () => ({
    meta: [
      { title: "Time Tracker — Chatter Tracker" },
      {
        name: "description",
        content: "Track time spent DMing, following up, and chatting.",
      },
    ],
  }),
  component: TimePage,
});

function fmt(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec
    .toString()
    .padStart(2, "0")}`;
}

function TimePage() {
  const entries = useStore(() => timeStore.list());
  const active = useStore(() => timeStore.getActive());
  const [, force] = useState(0);

  // tick every second when timer is running
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [active]);

  const today = format(new Date(), "yyyy-MM-dd");

  const todayTotals = useMemo(() => {
    const totals: Record<TimeActivity, number> = {
      dming: 0,
      followups: 0,
      chatting: 0,
    };
    for (const e of entries) {
      if (e.date === today) totals[e.activity] += e.seconds;
    }
    if (active) {
      const live = Math.floor((Date.now() - active.startedAt) / 1000);
      totals[active.activity] += live;
    }
    return totals;
  }, [entries, active, today]);

  const todayTotal = todayTotals.dming + todayTotals.followups + todayTotals.chatting;

  function start(activity: TimeActivity) {
    if (active) {
      stop();
    }
    timeStore.setActive({ activity, startedAt: Date.now() });
    toast.success(`Started: ${TIME_ACTIVITY_LABELS[activity]}`);
  }

  function stop() {
    const a = timeStore.getActive();
    if (!a) return;
    const seconds = Math.floor((Date.now() - a.startedAt) / 1000);
    if (seconds > 0) {
      timeStore.add({
        id: uid(),
        date: format(new Date(a.startedAt), "yyyy-MM-dd"),
        activity: a.activity,
        seconds,
      });
    }
    timeStore.setActive(null);
    toast.success(`Logged ${fmt(seconds)}`);
  }

  function remove(id: string) {
    if (!confirm("Delete this time entry?")) return;
    timeStore.remove(id);
    toast.success("Deleted");
  }

  // manual entry form
  const [mDate, setMDate] = useState(today);
  const [mActivity, setMActivity] = useState<TimeActivity>("dming");
  const [mMinutes, setMMinutes] = useState("");

  function addManual(e: React.FormEvent) {
    e.preventDefault();
    const min = Math.max(0, Math.floor(Number(mMinutes) || 0));
    if (min === 0) {
      toast.error("Enter minutes greater than 0");
      return;
    }
    timeStore.add({
      id: uid(),
      date: mDate,
      activity: mActivity,
      seconds: min * 60,
    });
    setMMinutes("");
    toast.success("Time logged");
  }

  const sorted = [...entries].sort((a, b) =>
    b.date === a.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Time Tracker</h1>
        <p className="text-sm text-muted-foreground">
          Start a timer for what you're doing right now, or log time manually.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {TIME_ACTIVITIES.map((act) => {
          const isActive = active?.activity === act;
          const liveSec = isActive
            ? Math.floor((Date.now() - active!.startedAt) / 1000)
            : 0;
          return (
            <Card key={act} className={isActive ? "border-primary" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {TIME_ACTIVITY_LABELS[act]}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="font-mono text-2xl tabular-nums">
                  {fmt(todayTotals[act])}
                </div>
                {isActive && (
                  <div className="text-xs text-primary">
                    Running: {fmt(liveSec)}
                  </div>
                )}
                {isActive ? (
                  <Button
                    onClick={stop}
                    variant="destructive"
                    size="sm"
                    className="w-full"
                  >
                    <Square className="mr-1.5 h-3.5 w-3.5" /> Stop
                  </Button>
                ) : (
                  <Button
                    onClick={() => start(act)}
                    size="sm"
                    className="w-full"
                  >
                    <Play className="mr-1.5 h-3.5 w-3.5" /> Start
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Timer className="h-4 w-4" /> Today total
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="font-mono text-3xl tabular-nums">{fmt(todayTotal)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" /> Log time manually
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={addManual}
            className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
          >
            <div className="space-y-1.5">
              <Label htmlFor="m-date">Date</Label>
              <Input
                id="m-date"
                type="date"
                value={mDate}
                onChange={(e) => setMDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Activity</Label>
              <Select
                value={mActivity}
                onValueChange={(v) => setMActivity(v as TimeActivity)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_ACTIVITIES.map((a) => (
                    <SelectItem key={a} value={a}>
                      {TIME_ACTIVITY_LABELS[a]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-min">Minutes</Label>
              <Input
                id="m-min"
                type="number"
                min={1}
                inputMode="numeric"
                value={mMinutes}
                onChange={(e) => setMMinutes(e.target.value)}
                placeholder="e.g. 45"
              />
            </div>
            <Button type="submit">Add</Button>
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
              No time logged yet. Start a timer above.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((e: TimeEntry) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap font-medium">
                      {format(new Date(e.date), "EEE, MMM d")}
                    </TableCell>
                    <TableCell>{TIME_ACTIVITY_LABELS[e.activity]}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {fmt(e.seconds)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => remove(e.id)}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
