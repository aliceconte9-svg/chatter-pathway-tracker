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

export const LEAD_SOURCES = ["Follower", "Storia", "Esplora", "Hashtag", "Referral", "Other"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const CONTACT_STAGES = [
  "Messaggio mandato",
  "Conversazione iniziata",
  "Follow-up mandato",
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
  // Advanced metrics (optional)
  timeToFirstReplyMin?: number; // minutes between DM sent and first reply
  messagesToBooking?: number; // number of messages exchanged before booking
  conversationLength?: number; // total message count in the conversation
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
  activeTimer: "chatter:activeTimer",
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
