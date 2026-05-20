# QUANTEX

AI-powered technician booking platform — customers book on-demand tech repair, technicians manage jobs, AI diagnoses issues.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/quantex run dev` — run the frontend (Vite)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, TailwindCSS, shadcn/ui, wouter, TanStack Query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- AI: OpenAI (issue analysis/diagnosis)

## Where things live

- `artifacts/quantex/` — React+Vite frontend (preview at `/`)
- `artifacts/api-server/` — Express API (routes at `/api/*`)
- `lib/api-spec/` — OpenAPI spec (source of truth for API contract)
- `lib/api-client-react/` — generated React Query hooks + Zod schemas
- `lib/db/` — Drizzle schema + DB connection

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval → generated hooks/schemas used by both client and server
- Bearer token auth stored in `localStorage` as `quantex_token`; injected via `setAuthTokenGetter` in `lib/api-client-react`
- Flat response types: `Booking`, `Review` use denormalized `categoryName`, `technicianName`, `customerName` fields (no nested objects)
- `Technician` type uses flat `name` field (not nested `user.name`)
- Token utilities live in `src/lib/token.ts` (separate from `auth.tsx` for Vite Fast Refresh compatibility)

## Product

- **Customer portal**: dashboard, multi-step booking flow, AI issue diagnostic chat, live job tracking, booking history, profile settings
- **Technician portal**: dashboard with stats, job management with status transitions (pending → accepted → in_progress → completed)
- **Public pages**: home, services catalog, reviews, about

## Demo Accounts

- Customers: `alex@example.com`, `jordan@example.com`, `sam@example.com` — password: `demo123`
- Technicians: `marcus@example.com`, `priya@example.com`, `derek@example.com`, `nina@example.com` — password: `tech123`
- New accounts can also be created via the Register page

## User preferences

- Premium green-on-black futuristic UI throughout
- Font mono for labels, IDs, status badges
- ALL CAPS for section headings and status labels

## Gotchas

- Import types from `@workspace/api-client-react` barrel only — never from `@workspace/api-client-react/src/generated/api.schemas` (causes TS2307 at runtime)
- `useGetMe`, `useGetBooking`, `useGetBookingTracking` query options need `{ query: { ... } as any }` due to `queryKey` being required in `UseQueryOptions` type
- `ListBookingsParams.status` must be a `ListBookingsStatus` enum value (not a plain string)
- `UserUpdate` only accepts `name`, `phone`, `address`, `avatarUrl` — no `email`
- `BookingInput.estimatedCost` is required

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
