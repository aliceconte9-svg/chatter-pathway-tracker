import { startOfWeek, endOfWeek, format, parseISO, addWeeks, isWithinInterval } from "date-fns";
import type { DailyEntry } from "./storage";

// Weeks start Monday.
const WEEK_OPTS = { weekStartsOn: 1 as const };

export function weekKey(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(startOfWeek(d, WEEK_OPTS), "yyyy-MM-dd");
}

export function weekRange(key: string) {
  const start = parseISO(key);
  const end = endOfWeek(start, WEEK_OPTS);
  return { start, end };
}

export function weekLabel(key: string) {
  const { start, end } = weekRange(key);
  return `${format(start, "MMM d")} – ${format(end, "MMM d")}`;
}

export type WeekTotals = {
  weekKey: string;
  dms: number;
  replies: number;
  convos: number;
  qualified: number;
  booked: number;
  showed: number;
  sales: number;
};

export function aggregateByWeek(entries: DailyEntry[]): WeekTotals[] {
  const map = new Map<string, WeekTotals>();
  for (const e of entries) {
    const key = weekKey(e.date);
    const cur = map.get(key) ?? {
      weekKey: key,
      dms: 0,
      replies: 0,
      convos: 0,
      qualified: 0,
      booked: 0,
      showed: 0,
      sales: 0,
    };
    cur.dms += e.dms;
    cur.replies += e.replies;
    cur.convos += e.convos;
    cur.qualified += e.qualified;
    cur.booked += e.booked;
    cur.showed += e.showed;
    cur.sales += e.sales;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => a.weekKey.localeCompare(b.weekKey));
}

export function currentWeekKey() {
  return weekKey(new Date());
}

export function lastNWeeks(n: number): string[] {
  const out: string[] = [];
  const start = startOfWeek(new Date(), WEEK_OPTS);
  for (let i = n - 1; i >= 0; i--) {
    out.push(format(addWeeks(start, -i), "yyyy-MM-dd"));
  }
  return out;
}

export function pct(num: number, den: number): number {
  if (!den) return 0;
  return (num / den) * 100;
}

export function fmtPct(num: number, den: number): string {
  if (!den) return "—";
  return `${pct(num, den).toFixed(1)}%`;
}

export function isInWeek(dateISO: string, key: string) {
  const { start, end } = weekRange(key);
  return isWithinInterval(parseISO(dateISO), { start, end });
}
