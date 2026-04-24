// Tag management — synced through the shared storage layer

import { cloudSync } from "./storage";

const KEY = "chatter:tags";

export const DEFAULT_TAGS = ["Masterclass", "Importante", "Automazione", "Call prenotata"];

function read(): string[] {
  if (typeof window === "undefined") return DEFAULT_TAGS;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : DEFAULT_TAGS;
  } catch {
    return DEFAULT_TAGS;
  }
}

function write(tags: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(tags));
  window.dispatchEvent(new CustomEvent("chatter:storage"));
  void cloudSync.push(KEY, tags);
}

export const tagsStore = {
  list: () => read(),
  save: (tags: string[]) => write(tags),
  add(tag: string) {
    const all = read();
    const trimmed = tag.trim();
    if (!trimmed || all.includes(trimmed)) return;
    write([...all, trimmed]);
  },
  remove(tag: string) {
    write(read().filter((t) => t !== tag));
  },
  rename(oldTag: string, newTag: string) {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    write(read().map((t) => (t === oldTag ? trimmed : t)));
  },
};