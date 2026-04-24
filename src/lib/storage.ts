// Shared storage layer for the chatter tracker app.
// Data is cached in browser localStorage and synchronized with the shared backend.

export type DailyEntry = {
  id: string;
  date: string; // ISO yyyy-MM-dd
  dms: number;
  replies: number;
  convos: number;
  qualified: number;
  booked: number;
  showed: number;
  sales: number;
  note?: string;
};

export const LEAD_STATUSES = [
  "New",
  "Contacted",
  "Replied",
  "In Conversation",
  "Qualified",
  "Call Booked",
  "Closed Won",
  "Closed Lost",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

// Map legacy statuses to current ones (auto-migration on read)
const LEGACY_STATUS_MAP: Record<string, LeadStatus> = {
  Convo: "In Conversation",
  Booked: "Call Booked",
  Showed: "Call Booked",
  Closed: "Closed Won",
  Lost: "Closed Lost",
};

export const LEAD_SOURCES = ["Follower", "Storia", "Esplora", "Hashtag", "Referral", "Other"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const CONTACT_STAGES = [
  "Messaggio mandato",
  "Conversazione iniziata",
  "Follow-up 1 mandato",
  "Follow-up 2 mandato",
  "Da ricontattare",
] as const;
export type ContactStage = (typeof CONTACT_STAGES)[number];

export const OBJECTIONS = [
  "Too expensive",
  "No time",
  "Just curious",
  "Already studying",
  "Not interested",
  "Other",
] as const;
export type Objection = (typeof OBJECTIONS)[number] | "";

export type Lead = {
  id: string;
  name: string;
  igUsername?: string;
  source?: LeadSource;
  contactStage?: ContactStage;
  dateContacted: string; // ISO yyyy-MM-dd
  status: LeadStatus;
  objection?: Objection;
  objectionCustom?: string;
  bestMessage?: string;
  notes?: string;
  tags?: string[];
  // Follow-up tracking
  lastContactedAt?: string; // ISO yyyy-MM-dd — auto-updated on "mark contacted"
  nextFollowUpAt?: string; // ISO yyyy-MM-dd — manually scheduled
  // Counters & flags
  followUpCount?: number; // auto-incremented on subsequent contacts (not first)
  hotLead?: boolean; // manually toggled hot lead flag
  openerUsed?: string; // which opener/message template was used
  // Advanced metrics (optional)
  timeToFirstReplyMin?: number;
  messagesToBooking?: number;
  conversationLength?: number;
};

export type Experiment = {
  id: string;
  weekKey: string; // ISO Monday yyyy-MM-dd
  hypothesis: string;
  metric: "replyRate" | "convoRate" | "bookingRate" | "closeRate";
  variantAName: string;
  variantADms: number;
  variantAReplies: number;
  variantAConvos: number;
  variantABooked: number;
  variantASales: number;
  variantBName: string;
  variantBDms: number;
  variantBReplies: number;
  variantBConvos: number;
  variantBBooked: number;
  variantBSales: number;
  notes?: string;
};

export type PlaybookCategory = "opener" | "qualification" | "closing";
export type PlaybookEntry = {
  id: string;
  category: PlaybookCategory;
  title: string;
  body: string;
  createdAt: string; // ISO
};

export type Targets = {
  dms: number;
  replyRate: number; // percent
  qualified: number;
  booked: number;
  showed: number;
  sales: number;
};

export const DEFAULT_TARGETS: Targets = {
  dms: 600,
  replyRate: 50,
  qualified: 60,
  booked: 30,
  showed: 20,
  sales: 4,
};

export const TIME_ACTIVITIES = ["dming", "followups", "chatting"] as const;
export type TimeActivity = (typeof TIME_ACTIVITIES)[number];

export const TIME_ACTIVITY_LABELS: Record<TimeActivity, string> = {
  dming: "DMing new followers",
  followups: "Sending follow-ups",
  chatting: "Chatting with replies",
};

export type TimeEntry = {
  id: string;
  date: string; // ISO yyyy-MM-dd
  activity: TimeActivity;
  seconds: number;
  note?: string;
};

export type ActiveTimer = {
  activity: TimeActivity;
  startedAt: number; // epoch ms
} | null;

const KEYS = {
  daily: "chatter:daily",
  leads: "chatter:leads",
  targets: "chatter:targets",
  experiments: "chatter:experiments",
  playbook: "chatter:playbook",
  time: "chatter:time",
  activity: "chatter:activity",
  tags: "chatter:tags",
  activeTimer: "chatter:activeTimer",
};

const SYNCABLE_KEYS = Object.values(KEYS).filter((key) => key !== KEYS.activeTimer);

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("chatter:storage"));
  // Fire-and-forget cloud sync
  void cloudSync.push(key, value);
}

// ===== Cloud sync layer =====
// Single-user mode: data stored in public.app_data keyed by storage key.
// localStorage is kept as a fast cache, but startup merges local + cloud so no browser gets stuck with partial data.

import { supabase } from "@/integrations/supabase/client";

function safeParse(raw: string | null) {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

function mergeArrayValues(localValue: unknown[], cloudValue: unknown[]) {
  const combined = [...cloudValue, ...localValue];
  const everyItemHasId = combined.every(
    (item) => item && typeof item === "object" && "id" in item && typeof item.id === "string",
  );

  if (everyItemHasId) {
    const merged = new Map<string, Record<string, unknown>>();
    for (const item of cloudValue as Array<Record<string, unknown> & { id: string }>) {
      merged.set(item.id, item);
    }
    for (const item of localValue as Array<Record<string, unknown> & { id: string }>) {
      const previous = merged.get(item.id) ?? {};
      merged.set(item.id, { ...previous, ...item });
    }
    return [...merged.values()];
  }

  const deduped = new Map<string, unknown>();
  for (const item of combined) {
    deduped.set(JSON.stringify(item), item);
  }
  return [...deduped.values()];
}

function mergeStoredValue(key: string, localValue: unknown, cloudValue: unknown) {
  if (localValue === undefined) return cloudValue;
  if (cloudValue === undefined) return localValue;

  if (key === KEYS.tags && Array.isArray(localValue) && Array.isArray(cloudValue)) {
    return [...new Set([...(cloudValue as string[]), ...(localValue as string[])])];
  }

  if (Array.isArray(localValue) && Array.isArray(cloudValue)) {
    return mergeArrayValues(localValue, cloudValue);
  }

  if (
    localValue &&
    cloudValue &&
    typeof localValue === "object" &&
    typeof cloudValue === "object" &&
    !Array.isArray(localValue) &&
    !Array.isArray(cloudValue)
  ) {
    return { ...(cloudValue as Record<string, unknown>), ...(localValue as Record<string, unknown>) };
  }

  return localValue;
}

export const cloudSync = {
  initialized: false as boolean,
  initPromise: null as Promise<void> | null,
  subscribed: false as boolean,
  async push(key: string, value: unknown) {
    if (key === KEYS.activeTimer) return; // ephemeral, skip cloud
    try {
      await supabase.from("app_data" as any).upsert({ key, value: value as any });
    } catch (e) {
      console.warn("[cloudSync] push failed", key, e);
    }
  },
  async pullAll() {
    try {
      const { data, error } = await supabase.from("app_data" as any).select("key,value");
      if (error) throw error;
      if (!data) return;
      for (const row of data as unknown as Array<{ key: string; value: unknown }>) {
        if (Object.values(KEYS).includes(row.key)) {
          localStorage.setItem(row.key, JSON.stringify(row.value));
        }
      }
      window.dispatchEvent(new CustomEvent("chatter:storage"));
    } catch (e) {
      console.warn("[cloudSync] pullAll failed", e);
    }
  },
  async pushAllLocal() {
    // Push every known local key to cloud (used for initial migration)
    const entries: Array<[string, unknown]> = [];
    for (const k of SYNCABLE_KEYS) {
      const raw = localStorage.getItem(k);
      if (raw) {
        try {
          entries.push([k, JSON.parse(raw)]);
        } catch {}
      }
    }
    if (entries.length === 0) return 0;
    try {
      const rows = entries.map(([key, value]) => ({ key, value: value as any }));
      const { error } = await supabase.from("app_data" as any).upsert(rows);
      if (error) throw error;
      return rows.length;
    } catch (e) {
      console.warn("[cloudSync] pushAllLocal failed", e);
      return 0;
    }
  },
  async init() {
    if (typeof window === "undefined") return;
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const { data, error } = await supabase.from("app_data" as any).select("key,value");
        if (error) throw error;

        const cloudEntries = new Map<string, unknown>();
        const safeRows = (data ?? []) as unknown as Array<{ key: string; value: unknown }>;
        for (const row of safeRows) {
          cloudEntries.set(row.key, row.value);
        }

        const rowsToUpsert: Array<{ key: string; value: unknown }> = [];
        let localChanged = false;

        for (const key of SYNCABLE_KEYS) {
          const localValue = safeParse(localStorage.getItem(key));
          const cloudValue = cloudEntries.get(key);
          const mergedValue = mergeStoredValue(key, localValue, cloudValue);

          if (mergedValue === undefined) continue;

          const mergedJson = JSON.stringify(mergedValue);
          if (localStorage.getItem(key) !== mergedJson) {
            localStorage.setItem(key, mergedJson);
            localChanged = true;
          }

          if (JSON.stringify(cloudValue) !== mergedJson) {
            rowsToUpsert.push({ key, value: mergedValue });
          }
        }

        if (rowsToUpsert.length > 0) {
          const { error: upsertError } = await supabase.from("app_data" as any).upsert(rowsToUpsert);
          if (upsertError) throw upsertError;
        }

        if (localChanged || rowsToUpsert.length > 0) {
          window.dispatchEvent(new CustomEvent("chatter:storage"));
        }

        if (!this.subscribed) {
          this.subscribed = true;
          supabase
            .channel("app_data_changes")
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "app_data" },
              (payload: any) => {
                const row = payload.new ?? payload.old;
                if (!row?.key) return;
                if (payload.eventType === "DELETE") {
                  localStorage.removeItem(row.key);
                } else {
                  localStorage.setItem(row.key, JSON.stringify(row.value));
                }
                window.dispatchEvent(new CustomEvent("chatter:storage"));
              },
            )
            .subscribe();
        }

        this.initialized = true;
      } catch (e) {
        console.warn("[cloudSync] init failed", e);
        this.initialized = false;
      } finally {
        this.initPromise = null;
        window.dispatchEvent(new CustomEvent("chatter:cloud-ready"));
      }
    })();

    return this.initPromise;
  },
};

export const dailyStore = {
  list: () => read<DailyEntry[]>(KEYS.daily, []),
  save: (entries: DailyEntry[]) => write(KEYS.daily, entries),
  upsert(entry: DailyEntry) {
    const all = dailyStore.list();
    const idx = all.findIndex((e) => e.id === entry.id);
    if (idx >= 0) all[idx] = entry;
    else all.push(entry);
    dailyStore.save(all);
  },
  remove(id: string) {
    dailyStore.save(dailyStore.list().filter((e) => e.id !== id));
  },
};

function migrateLead(l: Lead): Lead {
  // Migrate legacy contact stages
  let contactStage = l.contactStage;
  if (contactStage === ("Follow-up mandato" as any)) {
    contactStage = "Follow-up 1 mandato";
  }
  const mapped = LEGACY_STATUS_MAP[l.status as unknown as string];
  const status = mapped ?? l.status;
  return {
    ...l,
    status,
    contactStage,
    lastContactedAt: l.lastContactedAt ?? l.dateContacted,
  };
}

export const leadsStore = {
  list: () => read<Lead[]>(KEYS.leads, []).map(migrateLead),
  save: (leads: Lead[]) => write(KEYS.leads, leads),
  upsert(lead: Lead) {
    const all = leadsStore.list();
    const idx = all.findIndex((l) => l.id === lead.id);
    if (idx >= 0) {
      const old = all[idx];
      all[idx] = lead;
      leadsStore.save(all);
      _trackStatusChange(old, lead);
      return;
    }
    all.push(lead);
    leadsStore.save(all);
    _recordActivity(lead.id, "new_lead");
  },
  remove(id: string) {
    leadsStore.save(leadsStore.list().filter((l) => l.id !== id));
  },
  markContacted(id: string) {
    const all = leadsStore.list();
    const idx = all.findIndex((l) => l.id === id);
    if (idx < 0) return;
    const today = new Date().toISOString().slice(0, 10);
    const lead = all[idx];
    const isFollowUp = lead.status !== "New";
    all[idx] = {
      ...lead,
      lastContactedAt: today,
      status: lead.status === "New" ? "Contacted" : lead.status,
      contactStage:
        lead.contactStage === "Messaggio mandato"
          ? "Follow-up 1 mandato"
          : lead.contactStage === "Follow-up 1 mandato"
            ? "Follow-up 2 mandato"
            : lead.contactStage,
      followUpCount: isFollowUp ? (lead.followUpCount ?? 0) + 1 : (lead.followUpCount ?? 0),
    };
    leadsStore.save(all);
    _recordActivity(id, "contacted");
  },
  reschedule(id: string, date: string) {
    const all = leadsStore.list();
    const idx = all.findIndex((l) => l.id === id);
    if (idx < 0) return;
    all[idx] = { ...all[idx], nextFollowUpAt: date };
    leadsStore.save(all);
  },
};

function _recordActivity(leadId: string, event: string) {
  import("@/lib/activity").then(({ activityStore }) => {
    activityStore.record(leadId, event as any);
  });
}

function _trackStatusChange(oldLead: Lead, newLead: Lead) {
  const statusChanged = oldLead.status !== newLead.status;
  const stageChanged = oldLead.contactStage !== newLead.contactStage;
  // Auto-update lastContactedAt on status or stage change
  if (statusChanged || stageChanged) {
    const today = new Date().toISOString().slice(0, 10);
    const all = leadsStore.list();
    const idx = all.findIndex((l) => l.id === newLead.id);
    if (idx >= 0 && all[idx].lastContactedAt !== today) {
      all[idx] = { ...all[idx], lastContactedAt: today };
      leadsStore.save(all);
    }
  }
  if (!statusChanged) return;
  const s = newLead.status;
  if (s === "Replied" || s === "In Conversation") {
    _recordActivity(newLead.id, "conversation_started");
  }
  if (s === "Qualified") _recordActivity(newLead.id, "qualified");
  if (s === "Call Booked") _recordActivity(newLead.id, "call_booked");
  if (s === "Closed Won") _recordActivity(newLead.id, "closed_won");
}

export const targetsStore = {
  get: () => read<Targets>(KEYS.targets, DEFAULT_TARGETS),
  set: (t: Targets) => write(KEYS.targets, t),
};

export const experimentsStore = {
  list: () => read<Experiment[]>(KEYS.experiments, []),
  save: (xs: Experiment[]) => write(KEYS.experiments, xs),
  upsert(x: Experiment) {
    const all = experimentsStore.list();
    const idx = all.findIndex((e) => e.id === x.id);
    if (idx >= 0) all[idx] = x;
    else all.push(x);
    experimentsStore.save(all);
  },
  remove(id: string) {
    experimentsStore.save(experimentsStore.list().filter((e) => e.id !== id));
  },
};

export const playbookStore = {
  list: () => read<PlaybookEntry[]>(KEYS.playbook, []),
  save: (xs: PlaybookEntry[]) => write(KEYS.playbook, xs),
  upsert(x: PlaybookEntry) {
    const all = playbookStore.list();
    const idx = all.findIndex((e) => e.id === x.id);
    if (idx >= 0) all[idx] = x;
    else all.push(x);
    playbookStore.save(all);
  },
  remove(id: string) {
    playbookStore.save(playbookStore.list().filter((e) => e.id !== id));
  },
};

export const timeStore = {
  list: () => read<TimeEntry[]>(KEYS.time, []),
  save: (xs: TimeEntry[]) => write(KEYS.time, xs),
  add(entry: TimeEntry) {
    const all = timeStore.list();
    all.push(entry);
    timeStore.save(all);
  },
  remove(id: string) {
    timeStore.save(timeStore.list().filter((e) => e.id !== id));
  },
  getActive: () => read<ActiveTimer>(KEYS.activeTimer, null),
  setActive: (t: ActiveTimer) => write(KEYS.activeTimer, t),
};

export function exportAll() {
  return {
    version: 3,
    exportedAt: new Date().toISOString(),
    daily: dailyStore.list(),
    leads: leadsStore.list(),
    targets: targetsStore.get(),
    experiments: experimentsStore.list(),
    playbook: playbookStore.list(),
    time: timeStore.list(),
  };
}

export function importAll(data: ReturnType<typeof exportAll>) {
  if (data.daily) dailyStore.save(data.daily);
  if (data.leads) leadsStore.save(data.leads);
  if (data.targets) targetsStore.set(data.targets);
  if (data.experiments) experimentsStore.save(data.experiments);
  if (data.playbook) playbookStore.save(data.playbook);
  if (data.time) timeStore.save(data.time);
}

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
