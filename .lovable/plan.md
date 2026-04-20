

## Daily Activity Timer — Mobile-first PWA

A clean, mobile-optimized app to plan your day's activities, allocate time to each, run a stopwatch per activity, and review how efficiently you spent your time over the last 5 days. Everything resets each day automatically.

### Core flows

**1. Today (home screen)**
- Vertical list of today's activities as large, tappable cards
- Each card shows: activity name, allocated time, time spent so far, progress bar, and a big Start/Pause button
- Only one timer can run at a time (tapping Start on another auto-pauses the current one)
- Live ticking timer on the active card
- Tap card to expand → Reset, Mark complete, Edit, Delete
- Top header: today's date + overall efficiency ring (time used vs. total allocated)
- Sticky bottom: "+ Add activity" quick-add (name + minutes)

**2. History (last 5 days)**
- Horizontal day selector chips (Today, Yesterday, Mon, Sun, Sat…)
- Per-day summary card: total allocated, total tracked, efficiency %
- List of that day's activities with allocated vs. actual time, color-coded (green = on target, amber = over/under)
- Simple bar chart comparing allocated vs. spent across the 5 days

**3. Settings**
- Manage default activity templates (so you can quickly re-add common activities each day)
- Add / edit / delete templates with default duration
- "Apply template set to today" button to populate today's list in one tap
- Daily reset time (default midnight local)
- Theme: light / dark / system
- Clear all data

### Auto-reset behavior
- On app open, check last-active date. If it's a new day, snapshot yesterday's activities into history, then start today's list fresh (empty, or auto-loaded from templates if user enabled that option).
- History keeps only the last 5 days; older entries auto-purge.

### UI / design direction
- Mobile-first, single-column, thumb-friendly large hit targets
- Modern minimal aesthetic: rounded cards, soft shadows, generous spacing
- Smooth micro-animations: timer pulse when running, progress bar fill, card expand
- Bottom tab bar: **Today · History · Settings** (3 tabs, icon + label)
- Color system: calm neutral background, single accent color for primary actions, semantic green/amber/red for efficiency states
- Dark mode supported out of the box
- Large, legible monospace font for the running timer digits

### Data & persistence
- All data stored locally in the browser (no login needed) — works offline, instant
- Survives refresh and app close; timers continue accurately based on stored start timestamps even if the tab was closed

### Pages / routes
- `/` — Today
- `/history` — Last 5 days
- `/settings` — Templates & preferences

### Out of scope (v1)
- Multi-device sync / accounts
- Notifications/reminders
- Categories or tags
- Export

