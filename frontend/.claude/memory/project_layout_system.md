---
name: project-layout-system
description: Main layout system for ExpenseFlow — sidebar, topbar, MainLayout, LayoutService
metadata:
  type: project
---

The main layout system is in `src/app/ui/layouts/`:
- `layout.service.ts` — `LayoutService` (providedIn: 'root'): Signals for `sidebarCollapsed`, `mobileSidebarOpen`, `pageTitle` (derived from Router events via `toSignal`). Methods: `toggleSidebar`, `toggleMobileSidebar`, `closeMobileSidebar`.
- `sidebar/` — `ef-sidebar`: Dark sidebar (neutral-900), 224px expanded / 64px collapsed, hidden on mobile via translateX, collapse/expand with CSS transition.
- `topbar/` — `ef-topbar`: White sticky header 56px, hamburger (mobile only), page title from LayoutService, "ML" avatar.
- `main-layout/` — `ef-main-layout`: Combines sidebar + overlay + topbar + router-outlet. Main content shifts via margin-left transition matching sidebar width.

**Why:** `app.routes.ts` wraps dashboard/expenses/groups under a `path: ''` parent with `loadComponent: MainLayout`. Auth routes are outside this wrapper.

**How to apply:** New app pages (under the main layout) should be added as children of the `path: ''` MainLayout route in `app.routes.ts`. The `LayoutService.pageTitle` is driven by `ROUTE_TITLES` record — add new routes there as needed.
