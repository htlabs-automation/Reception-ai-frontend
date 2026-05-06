# Reception AI Frontend — Project Context

## Overview

**Reception AI** is a multi-tenant SaaS dashboard for restaurant owners to manage AI-powered phone receptionists. Restaurant staff log in to see live call data, manage menus, track inventory, handle kitchen orders in real time, and analyze performance. A super-admin layer handles tenant onboarding, user management, and billing.

- **Backend:** `https://reception-ai-backend.onrender.com/api` (hosted on Render)
- **Frontend Deploy Target:** Vercel
- **Repository root:** `Reception-ai-frontend1/` → app lives in `frontend/`

---

## Tech Stack

| Layer | Choice | Version |
|---|---|---|
| UI library | React | 19.2.5 |
| Build tool | Vite | 8.0.10 |
| Routing | React Router | 7.14.2 |
| Data fetching | TanStack React Query | 5.100.6 |
| HTTP client | Axios | 1.15.2 |
| Styling | Tailwind CSS | 3.4.19 |
| Charts | Recharts | 3.8.1 |
| Icons | Lucide React | 1.14.0 |
| Notifications | react-hot-toast | 2.6.0 |
| Date utilities | date-fns | 4.1.0 |

All source files use `.jsx` (not TypeScript).

---

## Folder Structure

```
Reception-ai-frontend1/
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── client.js              # Axios instance + auth interceptors
    │   ├── components/
    │   │   ├── layout/
    │   │   │   ├── AppLayout.jsx      # Fixed sidebar + outlet
    │   │   │   └── Sidebar.jsx        # Nav links, role-aware
    │   │   └── ui/
    │   │       ├── Badge.jsx
    │   │       ├── Button.jsx
    │   │       ├── Card.jsx
    │   │       ├── Input.jsx
    │   │       ├── Modal.jsx
    │   │       └── StatCard.jsx
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── RequireAuth.jsx        # Route guard HOC
    │   │   ├── admin/
    │   │   │   ├── AdminAnalyticsPage.jsx
    │   │   │   ├── AdminTenantView.jsx
    │   │   │   ├── InvoicePage.jsx
    │   │   │   ├── TenantsPage.jsx
    │   │   │   └── UsersPage.jsx
    │   │   └── tenant/
    │   │       ├── AnalyticsPage.jsx
    │   │       ├── DealsPage.jsx
    │   │       ├── InventoryPage.jsx
    │   │       ├── KitchenPage.jsx
    │   │       ├── MenuPage.jsx
    │   │       └── TenantDashboardPage.jsx
    │   ├── store/
    │   │   └── authStore.jsx          # Auth context + useAuth hook
    │   ├── App.jsx                    # Route definitions
    │   ├── main.jsx                   # React root bootstrap
    │   └── index.css                  # Global styles + animations
    ├── .env                           # VITE_API_BASE_URL
    ├── index.html
    ├── package.json
    ├── vite.config.js                 # Proxy /api → VITE_API_URL
    ├── tailwind.config.js             # Custom brand (orange) colors
    └── postcss.config.js
```

---

## Authentication & Auth Flow

**Store:** [frontend/src/store/authStore.jsx](frontend/src/store/authStore.jsx)

- `AuthProvider` context wraps the whole app
- `useAuth()` exposes `{ user, loading, login(), logout() }`
- Tokens stored in `localStorage`: `access_token`, `refresh_token`
- Axios request interceptor attaches `Authorization: Bearer <token>`
- Axios response interceptor: on 401 → call `POST /auth/refresh/` → retry original request → redirect to `/login` on failure
- `RequireAuth` HOC guards all protected routes
- `RequireSuperAdmin` HOC further locks admin-only routes

**User Roles:**
| Role | Access |
|---|---|
| `superadmin` | All admin pages + any tenant view |
| `tenant_staff` | Only their own tenant's pages (scoped by `tenant_id`) |

---

## Routing

Defined in [frontend/src/App.jsx](frontend/src/App.jsx).

```
/login                              → Login.jsx (public)
/                                   → RoleRedirect (redirects by role)

Protected (RequireAuth + AppLayout):
  /admin                            → TenantsPage
  /admin/users                      → UsersPage
  /admin/analytics                  → AdminAnalyticsPage
  /admin/invoices                   → InvoicePage
  /admin/tenant/:tenantId           → AdminTenantView

  /tenant/:tenantId                 → TenantDashboardPage
  /tenant/:tenantId/menu            → MenuPage
  /tenant/:tenantId/inventory       → InventoryPage
  /tenant/:tenantId/deals           → DealsPage
  /tenant/:tenantId/kitchen         → KitchenPage
  /tenant/:tenantId/analytics       → AnalyticsPage
```

---

## Pages — What Each Does

### Admin Pages

| Page | File | Purpose |
|---|---|---|
| TenantsPage | [admin/TenantsPage.jsx](frontend/src/pages/admin/TenantsPage.jsx) | CRUD list of all restaurant tenants |
| UsersPage | [admin/UsersPage.jsx](frontend/src/pages/admin/UsersPage.jsx) | CRUD dashboard user accounts |
| AdminAnalyticsPage | [admin/AdminAnalyticsPage.jsx](frontend/src/pages/admin/AdminAnalyticsPage.jsx) | Platform-wide call/order/revenue stats |
| InvoicePage | [admin/InvoicePage.jsx](frontend/src/pages/admin/InvoicePage.jsx) | Generate & view billing invoices per tenant/month |
| AdminTenantView | [admin/AdminTenantView.jsx](frontend/src/pages/admin/AdminTenantView.jsx) | Admin lens into a single tenant's dashboard |

### Tenant Pages

| Page | File | Purpose |
|---|---|---|
| TenantDashboardPage | [tenant/TenantDashboardPage.jsx](frontend/src/pages/tenant/TenantDashboardPage.jsx) | Overview: call volume, active orders, recent calls |
| MenuPage | [tenant/MenuPage.jsx](frontend/src/pages/tenant/MenuPage.jsx) | Manage menu items; upload/parse PDF menus; bulk price update |
| InventoryPage | [tenant/InventoryPage.jsx](frontend/src/pages/tenant/InventoryPage.jsx) | Stock levels, low-stock alerts, avg prep time |
| DealsPage | [tenant/DealsPage.jsx](frontend/src/pages/tenant/DealsPage.jsx) | Create promotions (percentage or fixed discount) |
| KitchenPage | [tenant/KitchenPage.jsx](frontend/src/pages/tenant/KitchenPage.jsx) | Real-time Kanban order board (Pending → Preparing → Ready) |
| AnalyticsPage | [tenant/AnalyticsPage.jsx](frontend/src/pages/tenant/AnalyticsPage.jsx) | 30/90-day call volume, language breakdown, revenue charts |

---

## API Layer

**Client:** [frontend/src/api/client.js](frontend/src/api/client.js)

- Axios instance with `baseURL = VITE_API_BASE_URL`
- All endpoints below are relative to `https://reception-ai-backend.onrender.com/api`

### Endpoint Map

```
Auth
  POST  /auth/login/
  GET   /auth/me/
  POST  /auth/refresh/

Admin — Users
  GET    /admin/users/
  POST   /admin/users/
  PATCH  /admin/users/{id}/
  DELETE /admin/users/{id}/

Admin — Analytics
  GET   /admin/analytics/?period={days}

Tenants
  GET    /tenants/
  POST   /tenants/
  GET    /tenants/{id}/
  PATCH  /tenants/{id}/

Menu Items
  GET    /tenants/{id}/items/
  POST   /tenants/{id}/items/
  PATCH  /tenants/{id}/items/{itemId}/
  DELETE /tenants/{id}/items/{itemId}/
  POST   /tenants/{id}/items/bulk-price/

Menu PDF
  POST   /tenants/{id}/upload-menu/
  POST   /tenants/{id}/parse-menu/

Deals
  GET    /tenants/{id}/deals/
  POST   /tenants/{id}/deals/
  PATCH  /tenants/{id}/deals/{dealId}/
  DELETE /tenants/{id}/deals/{dealId}/

Analytics
  GET   /tenants/{id}/analytics/?period={days}
  GET   /tenants/{id}/invoice/{month}

Kitchen / Orders
  GET   /kitchen/orders/?tenant_id={id}
  PATCH /orders/{orderId}/status/
  SSE   /kitchen/stream/?tenant_id={id}   ← Server-Sent Events (real-time)
```

---

## State Management

| Concern | Mechanism |
|---|---|
| Auth / current user | React Context (`authStore.jsx`) |
| Server data (lists, analytics) | TanStack React Query (30s staleTime, 1 retry) |
| Form & modal state | Local `useState` |
| Real-time kitchen orders | SSE + React state |

React Query `queryKey` conventions:
- `['items', tenantId]`
- `['analytics', tenantId]`
- `['orders', tenantId]`
- `['tenants']`, `['users']`, etc.

Mutations call `queryClient.invalidateQueries()` on success to keep data fresh.

---

## Styling

- **Tailwind CSS** utility-first throughout — no separate CSS modules
- **Custom brand color palette** (orange theme) defined in [tailwind.config.js](frontend/tailwind.config.js):
  - `brand-500` = `#f97316` (primary orange)
  - Full scale: 50 → 900
- **Global animations** in [index.css](frontend/src/index.css):
  - `slide-in-left` — new kitchen order cards entering
  - `fade-in` — page transitions
  - `order-enter`, `order-update` utility classes
- **Design tokens** (informal):
  - Spacing: 8px grid (`p-2`, `p-4`, `p-6`, `p-8`)
  - Radii: `rounded-lg`, `rounded-xl`, `rounded-2xl`
  - Shadows: `shadow-sm`, `shadow-xl`

---

## Reusable UI Components

All in [frontend/src/components/ui/](frontend/src/components/ui/):

| Component | Props / Notes |
|---|---|
| `Button` | `variant` (primary/secondary/danger), `size`, `loading` |
| `Card` | Wrapper with padding and shadow |
| `Input` | Controlled; forwards all native input props |
| `Modal` | Portal-based; `isOpen`, `onClose`, `title` |
| `Badge` | Color variant for status labels |
| `StatCard` | Icon + label + value for dashboard KPI tiles |

---

## Environment Variables

File: [frontend/.env](frontend/.env)

```
VITE_API_BASE_URL=https://reception-ai-backend.onrender.com/api
VITE_API_KEY=                          # optional
```

Accessed in code via `import.meta.env.VITE_API_BASE_URL`.

---

## Build & Dev

```bash
# from frontend/
npm install
npm run dev      # Vite dev server with HMR
npm run build    # Production build → dist/
npm run preview  # Preview production build locally
npm run lint     # ESLint
```

Vite proxy: requests to `/api/*` in dev are proxied to `VITE_API_URL` (avoids CORS in local dev).

---

## Key Architectural Patterns

**RBAC:** Super-admin vs tenant_staff roles gate entire route subtrees. `RequireSuperAdmin` HOC redirects unauthorized users.

**Real-time:** Kitchen page opens an SSE connection (`/kitchen/stream/?tenant_id=`) and merges incoming order events into React state. Dashboard stats use 10–60 second polling intervals.

**CRUD pattern:** Each resource page follows: `useQuery` to fetch → modal for create/edit → `useMutation` to POST/PATCH → `invalidateQueries` on success → toast on error.

**Optimistic UI:** Some list operations apply changes locally before the server confirms, rolling back on error.

**PDF Menu import:** Users upload a menu PDF → backend parses it → frontend shows parsed items for review → user confirms → items are saved to the tenant's menu.

---

## Git History (Recent)

| Commit | Message |
|---|---|
| `85a04bc` | updated dashboard and save buttons |
| `5741dbf` | removing localhost 8000 |
| `0ec6e9d` | added html and config files for deploying on vercel |
| `7b91a29` | frontend creation initial commit |

---

## What's Missing / Known Gaps

- No `README.md` at repo root
- No TypeScript (all `.jsx`; tsconfig exists but unused)
- No test suite (no test files or jest/vitest config found)
- No `vercel.json` visible in current tree (may be in `.gitignore`)
- `VITE_API_KEY` env var is defined but usage is unclear from current source
