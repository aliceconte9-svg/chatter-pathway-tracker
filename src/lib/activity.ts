// Automatic activity tracking — records lead events for the daily tracker.
// Each event is recorded once per lead per stage.

import { cloudSync } from "./storage";

export type ActivityEventType =
  | "new_lead"
  | "contacted"
  | "conversation_started"
  | "qualified"
  | "call_booked"
  | "closed_won";

export type ActivityEvent = {
  leadId: string;
  date: string; // ISO yyyy-MM-dd
  event: ActivityEventType;
};

const KEY = "chatter:activity";

function read(): ActivityEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ActivityEvent[]) : [];
  } catch {
    return [];
  }
}

function write(events: ActivityEvent[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(events));
  window.dispatchEvent(new CustomEvent("chatter:storage"));
  void cloudSync.push(KEY, events);
}

export const activityStore = {
  list: () => read(),

  /** Record an event — deduplicates by leadId + event type (only once per stage per lead) */
  record(leadId: string, event: ActivityEventType) {
    const all = read();
    const exists = all.some((e) => e.leadId === leadId && e.event === event);
    if (exists) return;
    const today = new Date().toISOString().slice(0, 10);
    all.push({ leadId, date: today, event });
    write(all);
  },

  /** Get aggregated counts for a specific date */
  forDate(date: string) {
    const events = read().filter((e) => e.date === date);
    return {
      newLeads: events.filter((e) => e.event === "new_lead").length,
      contacted: events.filter((e) => e.event === "contacted").length,
      conversationsStarted: events.filter((e) => e.event === "conversation_started").length,
      qualified: events.filter((e) => e.event === "qualified").length,
      callsBooked: events.filter((e) => e.event === "call_booked").length,
      sales: events.filter((e) => e.event === "closed_won").length,
    };
  },

  /** Get all unique dates with activity, sorted desc */
  allDates(): string[] {
    const dates = new Set(read().map((e) => e.date));
    return [...dates].sort((a, b) => b.localeCompare(a));
  },
};