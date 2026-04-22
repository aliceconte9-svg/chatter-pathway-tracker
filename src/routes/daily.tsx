import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format, subDays } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { activityStore } from "@/lib/activity";
import { useStore } from "@/hooks/use-storage";

export const Route = createFileRoute("/daily")({
  head: () => ({
    meta: [
      { title: "Daily Tracker — Chatter Tracker" },
      { name: "description", content: "Automatic daily performance tracking." },
    ],
  }),
  component: DailyPage,
});

const METRICS = [
  { key: "newLeads", label: "New Leads", emoji: "🆕" },
  { key: "contacted", label: "DMs Sent", emoji: "📤" },
  { key: "conversationsStarted", label: "Convos Started", emoji: "💬" },
  { key: "qualified", label: "Qualified", emoji: "✅" },
  { key: "callsBooked", label: "Calls Booked", emoji: "📞" },
  { key: "sales", label: "Sales", emoji: "🎉" },
] as const;

type DayAgg = ReturnType<typeof activityStore.forDate>;

function getAvg7(allEvents: ReturnType<typeof activityStore.list>, today: string): DayAgg {
  const days: string[] = [];
  for (let i = 1; i <= 7; i++) {
    days.push(format(subDays(new Date(today), i), "yyyy-MM-dd"));
  }
  const totals: DayAgg = { newLeads: 0, contacted: 0, conversationsStarted: 0, qualified: 0, callsBooked: 0, sales: 0 };
  const keys = Object.keys(totals) as (keyof DayAgg)[];
  let activeDays = 0;
  for (const d of days) {
    const s = activityStore.forDate(d);
    const hasActivity = keys.some((k) => s[k] > 0);
    if (hasActivity) activeDays++;
    for (const k of keys) totals[k] += s[k];
  }
  if (activeDays > 0) {
    for (const k of keys) totals[k] = Math.round((totals[k] / activeDays) * 10) / 10;
  }
  return totals;
}

function ComparisonBadge({ current, previous, avg }: { current: number; previous: number; avg: number }) {
  const vsPrev = previous > 0 ? current - previous : null;
  const vsAvg = avg > 0 ? current - avg : null;

  return (
    <div className="mt-1 flex flex-col items-center gap-0.5">
      {vsPrev !== null && (
        <span className={`text-[10px] font-medium ${vsPrev > 0 ? "text-green-600 dark:text-green-400" : vsPrev < 0 ? "text-red-500 dark:text-red-400" : "text-muted-foreground"}`}>
          {vsPrev > 0 ? "▲" : vsPrev < 0 ? "▼" : "="} {Math.abs(vsPrev)} vs ieri
        </span>
      )}
      {vsAvg !== null && (
        <span className={`text-[10px] font-medium ${vsAvg > 0 ? "text-green-600 dark:text-green-400" : vsAvg < 0 ? "text-red-500 dark:text-red-400" : "text-muted-foreground"}`}>
          {vsAvg > 0 ? "▲" : vsAvg < 0 ? "▼" : "="} {Math.abs(Math.round(vsAvg))} vs avg 7g
        </span>
      )}
    </div>
  );
}

function DailyPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dates = useStore(() => activityStore.allDates());
  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const todayStats = useStore(() => activityStore.forDate(today));
  const yesterdayStats = useStore(() => activityStore.forDate(yesterday));
  const avg7 = useMemo(() => getAvg7([], today), [today]);

  const rows = useMemo(() => {
    return dates.map((date) => ({
      date,
      ...activityStore.forDate(date),
    }));
  }, [dates]);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Daily Tracker</h1>
        <p className="text-sm text-muted-foreground">
          Automatically tracked from your lead activity. No manual input needed.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {METRICS.map((m) => (
          <Card key={m.key}>
            <CardContent className="p-3 text-center">
              <div className="text-2xl">{m.emoji}</div>
              <div className="mt-1 text-2xl font-bold tabular-nums">
                {todayStats[m.key as keyof DayAgg]}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">{m.label}</div>
              <ComparisonBadge
                current={todayStats[m.key as keyof DayAgg]}
                previous={yesterdayStats[m.key as keyof DayAgg]}
                avg={avg7[m.key as keyof DayAgg]}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">History</CardTitle>
          <CardDescription>
            Each row is auto-generated from lead status changes and actions.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {rows.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              No activity yet. Start adding leads and marking them as contacted.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  {METRICS.map((m) => (
                    <TableHead key={m.key} className="text-right">
                      {m.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.date} className={r.date === today ? "bg-primary/5" : ""}>
                    <TableCell className="whitespace-nowrap font-medium">
                      {format(new Date(r.date), "EEE, MMM d")}
                    </TableCell>
                    {METRICS.map((m) => (
                      <TableCell key={m.key} className="text-right tabular-nums">
                        {r[m.key as keyof DayAgg]}
                      </TableCell>
                    ))}
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
