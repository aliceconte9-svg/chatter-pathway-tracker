import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import { TrendingUp, TrendingDown, ArrowRight, AlertCircle, Target, Send, Inbox, AlarmClock } from "lucide-react";

import { findBottleneck } from "@/lib/bottleneck";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import { dailyStore, leadsStore, targetsStore, type Lead, type LeadStatus } from "@/lib/storage";
import { useStore } from "@/hooks/use-storage";
import { LeadRowActions } from "@/components/leads/LeadRowActions";
import {
  aggregateByWeek,
  currentWeekKey,
  lastNWeeks,
  weekLabel,
  pct,
  fmtPct,
} from "@/lib/week";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Chatter Tracker" },
      { name: "description", content: "Today's follow-ups, weekly KPIs, trends, funnel and objections." },
    ],
  }),
  component: DashboardPage,
});

const STATUS_COLORS: Record<LeadStatus, string> = {
  New: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
  Contacted: "bg-muted text-foreground",
  Replied: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  "In Conversation": "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
  Qualified: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  "Call Booked": "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  "Closed Won": "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "Closed Lost": "bg-destructive/15 text-destructive",
};

function DashboardPage() {
  const entries = useStore(() => dailyStore.list());
  const leads = useStore(() => leadsStore.list());
  const targets = useStore(() => targetsStore.get());

  const weekly = useMemo(() => aggregateByWeek(entries), [entries]);
  const thisKey = currentWeekKey();
  const thisWeek =
    weekly.find((w) => w.weekKey === thisKey) ??
    {
      weekKey: thisKey,
      dms: 0,
      replies: 0,
      convos: 0,
      qualified: 0,
      booked: 0,
      showed: 0,
      sales: 0,
    };

  const hasData = entries.length > 0;

  // Trend: last 8 weeks
  const trend = useMemo(() => {
    const keys = lastNWeeks(8);
    return keys.map((k) => {
      const w = weekly.find((x) => x.weekKey === k);
      return {
        week: weekLabel(k).split(" – ")[0],
        replyRate: w ? pct(w.replies, w.dms) : 0,
        bookingRate: w ? pct(w.booked, w.qualified) : 0,
        closeRate: w ? pct(w.sales, w.showed) : 0,
      };
    });
  }, [weekly]);

  // Funnel for current week
  const funnel = [
    { stage: "DMs", value: thisWeek.dms },
    { stage: "Replies", value: thisWeek.replies },
    { stage: "Convos", value: thisWeek.convos },
    { stage: "Qualified", value: thisWeek.qualified },
    { stage: "Booked", value: thisWeek.booked },
    { stage: "Showed", value: thisWeek.showed },
    { stage: "Closed", value: thisWeek.sales },
  ];
  const funnelMax = Math.max(...funnel.map((f) => f.value), 1);

  // Objections (all-time from leads)
  const objections = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of leads) {
      const key =
        l.objection === "Other" ? l.objectionCustom?.trim() || "Other" : l.objection || "";
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [leads]);

  const replyRate = pct(thisWeek.replies, thisWeek.dms);
  const bookingRate = pct(thisWeek.booked, thisWeek.qualified);
  const showRate = pct(thisWeek.showed, thisWeek.booked);
  const closeRate = pct(thisWeek.sales, thisWeek.showed);

  // Diagnostic hints
  const hints: { tone: "warn" | "ok"; msg: string }[] = [];
  if (thisWeek.dms > 0 && replyRate < targets.replyRate) {
    hints.push({
      tone: "warn",
      msg: `Reply rate ${replyRate.toFixed(1)}% is below target ${targets.replyRate}% — your opener may be weak.`,
    });
  }
  if (thisWeek.qualified > 0 && bookingRate < 50) {
    hints.push({
      tone: "warn",
      msg: `Booking rate ${bookingRate.toFixed(1)}% — many qualified leads but few booked. Tighten qualification or your pitch.`,
    });
  }
  if (thisWeek.showed > 0 && closeRate < 20) {
    hints.push({
      tone: "warn",
      msg: `Close rate ${closeRate.toFixed(1)}% — calls happening but not closing. Review objections and offer.`,
    });
  }
  if (thisWeek.booked > 0 && showRate < 60) {
    hints.push({
      tone: "warn",
      msg: `Show rate ${showRate.toFixed(1)}% — many no-shows. Send reminders before calls.`,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Week of <span className="font-medium text-foreground">{weekLabel(thisKey)}</span>
          </p>
        </div>
        <Button asChild>
          <Link to="/daily">
            Log today
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {!hasData && (
        <Card>
          <CardContent className="py-10 text-center">
            <h2 className="text-lg font-semibold">Nothing tracked yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Start logging your daily DMs, replies and calls to see your numbers come alive.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button asChild>
                <Link to="/daily">Add first entry</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/settings">Set targets</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="DMs"
          value={thisWeek.dms}
          target={targets.dms}
          format={(v) => v.toString()}
        />
        <Kpi
          label="Reply rate"
          value={replyRate}
          target={targets.replyRate}
          format={(v) => `${v.toFixed(1)}%`}
          rawSub={`${thisWeek.replies} / ${thisWeek.dms}`}
        />
        <Kpi
          label="Calls booked"
          value={thisWeek.booked}
          target={targets.booked}
          format={(v) => v.toString()}
          rawSub={`Booking rate ${fmtPct(thisWeek.booked, thisWeek.qualified)}`}
        />
        <Kpi
          label="Sales closed"
          value={thisWeek.sales}
          target={targets.sales}
          format={(v) => v.toString()}
          rawSub={`Close rate ${fmtPct(thisWeek.sales, thisWeek.showed)}`}
        />
      </div>

      {hasData && <BottleneckCard week={thisWeek} targets={targets} />}

      {hints.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Diagnosis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm">
              {hints.map((h, i) => (
                <li key={i} className="text-foreground">
                  {h.msg}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rate trends — last 8 weeks</CardTitle>
            <CardDescription>Reply, booking and close rates over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} unit="%" />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => `${v.toFixed(1)}%`}
                  />
                  <Line
                    type="monotone"
                    dataKey="replyRate"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    name="Reply"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="bookingRate"
                    stroke="var(--chart-2)"
                    strokeWidth={2}
                    name="Booking"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="closeRate"
                    stroke="var(--chart-4)"
                    strokeWidth={2}
                    name="Close"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <LegendDot color="var(--chart-1)" label="Reply rate" />
              <LegendDot color="var(--chart-2)" label="Booking rate" />
              <LegendDot color="var(--chart-4)" label="Close rate" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Funnel — this week</CardTitle>
            <CardDescription>Where prospects drop off</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {funnel.map((f, i) => {
                const widthPct = (f.value / funnelMax) * 100;
                const prev = i > 0 ? funnel[i - 1].value : f.value;
                const conversion = i > 0 ? fmtPct(f.value, prev) : "—";
                return (
                  <div key={f.stage} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{f.stage}</span>
                      <span className="text-muted-foreground">
                        {f.value}{" "}
                        {i > 0 && (
                          <span className="ml-1 text-muted-foreground/70">({conversion})</span>
                        )}
                      </span>
                    </div>
                    <div className="h-6 overflow-hidden rounded-md bg-muted">
                      <div
                        className="h-full rounded-md bg-primary transition-all"
                        style={{ width: `${Math.max(widthPct, f.value > 0 ? 2 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Objections — all leads</CardTitle>
          <CardDescription>Most common reasons people don't buy</CardDescription>
        </CardHeader>
        <CardContent>
          {objections.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No objections logged yet. Add them on{" "}
              <Link to="/leads" className="underline hover:text-foreground">
                leads
              </Link>
              .
            </p>
          ) : (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={objections} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {objections.map((_, i) => (
                      <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  label,
  value,
  target,
  format,
  rawSub,
}: {
  label: string;
  value: number;
  target: number;
  format: (v: number) => string;
  rawSub?: string;
}) {
  const pctOfTarget = target > 0 ? (value / target) * 100 : 0;
  const ok = target > 0 && value >= target;
  const Icon = ok ? TrendingUp : TrendingDown;
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
          {target > 0 && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                ok
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-destructive/15 text-destructive",
              )}
            >
              <Icon className="h-3 w-3" />
              {pctOfTarget.toFixed(0)}%
            </span>
          )}
        </div>
        <div className="mt-1 text-2xl font-bold tabular-nums">{format(value)}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {rawSub ?? `Target ${format(target)}`}
        </div>
      </CardContent>
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function BottleneckCard({
  week,
  targets,
}: {
  week: import("@/lib/week").WeekTotals;
  targets: import("@/lib/storage").Targets;
}) {
  const b = findBottleneck(week, targets);
  const isGreen = b.step === "none";
  return (
    <Card
      className={cn(
        "border-l-4",
        isGreen
          ? "border-l-emerald-500 bg-emerald-500/5"
          : "border-l-primary bg-primary/5",
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className={cn("h-4 w-4", isGreen ? "text-emerald-600" : "text-primary")} />
          Bottleneck this week — {b.title}
        </CardTitle>
        <CardDescription>{b.diagnosis}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isGreen && b.target > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Current {b.rate.toFixed(1)}%</span>
              <span>Target {b.target.toFixed(0)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${Math.min(100, Math.max(2, (b.rate / b.target) * 100))}%`,
                }}
              />
            </div>
          </div>
        )}
        <div className="rounded-md bg-background/60 p-3 text-sm">
          <span className="font-semibold">Fix: </span>
          {b.fix}
        </div>
      </CardContent>
    </Card>
  );
}
