---
name: project-ux-polish
description: UX Polish implementation — skeleton loaders, empty states, error states across all main pages
metadata:
  type: project
---

Implemented full UX polish pass (Day 21+ work). Three new reusable standalone components created in `src/app/ui/components/`:

**New components:**
- `skeleton/skeleton.ts` — `ef-skeleton` with inputs: `width`, `height`, `rounded` ('none'|'sm'|'md'|'lg'|'xl'|'full'). Host is `display:block`. Uses `animate-pulse bg-neutral-200 dark:bg-neutral-700`.
- `empty-state/empty-state.ts` — `ef-empty-state` with inputs: `title`, `description`, `size` ('sm'|'md'). Uses ng-content slots: `[icon]` for SVG and `[cta]` for action button. `size="sm"` reduces padding/icon/font for compact list cards.
- `error-state/error-state.ts` — `ef-error-state` with inputs: `title`, `message`, output: `onRetry`. Always shows a retry button.

**Pages updated:**
- `groups-page`: skeleton grid (3 fake cards), ef-error-state with retryLoad, ef-empty-state for no groups. Removed `Card` import (no longer used). Added `.group-card--skeleton` CSS modifier.
- `group-detail-page`: skeleton for header+two-column layout, ef-error-state for load/balances errors, ef-empty-state for no expenses, improved "Todos están al día" with `.balances-settled` green check design.
- `profile-page`: `@if (!auth.user())` skeleton guard for profile card. Added `Skeleton` import.
- `analytics-page`: `loadError` signal + `retryLoad()` method added, ef-error-state for stats failure, skeleton for KPI cards (already had) + charts row + lists row, ef-empty-state (size="sm") for activity/balances lists, ef-empty-state for donut chart.

**Why:** All pages previously had plain spinner + text for loading and red text for errors. Task required meaningful skeletons, polished empty states with icons and CTAs, and visual error states with retry.
