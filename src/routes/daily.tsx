import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

function DailyPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dates = useStore(() => activityStore.allDates());
  const today = format(new Date(), "yyyy-MM-dd");
  const todayStats = useStore(() => activityStore.forDate(today));

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
            <CardContent className="p-4 text-center">
              <div className="text-2xl">{m.emoji}</div>
              <div className="mt-1 text-2xl font-bold tabular-nums">
                {todayStats[m.key as keyof DayAgg]}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">{m.label}</div>
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
