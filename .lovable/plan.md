
# Chatter Performance Tracker

A single-user web app to log daily outreach activity, manage individual leads, and review weekly performance against targets — built with local browser storage (no login).

## Routes

- `/` — **Dashboard** (weekly KPIs, trends, funnel, objections)
- `/daily` — **Daily Log** (quick-entry for today's numbers + history)
- `/leads` — **Leads Pipeline** (individual prospect records)
- `/weekly` — **Weekly Review** (week-by-week table with calculated rates vs targets)
- `/settings` — **Targets** (set weekly goals: DMs, reply rate, calls booked, sales)

## Daily Log (`/daily`)
Quick-entry form for each day:
- New followers contacted (DMs)
- Replies received
- Conversations started
- Qualified leads
- Calls booked
- Calls showed
- Sales closed
- Free-text "what I changed today" note

History table below, edit/delete per day.

## Leads Pipeline (`/leads`)
Individual records with:
- Name / handle
- Date contacted
- Status (Contacted → Replied → Convo → Qualified → Booked → Showed → Closed → Lost)
- Objection reason (dropdown: Too expensive, No time, Just curious, Already studying, Not interested, Other + custom)
- Notes
- Best message used (free text — to spot what works)

Filter by status and week. Search by name.

## Weekly Review (`/weekly`)
Table with one row per week (auto-aggregated from daily logs):
- DMs, Replies, Convos, Qualified, Booked, Showed, Sales
- **Reply rate** = Replies / DMs
- **Booking rate** = Booked / Qualified
- **Show rate** = Showed / Booked
- **Close rate** = Sales / Showed
- Target vs reality (color-coded green/red)
- Weekly review notes: biggest drop-off, best message, top objection, what changed

## Dashboard (`/`)
- **KPI cards** for current week: each metric with target, actual, % achieved, red/green
- **Trend charts** (line): reply rate, booking rate, close rate over last 8 weeks
- **Funnel** (horizontal bars): DMs → Replies → Convos → Qualified → Booked → Showed → Closed for selected week
- **Objection breakdown** (bar chart): top objections this week + all-time
- **Diagnosis hints**: auto-flag weak spots ("Reply rate below target → opener may be weak")

## Settings (`/settings`)
Weekly targets: DMs, reply rate %, qualified, calls booked, calls showed, sales closed. Editable anytime, applied to all weeks going forward.

## Data & Storage
- All data persisted in browser localStorage (single user, no login)
- Three stores: `dailyEntries`, `leads`, `targets`
- Export/import JSON button on Settings (so data isn't lost if cache clears)

## Design
- Clean, focused dashboard aesthetic (shadcn/ui + Tailwind)
- Light/dark mode via existing tokens
- Mobile-friendly (quick daily logging from phone)
- Recharts for trend lines, funnel bars, and objection chart
- Sticky top nav with the 5 routes
