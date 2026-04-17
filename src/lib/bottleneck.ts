import type { WeekTotals } from "./week";
import type { Targets } from "./storage";
import { pct } from "./week";

export type BottleneckStep =
  | "opener"
  | "follow-up"
  | "qualification"
  | "sales"
  | "show-up"
  | "volume"
  | "none";

export type BottleneckResult = {
  step: BottleneckStep;
  title: string;
  diagnosis: string;
  fix: string;
  rate: number; // current rate %
  target: number; // target rate %
  gap: number; // target - rate (positive = behind)
};

const TARGET_REPLY_RATE_FALLBACK = 30;
const TARGET_CONVO_RATE = 50; // % of replies that turn into real convos
const TARGET_BOOKING_RATE = 50; // % of qualified that book
const TARGET_SHOW_RATE = 70;
const TARGET_CLOSE_RATE = 25;

export function findBottleneck(week: WeekTotals, targets: Targets): BottleneckResult {
  const replyRate = pct(week.replies, week.dms);
  const convoRate = pct(week.convos, week.replies);
  const bookingRate = pct(week.booked, week.qualified);
  const showRate = pct(week.showed, week.booked);
  const closeRate = pct(week.sales, week.showed);

  const replyTarget = targets.replyRate || TARGET_REPLY_RATE_FALLBACK;

  // No data yet
  if (week.dms === 0) {
    return {
      step: "volume",
      title: "Not enough volume yet",
      diagnosis: "You haven't sent any DMs this week.",
      fix: "Start by hitting your DM target. You can't optimize what doesn't exist.",
      rate: 0,
      target: targets.dms,
      gap: targets.dms,
    };
  }

  type Candidate = Omit<BottleneckResult, "gap"> & { gap: number };
  const candidates: Candidate[] = [];

  if (week.dms > 0) {
    candidates.push({
      step: "opener",
      title: "Opener problem",
      diagnosis: `Reply rate is ${replyRate.toFixed(1)}% (target ${replyTarget}%). People aren't replying.`,
      fix: "Test a shorter, curiosity-based opener. Drop the salesy tone — lead with a question about them.",
      rate: replyRate,
      target: replyTarget,
      gap: replyTarget - replyRate,
    });
  }

  if (week.replies > 0) {
    candidates.push({
      step: "follow-up",
      title: "Weak follow-up",
      diagnosis: `Only ${convoRate.toFixed(1)}% of replies turn into real conversations (target ${TARGET_CONVO_RATE}%).`,
      fix: "Your second message is dropping the ball. Ask an open question that invites them to share.",
      rate: convoRate,
      target: TARGET_CONVO_RATE,
      gap: TARGET_CONVO_RATE - convoRate,
    });
  }

  if (week.qualified > 0) {
    candidates.push({
      step: "qualification",
      title: "Bad qualification / transition",
      diagnosis: `Booking rate is ${bookingRate.toFixed(1)}% (target ${TARGET_BOOKING_RATE}%). Convos aren't turning into calls.`,
      fix: "Tighten qualification: ask about pain, budget, urgency. Then transition with a clear CTA to book.",
      rate: bookingRate,
      target: TARGET_BOOKING_RATE,
      gap: TARGET_BOOKING_RATE - bookingRate,
    });
  }

  if (week.booked > 0) {
    candidates.push({
      step: "show-up",
      title: "Too many no-shows",
      diagnosis: `Show rate is ${showRate.toFixed(1)}% (target ${TARGET_SHOW_RATE}%). Booked calls aren't happening.`,
      fix: "Send a reminder 24h and 1h before. Ask them to confirm. Build commitment in the booking message.",
      rate: showRate,
      target: TARGET_SHOW_RATE,
      gap: TARGET_SHOW_RATE - showRate,
    });
  }

  if (week.showed > 0) {
    candidates.push({
      step: "sales",
      title: "Sales problem",
      diagnosis: `Close rate is ${closeRate.toFixed(1)}% (target ${TARGET_CLOSE_RATE}%). Calls aren't converting.`,
      fix: "Review objections this week. Sharpen your offer, handle price/time concerns directly, ask for the sale.",
      rate: closeRate,
      target: TARGET_CLOSE_RATE,
      gap: TARGET_CLOSE_RATE - closeRate,
    });
  }

  // Pick the worst gap (only those behind target)
  const behind = candidates.filter((c) => c.gap > 0);
  if (behind.length === 0) {
    return {
      step: "none",
      title: "All systems green",
      diagnosis: "Every step of your funnel is at or above target this week.",
      fix: "Push volume. Document what's working in your Playbook.",
      rate: 100,
      target: 100,
      gap: 0,
    };
  }
  behind.sort((a, b) => b.gap - a.gap);
  return behind[0];
}
