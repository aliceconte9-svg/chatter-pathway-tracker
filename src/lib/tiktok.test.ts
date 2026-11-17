import { describe, it, expect } from "vitest";
import { normalizeUsername, profileUrl, findDuplicate, rate, computeStats, applyStageChange, type TikTokContact } from "./tiktok";

const base = (o: Partial<TikTokContact>): TikTokContact => ({
  id: Math.random().toString(), platform: "tiktok", username: "x", createdAt: "2026-11-17",
  stage: "Contatto inserito", outcome: "Aperta", dmStatus: "Da contattare", ...o,
});

describe("tiktok", () => {
  it("normalizes @ and case", () => expect(normalizeUsername(" @Mario.Rossi ")).toBe("mario.rossi"));
  it("builds profile url", () => expect(profileUrl("@Mario")).toBe("https://www.tiktok.com/@mario"));
  it("detects duplicate with or without @", () => {
    expect(findDuplicate([base({ username: "mario" })], "@MARIO")).toBeDefined();
  });
  it("rate is null with zero denominator", () => expect(rate(0, 0)).toBeNull());
  it("reply rate uses first DMs as denominator", () => {
    const a = applyStageChange(base({}), "Risposta ricevuta", "2026-11-17");
    const b = applyStageChange(base({}), "Primo DM inviato", "2026-11-17");
    expect(computeStats([a, b], {}, "2026-11-17").replyRate).toBe(50);
  });
});
