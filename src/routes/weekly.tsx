import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { dailyStore, targetsStore } from "@/lib/storage";
import { useStore } from "@/hooks/use-storage";
import { aggregateByWeek, weekLabel, pct, fmtPct } from "@/lib/week";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/weekly")({
  head: () => ({
    meta: [
      { title: "Weekly Review — Chatter Tracker" },
      { name: "description", content: "Week-by-week totals with rates and target tracking." },
    ],
  }),
  component: WeeklyPage,
});

function rateCell(value: number, target: number, suffix = "%") {
  const ok = value >= target;
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium tabular-nums",
        target === 0
          ? "text-muted-foreground"
          : ok
            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            : "bg-destructive/15 text-destructive",
      )}
    >
      {value.toFixed(1)}
      {suffix}
    </span>
  );
}

function countCell(value: number, target: number) {
  const ok = value >= target;
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium tabular-nums",
        target === 0
          ? "text-muted-foreground"
          : ok
            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            : "bg-destructive/15 text-destructive",
      )}
    >
      {value} / {target}
    </span>
  );
}

function WeeklyPage() {
  const entries = useStore(() => dailyStore.list());
  const targets = useStore(() => targetsStore.get());
  const weeks = useMemo(() => aggregateByWeek(entries).reverse(), [entries]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Weekly Review</h1>
        <p className="text-sm text-muted-foreground">
          Each row is a Mon–Sun week. Green = met target, red = below.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weeks ({weeks.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {weeks.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              No data yet. Add daily entries to see weekly rollups.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Week</TableHead>
                  <TableHead className="text-right">DMs</TableHead>
                  <TableHead className="text-right">Reply rate</TableHead>
                  <TableHead className="text-right">Qual.</TableHead>
                  <TableHead className="text-right">Booked</TableHead>
                  <TableHead className="text-right">Booking rate</TableHead>
                  <TableHead className="text-right">Showed</TableHead>
                  <TableHead className="text-right">Show rate</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">Close rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weeks.map((w) => {
                  const replyRate = pct(w.replies, w.dms);
                  const bookingRate = pct(w.booked, w.qualified);
                  const showRate = pct(w.showed, w.booked);
                  const closeRate = pct(w.sales, w.showed);
                  return (
                    <TableRow key={w.weekKey}>
                      <TableCell className="whitespace-nowrap font-medium">
                        {weekLabel(w.weekKey)}
                      </TableCell>
                      <TableCell className="text-right">{countCell(w.dms, targets.dms)}</TableCell>
                      <TableCell className="text-right">
                        {rateCell(replyRate, targets.replyRate)}
                      </TableCell>
                      <TableCell className="text-right">
                        {countCell(w.qualified, targets.qualified)}
                      </TableCell>
                      <TableCell className="text-right">
                        {countCell(w.booked, targets.booked)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {fmtPct(w.booked, w.qualified)}
                      </TableCell>
                      <TableCell className="text-right">
                        {countCell(w.showed, targets.showed)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {fmtPct(w.showed, w.booked)}
                      </TableCell>
                      <TableCell className="text-right">
                        {countCell(w.sales, targets.sales)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {fmtPct(w.sales, w.showed)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How to read this</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Reply rate low?</strong> Your opener may be weak.
          </p>
          <p>
            <strong className="text-foreground">Booking rate low?</strong> You may be qualifying
            poorly — many convos but few want a call.
          </p>
          <p>
            <strong className="text-foreground">Close rate low?</strong> Calls show up but you're
            losing them — sharpen your sales process and handle objections.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
