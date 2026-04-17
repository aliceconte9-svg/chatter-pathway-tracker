// Local storage layer for the chatter tracker app.
// All data lives in browser localStorage — single-user, no login.

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
  "Contacted",
  "Replied",
  "Convo",
  "Qualified",
  "Booked",
  "Showed",
  "Closed",
  "Lost",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

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
  dateContacted: string; // ISO yyyy-MM-dd
  status: LeadStatus;
  objection?: Objection;
  objectionCustom?: string;
  bestMessage?: string;
  notes?: string;
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

const KEYS = {
  daily: "chatter:daily",
  leads: "chatter:leads",
  targets: "chatter:targets",
};

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
}

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

export const leadsStore = {
  list: () => read<Lead[]>(KEYS.leads, []),
  save: (leads: Lead[]) => write(KEYS.leads, leads),
  upsert(lead: Lead) {
    const all = leadsStore.list();
    const idx = all.findIndex((l) => l.id === lead.id);
    if (idx >= 0) all[idx] = lead;
    else all.push(lead);
    leadsStore.save(all);
  },
  remove(id: string) {
    leadsStore.save(leadsStore.list().filter((l) => l.id !== id));
  },
};

export const targetsStore = {
  get: () => read<Targets>(KEYS.targets, DEFAULT_TARGETS),
  set: (t: Targets) => write(KEYS.targets, t),
};

export function exportAll() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    daily: dailyStore.list(),
    leads: leadsStore.list(),
    targets: targetsStore.get(),
  };
}

export function importAll(data: ReturnType<typeof exportAll>) {
  if (data.daily) dailyStore.save(data.daily);
  if (data.leads) leadsStore.save(data.leads);
  if (data.targets) targetsStore.set(data.targets);
}

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
