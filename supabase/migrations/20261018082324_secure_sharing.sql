begin;

create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  revoked_at timestamptz,
  read_window timestamptz not null default now(),
  read_count integer not null default 0 check (read_count >= 0),
  suggestion_window timestamptz not null default now(),
  suggestion_count integer not null default 0 check (suggestion_count >= 0),
  unique (owner_id, id),
  check (expires_at > created_at and expires_at <= created_at + interval '7 days')
);
create unique index share_links_one_active on public.share_links(owner_id) where revoked_at is null;

create table public.outfit_suggestions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  share_link_id uuid not null,
  top_item_id uuid not null,
  top_category text not null check (top_category in ('tops', 'outerwear')),
  bottom_item_id uuid not null,
  bottom_category text generated always as ('bottoms'::text) stored,
  nickname text not null default '' check (char_length(nickname) <= 40),
  message text not null default '' check (char_length(message) <= 500),
  created_at timestamptz not null default now(),
  foreign key (owner_id, share_link_id) references public.share_links(owner_id, id) on delete cascade,
  foreign key (owner_id, top_item_id, top_category) references public.clothing_items(owner_id, id, category) on delete cascade,
  foreign key (owner_id, bottom_item_id, bottom_category) references public.clothing_items(owner_id, id, category) on delete cascade
);
create index suggestions_owner_created on public.outfit_suggestions(owner_id, created_at desc, id);
create index suggestions_link on public.outfit_suggestions(owner_id, share_link_id);
create index suggestions_top on public.outfit_suggestions(owner_id, top_item_id, top_category);
create index suggestions_bottom on public.outfit_suggestions(owner_id, bottom_item_id, bottom_category);

alter table public.share_links enable row level security;
alter table public.outfit_suggestions enable row level security;
revoke all on public.share_links, public.outfit_suggestions from public, anon, authenticated;
grant select on public.share_links to authenticated;
grant select, delete on public.outfit_suggestions to authenticated;
grant select, insert, update, delete on public.share_links, public.outfit_suggestions to service_role;
grant select on public.clothing_items to service_role;
-- PostgreSQL row locks require UPDATE privilege on at least one column.
grant update(is_shareable) on public.clothing_items to service_role;
grant usage on schema public to service_role;
create policy share_links_owner_read on public.share_links for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy suggestions_owner_read on public.outfit_suggestions for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy suggestions_owner_delete on public.outfit_suggestions for delete to authenticated
  using ((select auth.uid()) = owner_id);

-- Service-only, SECURITY INVOKER functions: the public RPC interface grants
-- neither anonymous nor authenticated clients the ability to bypass RLS.
-- The Edge Function derives p_owner from Auth.getUser, never from request JSON.
create function public.closet_rotate_share(p_owner uuid, p_hash text default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare result public.share_links;
begin
  update public.share_links set revoked_at = now() where owner_id = p_owner and revoked_at is null;
  if p_hash is null then return '{}'::jsonb; end if;
  insert into public.share_links(owner_id, token_hash) values (p_owner, p_hash) returning * into result;
  return jsonb_build_object('id', result.id, 'expiresAt', result.expires_at);
end;
$$;
revoke all on function public.closet_rotate_share(uuid, text) from public, anon, authenticated;
grant execute on function public.closet_rotate_share(uuid, text) to service_role;

create function public.closet_share_access(
  p_hash text, p_action text, p_item uuid default null,
  p_top uuid default null, p_bottom uuid default null,
  p_nickname text default '', p_message text default ''
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  link public.share_links;
  top_piece public.clothing_items;
  bottom_piece public.clothing_items;
  image_path text;
  result jsonb;
begin
  if p_hash is null or p_action is null or p_hash !~ '^[0-9a-f]{64}$' or p_action not in ('list', 'image', 'suggest') then
    raise exception 'share_invalid_input';
  end if;
  -- Serializes guest requests with revocation and counters across all workers.
  select * into link from public.share_links
    where token_hash = p_hash and revoked_at is null and expires_at > now() for update;
  if not found then raise exception 'share_unavailable'; end if;
  if link.read_window <= now() - interval '1 minute' then
    link.read_count := 0;
    link.read_window := now();
  end if;
  if link.read_count >= 240 then raise exception 'share_rate_limited'; end if;
  update public.share_links set read_count = link.read_count + 1, read_window = link.read_window where id = link.id;

  if p_action = 'list' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', i.id, 'name', i.name, 'category', i.category, 'color', i.color,
      'subcategory', i.subcategory, 'tags', i.tags
    ) order by i.id), '[]'::jsonb) into result
    from (select * from public.clothing_items where owner_id = link.owner_id and is_shareable order by id limit 500) i;
    return jsonb_build_object('items', result, 'expiresAt', link.expires_at);
  elsif p_action = 'image' then
    select storage_path into image_path from public.clothing_items
      where id = p_item and owner_id = link.owner_id and is_shareable;
    if not found then raise exception 'share_unavailable'; end if;
    return jsonb_build_object('path', image_path);
  end if;

  if p_nickname is null or p_message is null or char_length(p_nickname) > 40 or char_length(p_message) > 500 then
    raise exception 'share_invalid_input';
  end if;
  -- Locks the referenced pieces while checking sharing flags and inserting.
  perform id from public.clothing_items where owner_id = link.owner_id and is_shareable
    and id in (p_top, p_bottom) order by id for share;
  select * into top_piece from public.clothing_items
    where id = p_top and owner_id = link.owner_id and is_shareable and category in ('tops', 'outerwear');
  if not found then raise exception 'share_unavailable'; end if;
  select * into bottom_piece from public.clothing_items
    where id = p_bottom and owner_id = link.owner_id and is_shareable and category = 'bottoms';
  if not found then raise exception 'share_unavailable'; end if;
  if link.suggestion_window <= now() - interval '1 hour' then
    link.suggestion_count := 0;
    link.suggestion_window := now();
  end if;
  if link.suggestion_count >= 10 then raise exception 'share_rate_limited'; end if;
  update public.share_links set suggestion_count = link.suggestion_count + 1,
    suggestion_window = link.suggestion_window where id = link.id;
  insert into public.outfit_suggestions(owner_id, share_link_id, top_item_id, top_category, bottom_item_id, nickname, message)
    values (link.owner_id, link.id, top_piece.id, top_piece.category, bottom_piece.id, btrim(p_nickname), btrim(p_message));
  return '{"ok":true}'::jsonb;
end;
$$;
revoke all on function public.closet_share_access(text, text, uuid, uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.closet_share_access(text, text, uuid, uuid, uuid, text, text) to service_role;

commit;
