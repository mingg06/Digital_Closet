-- Existing links retain selected-piece scope. New links explicitly share the whole closet.
begin;

alter table public.share_links add column share_scope text not null default 'selected'
  check (share_scope in ('selected', 'all'));

create or replace function public.closet_rotate_share(p_owner uuid, p_hash text default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare result public.share_links;
begin
  update public.share_links set revoked_at = now() where owner_id = p_owner and revoked_at is null;
  if p_hash is null then return '{}'::jsonb; end if;
  insert into public.share_links(owner_id, token_hash, share_scope) values (p_owner, p_hash, 'all') returning * into result;
  return jsonb_build_object('id', result.id, 'expiresAt', result.expires_at, 'scope', result.share_scope);
end;
$$;
revoke all on function public.closet_rotate_share(uuid, text) from public, anon, authenticated;
grant execute on function public.closet_rotate_share(uuid, text) to service_role;

create or replace function public.closet_share_access(
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
    from (select * from public.clothing_items where owner_id = link.owner_id and (link.share_scope = 'all' or is_shareable) order by id limit 500) i;
    return jsonb_build_object('items', result, 'expiresAt', link.expires_at, 'scope', link.share_scope);
  elsif p_action = 'image' then
    select storage_path into image_path from public.clothing_items
      where id = p_item and owner_id = link.owner_id and (link.share_scope = 'all' or is_shareable);
    if not found then raise exception 'share_unavailable'; end if;
    return jsonb_build_object('path', image_path);
  end if;

  if p_nickname is null or p_message is null or char_length(p_nickname) > 40 or char_length(p_message) > 500 then
    raise exception 'share_invalid_input';
  end if;
  -- Locks the referenced pieces while checking link scope and inserting.
  perform id from public.clothing_items where owner_id = link.owner_id and (link.share_scope = 'all' or is_shareable)
    and id in (p_top, p_bottom) order by id for share;
  select * into top_piece from public.clothing_items
    where id = p_top and owner_id = link.owner_id and (link.share_scope = 'all' or is_shareable) and category in ('tops', 'outerwear');
  if not found then raise exception 'share_unavailable'; end if;
  select * into bottom_piece from public.clothing_items
    where id = p_bottom and owner_id = link.owner_id and (link.share_scope = 'all' or is_shareable) and category = 'bottoms';
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
