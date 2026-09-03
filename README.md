# Hotel Store — Inventory System

Mobile-first Next.js (App Router) + Tailwind CSS + Supabase app for tracking hotel store stock movements, with automatic day-to-day balance rollover and low-stock alerts.

## Features

- **Quick Stock In / Stock Out** — two large touch-friendly buttons open a searchable quick-entry modal (item, quantity, reason) and instantly update balances.
- **Automatic day rollover** — yesterday's closing balance becomes today's opening balance automatically (handled atomically in Postgres, see `record_transaction()` / `get_or_create_daily_snapshot()` in [supabase/schema.sql](supabase/schema.sql)).
- **Low stock alerts** — any item whose current balance drops to or below its reorder limit is highlighted in red with a "LOW STOCK" badge.
- **Daily Reports** — pick any past date to see that day's opening/IN/OUT/closing snapshot per item plus the full transaction audit trail.

## Setup

### 1. Create the Supabase project & schema

1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run the entire contents of [supabase/schema.sql](supabase/schema.sql). This creates the `items`, `daily_snapshots`, and `transactions` tables, the rollover functions, the `v_today_inventory` view, RLS policies, and a handful of seed items.
3. Copy your project's **URL** and **anon public key** from Project Settings → API.

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### 3. Install & run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
src/
  app/
    page.tsx           # Dashboard: quick actions + today's inventory
    reports/page.tsx    # Daily movement report
    layout.tsx
  components/
    QuickEntryModal.tsx # Stock In / Stock Out entry form
    InventoryTable.tsx  # Searchable list with low-stock highlighting
    DailyReport.tsx      # Date picker + snapshot + audit trail
    AddItemModal.tsx     # Add a new store item
    NavHeader.tsx
  lib/
    supabase.ts          # Supabase client
    queries.ts            # Typed data access layer (RPC + table queries)
  types/database.ts       # Shared TypeScript types
supabase/schema.sql        # Full DB schema, functions, RLS policies, seed data
```

## Notes on production readiness

- RLS policies currently allow full access via the anon key (no auth layer). Before going live with real staff accounts, add Supabase Auth and tighten the policies in `supabase/schema.sql` (e.g. require `auth.role() = 'authenticated'`, and pass the logged-in user's identity as `p_created_by` in `record_transaction`).
- All stock mutations go through the `record_transaction()` Postgres function so the snapshot rollover and running balance stay consistent even under concurrent submissions.
