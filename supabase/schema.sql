-- ============================================================================
-- Hotel Store / Inventory System — Supabase schema
-- Run this whole file in the Supabase SQL editor (or via `supabase db push`).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. items
-- ----------------------------------------------------------------------------
create table if not exists items (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  unit          text not null default 'pcs',
  reorder_limit numeric not null default 0,
  current_stock numeric not null default 0, -- denormalized running balance, kept in sync by record_transaction()
  created_at    timestamptz not null default now()
);

create unique index if not exists items_name_key on items (lower(name));

-- ----------------------------------------------------------------------------
-- 2. daily_snapshots  (one row per item per calendar day)
-- ----------------------------------------------------------------------------
create table if not exists daily_snapshots (
  id             uuid primary key default gen_random_uuid(),
  item_id        uuid not null references items (id) on delete cascade,
  date           date not null default current_date,
  opening_stock  numeric not null default 0,
  stock_in       numeric not null default 0,
  stock_out      numeric not null default 0,
  closing_stock  numeric not null default 0,
  unique (item_id, date)
);

create index if not exists daily_snapshots_date_idx on daily_snapshots (date);
create index if not exists daily_snapshots_item_date_idx on daily_snapshots (item_id, date);

-- ----------------------------------------------------------------------------
-- 3. transactions  (immutable audit log of every IN / OUT movement)
-- ----------------------------------------------------------------------------
create table if not exists transactions (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references items (id) on delete cascade,
  type        text not null check (type in ('IN', 'OUT')),
  quantity    numeric not null check (quantity > 0),
  reason      text,
  created_by  text,
  timestamp   timestamptz not null default now()
);

create index if not exists transactions_item_idx on transactions (item_id);
create index if not exists transactions_timestamp_idx on transactions (timestamp);

-- ============================================================================
-- Business logic (server-side, atomic) — this is what makes the "yesterday's
-- closing balance becomes today's opening balance" rollover automatic.
-- ============================================================================

-- Returns (and lazily creates) the snapshot row for an item on a given date.
-- If no snapshot exists yet for that date, it rolls forward the closing
-- balance of the most recent earlier snapshot (or the item's current_stock
-- if the item has never been snapshotted) as the new opening balance.
create or replace function get_or_create_daily_snapshot(p_item_id uuid, p_date date default current_date)
returns daily_snapshots
language plpgsql
as $$
declare
  v_snapshot daily_snapshots;
  v_opening  numeric;
begin
  select * into v_snapshot from daily_snapshots where item_id = p_item_id and date = p_date;
  if found then
    return v_snapshot;
  end if;

  select closing_stock into v_opening
  from daily_snapshots
  where item_id = p_item_id and date < p_date
  order by date desc
  limit 1;

  if v_opening is null then
    select current_stock into v_opening from items where id = p_item_id;
    v_opening := coalesce(v_opening, 0);
  end if;

  insert into daily_snapshots (item_id, date, opening_stock, stock_in, stock_out, closing_stock)
  values (p_item_id, p_date, v_opening, 0, 0, v_opening)
  on conflict (item_id, date) do nothing
  returning * into v_snapshot;

  if not found then
    select * into v_snapshot from daily_snapshots where item_id = p_item_id and date = p_date;
  end if;

  return v_snapshot;
end;
$$;

-- Ensures every item has a snapshot row for today. Call this on dashboard
-- load so the opening balance rollover happens even on days with no
-- transactions yet.
create or replace function ensure_today_snapshots()
returns void
language plpgsql
as $$
begin
  perform get_or_create_daily_snapshot(id, current_date) from items;
end;
$$;

-- Records a single IN/OUT movement and atomically updates today's snapshot
-- and the item's running current_stock. This is the only path the app
-- should use to move stock.
create or replace function record_transaction(
  p_item_id    uuid,
  p_type       text,
  p_quantity   numeric,
  p_reason     text default null,
  p_created_by text default null
)
returns transactions
language plpgsql
as $$
declare
  v_snapshot daily_snapshots;
  v_tx       transactions;
  v_in       numeric;
  v_out      numeric;
  v_closing  numeric;
begin
  if p_type not in ('IN', 'OUT') then
    raise exception 'type must be IN or OUT';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity must be greater than 0';
  end if;

  v_snapshot := get_or_create_daily_snapshot(p_item_id, current_date);

  v_in  := v_snapshot.stock_in  + (case when p_type = 'IN'  then p_quantity else 0 end);
  v_out := v_snapshot.stock_out + (case when p_type = 'OUT' then p_quantity else 0 end);
  v_closing := v_snapshot.opening_stock + v_in - v_out;

  update daily_snapshots
  set stock_in = v_in, stock_out = v_out, closing_stock = v_closing
  where id = v_snapshot.id;

  update items set current_stock = v_closing where id = p_item_id;

  insert into transactions (item_id, type, quantity, reason, created_by)
  values (p_item_id, p_type, p_quantity, p_reason, p_created_by)
  returning * into v_tx;

  return v_tx;
end;
$$;

-- ============================================================================
-- Convenience view for the dashboard (today's snapshot joined to items).
-- Call `select ensure_today_snapshots();` before querying this on first
-- load of the day so every item has a row.
-- ============================================================================
create or replace view v_today_inventory as
select
  i.id,
  i.name,
  i.unit,
  i.reorder_limit,
  coalesce(ds.opening_stock, i.current_stock) as opening_stock,
  coalesce(ds.stock_in, 0)                    as stock_in,
  coalesce(ds.stock_out, 0)                   as stock_out,
  coalesce(ds.closing_stock, i.current_stock) as current_balance,
  (coalesce(ds.closing_stock, i.current_stock) <= i.reorder_limit) as low_stock
from items i
left join daily_snapshots ds on ds.item_id = i.id and ds.date = current_date;

-- ============================================================================
-- Row Level Security
-- This app has no end-user auth layer yet, so we allow the anon key full
-- access. Tighten these policies (e.g. require auth.role() = 'authenticated')
-- before deploying to production with real users.
-- ============================================================================
alter table items enable row level security;
alter table daily_snapshots enable row level security;
alter table transactions enable row level security;

drop policy if exists "items_all" on items;
create policy "items_all" on items for all using (true) with check (true);

drop policy if exists "daily_snapshots_all" on daily_snapshots;
create policy "daily_snapshots_all" on daily_snapshots for all using (true) with check (true);

drop policy if exists "transactions_all" on transactions;
create policy "transactions_all" on transactions for all using (true) with check (true);

grant execute on function get_or_create_daily_snapshot(uuid, date) to anon, authenticated;
grant execute on function ensure_today_snapshots() to anon, authenticated;
grant execute on function record_transaction(uuid, text, numeric, text, text) to anon, authenticated;

-- ============================================================================
-- Seed data (optional) — remove or edit before going live.
-- ============================================================================
insert into items (name, unit, reorder_limit, current_stock) values
  ('Bath Towel',        'pcs',  20, 50),
  ('Bed Sheet (King)',  'pcs',  15, 40),
  ('Mineral Water 1L',  'btl',  50, 120),
  ('Hand Soap',         'btl',  10, 8),
  ('Toilet Paper Roll', 'pcs',  30, 25)
on conflict (lower(name)) do nothing;
