// TikTok CRM for Limitless Academy. Stored separately from legacy Instagram leads
// (chatter:leads) so existing data keeps its original platform.
import { cloudSync } from "./storage";

export const TT_SOURCES = [
  "Nuovo follower",
  "Richiesta guida o risorsa",
  "Commento a un video",
  "Interazione durante una live",
  "DM spontaneo",
  "Altro",
] as const;
export type TTSource = (typeof TT_SOURCES)[number];

export const TT_STAGES = [
  "Contatto inserito",
  "Primo DM inviato",
  "Risposta ricevuta",
  "Motivazione e obiettivi esplorati",
  "Metodo attuale e difficoltà approfonditi",
  "Call proposta",
  "Call prenotata",
  "Call svolta",
  "Percorso acquistato",
] as const;
export type TTStage = (typeof TT_STAGES)[number];

export const TT_OUTCOMES = ["Aperta", "In attesa di risposta", "Non interessato", "Non in target", "Conversazione chiusa"] as const;
export type TTOutcome = (typeof TT_OUTCOMES)[number];

export const TT_DM_STATUSES = [
  "Da contattare",
  "Richiesta di messaggio inviata",
  "Conversazione avviata",
  "DM non disponibile",
] as const;
export type TTDmStatus = (typeof TT_DM_STATUSES)[number];

export type TikTokContact = {
  id: string;
  platform: "tiktok";
  username: string; // normalized, no @, lowercase — primary identifier
  displayName?: string;
  createdAt: string; // yyyy-MM-dd
  notes?: string;
  source?: TTSource;
  sourceContent?: string; // video or live
  keyword?: string;
  resource?: string;
  stage: TTStage;
  outcome: TTOutcome;
  dmStatus: TTDmStatus;
  contactLimits?: string;
  lastSentAt?: string;
  lastReplyAt?: string;
  nextAction?: string;
  nextActionDue?: string;
  stageDates?: Partial<Record<TTStage, string>>; // first date each stage was reached
};

export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^https?:\/\/(www\.)?tiktok\.com\//i, "").replace(/^@+/, "").split(/[/?#\s]/)[0].toLowerCase();
}

export function profileUrl(username: string): string {
  return `https://www.tiktok.com/@${normalizeUsername(username)}`;
}

export function findDuplicate(list: TikTokContact[], username: string, excludeId?: string) {
  const u = normalizeUsername(username);
  if (!u) return undefined;
  return list.find((c) => c.id !== excludeId && normalizeUsername(c.username) === u);
}

const stageIdx = (s: TTStage) => TT_STAGES.indexOf(s);

/** Stages are not mandatory steps: jumping ahead records the date only for the reached stage. */
export function applyStageChange(c: TikTokContact, stage: TTStage, today: string): TikTokContact {
  const stageDates = { ...(c.stageDates ?? {}) };
  if (!stageDates[stage]) stageDates[stage] = today;
  return { ...c, stage, stageDates };
}

export function reached(c: TikTokContact, stage: TTStage) {
  return !!c.stageDates?.[stage] || stageIdx(c.stage) >= stageIdx(stage);
}

/** Rate or null when the denominator is zero (UI shows "Dati insufficienti"). */
export function rate(num: number, den: number): number | null {
  return den > 0 ? (num / den) * 100 : null;
}

export type TTFilters = { from?: string; to?: string; source?: string; stage?: string; resource?: string };

export function filterContacts(list: TikTokContact[], f: TTFilters) {
  return list.filter(
    (c) =>
      (!f.source || f.source === "all" || c.source === f.source) &&
      (!f.stage || f.stage === "all" || c.stage === f.stage) &&
      (!f.resource || (c.resource ?? "").toLowerCase().includes(f.resource.toLowerCase())),
  );
}

const inRange = (d: string | undefined, f: TTFilters) => !!d && (!f.from || d >= f.from) && (!f.to || d <= f.to);

export function computeStats(all: TikTokContact[], f: TTFilters, today: string) {
  const list = filterContacts(all, f);
  const stageIn = (s: TTStage) =>
    list.filter((c) => {
      const d = c.stageDates?.[s] ?? (reached(c, s) ? c.createdAt : undefined);
      return reached(c, s) && (!f.from && !f.to ? true : inRange(d, f));
    }).length;
  const newContacts = list.filter((c) => !f.from && !f.to ? true : inRange(c.createdAt, f)).length;
  const firstDms = stageIn("Primo DM inviato");
  const replied = stageIn("Risposta ricevuta");
  const proposed = stageIn("Call proposta");
  const booked = stageIn("Call prenotata");
  const held = stageIn("Call svolta");
  const purchases = stageIn("Percorso acquistato");
  const open = list.filter((c) => c.outcome === "Aperta" || c.outcome === "In attesa di risposta");
  const followUpsDue = open.filter((c) => c.nextActionDue === today).length;
  const followUpsOverdue = open.filter((c) => c.nextActionDue && c.nextActionDue < today).length;
  return {
    newContacts, firstDms, replied, proposed, booked, held, purchases, followUpsDue, followUpsOverdue,
    replyRate: rate(replied, firstDms),
    bookingRate: rate(booked, proposed),
    purchaseRate: rate(purchases, held),
  };
}

const KEY = "chatter:tiktok";

function read(): TikTokContact[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}
function write(v: TikTokContact[]) {
  localStorage.setItem(KEY, JSON.stringify(v));
  window.dispatchEvent(new CustomEvent("chatter:storage"));
  void cloudSync.push(KEY, v);
}

export const tiktokStore = {
  list: read,
  save: write,
  upsert(c: TikTokContact) {
    const all = read();
    const i = all.findIndex((x) => x.id === c.id);
    const clean = { ...c, username: normalizeUsername(c.username) };
    if (i >= 0) all[i] = clean;
    else all.push(clean);
    write(all);
  },
  remove(id: string) {
    write(read().filter((c) => c.id !== id));
  },
};
