-- Apply once to a fresh project using the SQL Editor, or through migrations.
-- No public wardrobe access. Guest sharing will be a separate server-side feature.
begin;

create schema if not exists closet_private;
revoke all on schema closet_private from public, anon, authenticated;

create function closet_private.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function closet_private.touch_updated_at() from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clothing_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  category text not null check (category in ('tops', 'bottoms', 'shoes', 'outerwear', 'accessories')),
  subcategory text check (char_length(subcategory) <= 40),
  color text not null default '' check (char_length(color) <= 40),
  tags text[] not null default '{}' check (cardinality(tags) <= 10 and array_position(tags, null) is null),
  storage_path text not null unique,
  is_shareable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A stable owner/item/category key makes cross-owner and wrong-category
  -- outfit references impossible even if a caller bypasses the application.
  unique (owner_id, id, category),
  check (storage_path ~ ('^' || owner_id::text || '/[0-9a-f-]{36}\.jpg$'))
);

create table public.outfits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  top_item_id uuid not null,
  top_category text not null default 'tops' check (top_category in ('tops', 'outerwear')),
  bottom_item_id uuid not null,
  bottom_category text generated always as ('bottoms'::text) stored,
  shoe_item_id uuid,
  shoe_category text generated always as ('shoes'::text) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (owner_id, top_item_id, top_category)
    references public.clothing_items(owner_id, id, category) on delete cascade,
  foreign key (owner_id, bottom_item_id, bottom_category)
    references public.clothing_items(owner_id, id, category) on delete cascade,
  foreign key (owner_id, shoe_item_id, shoe_category)
    references public.clothing_items(owner_id, id, category) on delete cascade
);

create index clothing_items_owner_created on public.clothing_items(owner_id, created_at desc, id);
create index clothing_items_owner_category on public.clothing_items(owner_id, category);
create index outfits_owner_created on public.outfits(owner_id, created_at desc, id);
create index outfits_top_reference on public.outfits(owner_id, top_item_id, top_category);
create index outfits_bottom_reference on public.outfits(owner_id, bottom_item_id, bottom_category);
create index outfits_shoe_reference on public.outfits(owner_id, shoe_item_id, shoe_category);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function closet_private.touch_updated_at();
create trigger clothing_items_updated_at before update on public.clothing_items
  for each row execute function closet_private.touch_updated_at();
create trigger outfits_updated_at before update on public.outfits
  for each row execute function closet_private.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.clothing_items enable row level security;
alter table public.outfits enable row level security;

revoke all on public.profiles, public.clothing_items, public.outfits from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.clothing_items, public.outfits to authenticated;

create policy profiles_owner on public.profiles for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
create policy clothing_items_owner on public.clothing_items for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy outfits_owner on public.outfits for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- Only compressed JPEGs. The application will use fresh UUID filenames,
-- for example <user-id>/<photo-id>.jpg, and save that path in clothing_items.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('closet-images', 'closet-images', false, 600000, array['image/jpeg']);

create policy closet_images_read on storage.objects for select to authenticated
  using (bucket_id = 'closet-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy closet_images_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'closet-images' and name ~ ('^' || (select auth.uid())::text || '/[0-9a-f-]{36}\.jpg$'));
create policy closet_images_update on storage.objects for update to authenticated
  using (bucket_id = 'closet-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'closet-images' and name ~ ('^' || (select auth.uid())::text || '/[0-9a-f-]{36}\.jpg$'));
create policy closet_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'closet-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

commit;
