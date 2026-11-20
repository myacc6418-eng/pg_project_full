# PG Finder — Mobile-First Modular Monolith

PG Finder is an integrated Indian Paying Guest (PG) accommodation marketplace and operations platform connecting PG seekers, active tenants, PG owners, and Super Admins through one modular monolith codebase.

## Architecture Overview

- **Frontend (`src/`)**: React 19, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, Recharts, Motion, Lucide React, and Capacitor (`capacitor.config.ts`).
- **Backend (`server.ts` + `apps/api/src/`)**: Express.js modular monolith serving `/api/v1/*` modules (`auth`, `properties`, `operations`, `monetization`, `events`, `admin`) with JWT access tokens, rotating HttpOnly refresh cookies, bcrypt password hashing, Zod validation, and backend-enforced RBAC.
- **Shared Contracts (`packages/shared/`)**: Shared TypeScript domain types, Zod schemas, constants, and RBAC permission helpers consumed by both frontend and backend.
- **Database**: Production PostgreSQL Prisma schema (`apps/api/prisma/schema.prisma`) and SQL migration (`apps/api/prisma/migrations/0001_init/migration.sql`). In the AI Studio preview runtime without a live PostgreSQL instance, `apps/api/src/shared/db.ts` provides a persistent file-backed repository (`.data/pgfinder-db.json`) enforcing all relational and workflow invariants.

## Implemented vs Development Adapter Scope

- **Implemented End-to-End**: Public landing & PG discovery (list + verified pin map), role-based auth & OTP verification (blocking public Super Admin signup), 0-property owner instant dashboard access, 10-step Add PG wizard, independent Super Admin property approval & location verification, room/bed inventory, QR/online joining & single active stay enforcement, rent ledger & receipts, full expense tracking (on all plans including Basic), food menus, complaints, notices, roommate splits, checkout bed release, Basic/Pro/Business subscriptions + ₹199 lifetime listing + featured promotions, shared Startup Events + PG Finder Local, and Super Admin analytics & audit logs.
- **Development Adapters**: Payment checkout uses a configurable `demo_gateway` adapter (never storing card numbers); OTP uses a deterministic dev hint (`482910`); AdMob uses `AdService` with test ad unit IDs; fictional demo listings are clearly disclosed.
