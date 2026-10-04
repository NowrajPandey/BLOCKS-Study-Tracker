-- BLOCKS Study Tracker — cloud sync schema
-- Run this once in your Supabase project's SQL editor (SQL Editor → New query → Run).
-- No server code is needed: the app talks to these functions over PostgREST.

create extension if not exists pgcrypto;

create table if not exists public.blocks_state (
  owner_hash text primary key,
  state      jsonb   not null,
  updated_at timestamptz not null default now(),
  device     text    not null default 'unknown'
);

create table if not exists public.blocks_history (
  id         bigint generated always as identity primary key,
  owner_hash text    not null,
  device     text    not null default 'unknown',
  state      jsonb   not null,
  created_at timestamptz not null default now()
);

create index if not exists blocks_history_owner_idx
  on public.blocks_history (owner_hash, created_at desc);

-- Both tables are locked down with RLS and have no policies: they are only
-- reachable through the SECURITY DEFINER functions below, and every one of
-- those requires the caller to present the account's unguessable sync key.
alter table public.blocks_state  enable row level security;
alter table public.blocks_history enable row level security;

create or replace function public._blocks_hash(p_key text)
returns text language sql immutable parallel safe
as $$ select encode(digest(convert_to(p_key, 'UTF8'), 'sha256'), 'hex') $$;

create or replace function public.sync_pull(p_key text)
returns table (state jsonb, updated_at timestamptz, device text)
language sql security definer set search_path = public
as $$
  select s.state, s.updated_at, s.device
  from blocks_state s
  where s.owner_hash = _blocks_hash(p_key)
$$;

create or replace function public.sync_push(p_key text, p_state jsonb, p_device text default 'unknown')
returns timestamptz
language plpgsql security definer set search_path = public
as $$
declare
  h        text := _blocks_hash(p_key);
  ts       timestamptz := now();
  previous jsonb;
begin
  if pg_column_size(p_state) > 1048576 then
    raise exception 'state too large';
  end if;

  select s.state into previous from blocks_state s where s.owner_hash = h;

  insert into blocks_state (owner_hash, state, updated_at, device)
  values (h, p_state, ts, p_device)
  on conflict (owner_hash) do update
    set state = excluded.state, updated_at = excluded.updated_at, device = excluded.device;

  -- Keep a rollback point only when the payload actually changed, so a device
  -- re-pushing the same state does not bury the useful history.
  if previous is distinct from p_state then
    insert into blocks_history (owner_hash, device, state, created_at)
    values (h, p_device, p_state, ts);
    delete from blocks_history
    where owner_hash = h
      and id not in (
        select id from blocks_history
        where owner_hash = h
        order by created_at desc, id desc
        limit 50
      );
  end if;

  return ts;
end $$;

create or replace function public.sync_history(p_key text, p_limit int default 20)
returns table (id bigint, created_at timestamptz, device text)
language sql security definer set search_path = public
as $$
  select h.id, h.created_at, h.device
  from blocks_history h
  where h.owner_hash = _blocks_hash(p_key)
  order by h.created_at desc, h.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
$$;

create or replace function public.sync_history_get(p_key text, p_id bigint)
returns jsonb
language sql security definer set search_path = public
as $$
  select h.state
  from blocks_history h
  where h.owner_hash = _blocks_hash(p_key) and h.id = p_id
$$;

revoke execute on function public._blocks_hash(text)     from public;
revoke execute on function public.sync_pull(text)        from public;
revoke execute on function public.sync_push(text, jsonb, text) from public;
revoke execute on function public.sync_history(text, int) from public;
revoke execute on function public.sync_history_get(text, bigint) from public;

grant execute on function public._blocks_hash(text)     to anon, authenticated;
grant execute on function public.sync_pull(text)        to anon, authenticated;
grant execute on function public.sync_push(text, jsonb, text) to anon, authenticated;
grant execute on function public.sync_history(text, int) to anon, authenticated;
grant execute on function public.sync_history_get(text, bigint) to anon, authenticated;
