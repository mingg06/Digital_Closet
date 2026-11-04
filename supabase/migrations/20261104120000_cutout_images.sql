-- Allow transparent clothing cutouts (WebP, with PNG fallback for browsers
-- that cannot encode WebP) alongside the original compressed JPEGs.
begin;

do $$
declare
  constraint_name text;
begin
  -- The original storage_path check was unnamed; find it by its definition.
  for constraint_name in
    select conname from pg_constraint
    where conrelid = 'public.clothing_items'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%storage_path%.jpg%'
  loop
    execute format('alter table public.clothing_items drop constraint %I', constraint_name);
  end loop;
end
$$;

alter table public.clothing_items
  add constraint clothing_items_storage_path_format
  check (storage_path ~ ('^' || owner_id::text || '/[0-9a-f-]{36}\.(jpg|webp|png)$'));

update storage.buckets
  set allowed_mime_types = array['image/jpeg', 'image/webp', 'image/png']
  where id = 'closet-images';

drop policy closet_images_insert on storage.objects;
drop policy closet_images_update on storage.objects;
create policy closet_images_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'closet-images' and name ~ ('^' || (select auth.uid())::text || '/[0-9a-f-]{36}\.(jpg|webp|png)$'));
create policy closet_images_update on storage.objects for update to authenticated
  using (bucket_id = 'closet-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'closet-images' and name ~ ('^' || (select auth.uid())::text || '/[0-9a-f-]{36}\.(jpg|webp|png)$'));

commit;
