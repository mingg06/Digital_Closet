import { readFile, readdir } from 'node:fs/promises'
import { before, after, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'

const db = new PGlite()
const owner = '11111111-1111-4111-8111-111111111111'
const other = '22222222-2222-4222-8222-222222222222'
const top = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const bottom = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const foreignTop = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const outfit = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'

before(async () => {
  // Minimal stand-ins for Supabase-managed schemas. PostgreSQL executes the
  // real migration and RLS; hosted Auth/Storage HTTP services are not simulated.
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    create schema storage;
    create table storage.buckets (
      id text primary key, name text, public boolean,
      file_size_limit bigint, allowed_mime_types text[]
    );
    create table storage.objects (
      id uuid primary key default gen_random_uuid(), bucket_id text, name text
    );
    alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql immutable as
      $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
    grant usage on schema storage to anon, authenticated;
    grant select, insert, update, delete on storage.objects to anon, authenticated;
  `)
  const migrationDir = new URL('../migrations/', import.meta.url)
  for (const file of (await readdir(migrationDir))
    .filter((file) => file.endsWith('.sql'))
    .sort()) {
    await db.exec(await readFile(new URL(file, migrationDir), 'utf8'))
  }
})

after(async () => db.close())

beforeEach(async () => {
  await db.exec(`
    truncate auth.users cascade;
    truncate storage.objects;
    insert into auth.users values ('${owner}'), ('${other}');
    insert into public.clothing_items (id, owner_id, name, category, storage_path) values
      ('${top}', '${owner}', 'Shirt', 'tops', '${owner}/${top}.jpg'),
      ('${bottom}', '${owner}', 'Jeans', 'bottoms', '${owner}/${bottom}.jpg'),
      ('${foreignTop}', '${other}', 'Other shirt', 'tops', '${other}/${foreignTop}.jpg');
    insert into public.outfits (id, owner_id, name, top_item_id, bottom_item_id)
      values ('${outfit}', '${owner}', 'Everyday', '${top}', '${bottom}');
    insert into storage.objects (bucket_id, name) values
      ('closet-images', '${owner}/${top}.jpg'),
      ('closet-images', '${other}/${foreignTop}.jpg');
  `)
})

async function asRole(role, userId, run) {
  return db.transaction(async (tx) => {
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [
      userId ?? '',
    ])
    await tx.exec(`set local role ${role}`)
    return run(tx)
  })
}

test('signed-out users cannot access any owner tables', async () => {
  for (const table of ['profiles', 'clothing_items', 'outfits']) {
    for (const sql of [
      `select * from public.${table}`,
      `insert into public.${table} default values`,
      `update public.${table} set created_at = now()`,
      `delete from public.${table}`,
    ]) {
      await assert.rejects(
        asRole('anon', null, (tx) => tx.exec(sql)),
        /permission denied/,
      )
    }
  }
})

test('owners can read only their clothing and saved outfits', async () => {
  await asRole('authenticated', owner, async (tx) => {
    assert.equal(
      (await tx.query('select * from public.clothing_items')).rows.length,
      2,
    )
    assert.equal(
      (await tx.query('select * from public.outfits')).rows.length,
      1,
    )
  })
  await asRole('authenticated', other, async (tx) => {
    assert.equal(
      (await tx.query('select * from public.clothing_items')).rows.length,
      1,
    )
    assert.equal(
      (await tx.query('select * from public.outfits')).rows.length,
      0,
    )
  })
})

test('owner CRUD and timestamp trigger work with restricted function privileges', async () => {
  await asRole('authenticated', owner, async (tx) => {
    const created = await tx.query(
      `insert into public.clothing_items
      (name, category, storage_path) values ('Coat', 'outerwear', $1) returning id, owner_id`,
      [`${owner}/${outfit}.jpg`],
    )
    assert.equal(created.rows[0].owner_id, owner)
    const id = created.rows[0].id
    const saved = await tx.query(
      `insert into public.outfits (name, top_item_id, top_category, bottom_item_id)
       values ('Winter outfit', $1, 'outerwear', $2) returning id, top_item_id, bottom_item_id`,
      [id, bottom],
    )
    assert.equal(saved.rows[0].top_item_id, id)
    assert.equal(saved.rows[0].bottom_item_id, bottom)
    assert.equal(
      (
        await tx.query(
          "update public.outfits set name = 'Updated outfit' where id = $1 returning id",
          [saved.rows[0].id],
        )
      ).rows.length,
      1,
    )
    assert.equal(
      (
        await tx.query(
          'delete from public.outfits where id = $1 returning id',
          [saved.rows[0].id],
        )
      ).rows.length,
      1,
    )
    assert.equal(
      (
        await tx.query(
          "update public.clothing_items set name = 'Winter coat' where id = $1 returning id",
          [id],
        )
      ).rows.length,
      1,
    )
    assert.equal(
      (
        await tx.query(
          'delete from public.clothing_items where id = $1 returning id',
          [id],
        )
      ).rows.length,
      1,
    )
  })
})

test('another account cannot update or delete owner rows', async () => {
  await asRole('authenticated', other, async (tx) => {
    for (const table of ['clothing_items', 'outfits']) {
      assert.equal(
        (
          await tx.query(
            `update public.${table} set name = 'Stolen' where owner_id = $1 returning id`,
            [owner],
          )
        ).rows.length,
        0,
      )
      assert.equal(
        (
          await tx.query(
            `delete from public.${table} where owner_id = $1 returning id`,
            [owner],
          )
        ).rows.length,
        0,
      )
    }
  })
})

test('callers cannot insert under another owner or transfer ownership', async () => {
  await assert.rejects(
    asRole('authenticated', other, (tx) =>
      tx.query(
        `insert into public.clothing_items
    (owner_id, name, category, storage_path) values ($1, 'Stolen', 'tops', $2)`,
        [owner, `${owner}/${outfit}.jpg`],
      ),
    ),
    /row-level security/,
  )
  await assert.rejects(
    asRole('authenticated', owner, (tx) =>
      tx.query(
        `update public.clothing_items
    set owner_id = $1, storage_path = $2 where id = $3`,
        [other, `${other}/${top}.jpg`, top],
      ),
    ),
    /row-level security/,
  )
  await assert.rejects(
    asRole('authenticated', owner, (tx) =>
      tx.query('update public.outfits set owner_id = $1 where id = $2', [
        other,
        outfit,
      ]),
    ),
  )
})

test('saved outfits reject cross-owner, missing, and wrong-category references', async () => {
  for (const invalidTop of [foreignTop, bottom, outfit]) {
    await assert.rejects(
      asRole('authenticated', owner, (tx) =>
        tx.query(
          `insert into public.outfits
      (name, top_item_id, bottom_item_id) values ('Invalid', $1, $2)`,
          [invalidTop, bottom],
        ),
      ),
      /foreign key/,
    )
  }
  await assert.rejects(
    asRole('authenticated', owner, (tx) =>
      tx.query(
        `update public.outfits
    set bottom_item_id = $1 where id = $2`,
        [top, outfit],
      ),
    ),
    /foreign key/,
  )
})

test('category edits cannot invalidate outfits; deleting a piece deletes dependent outfits', async () => {
  await assert.rejects(
    asRole('authenticated', owner, (tx) =>
      tx.query(
        `update public.clothing_items
    set category = 'accessories' where id = $1`,
        [top],
      ),
    ),
    /foreign key/,
  )
  await asRole('authenticated', owner, async (tx) => {
    await tx.query('delete from public.clothing_items where id = $1', [top])
    assert.equal(
      (await tx.query('select * from public.outfits')).rows.length,
      0,
    )
    assert.equal(
      (await tx.query('select * from public.clothing_items')).rows.length,
      1,
    )
  })
})

test('profiles must be created explicitly by their own user', async () => {
  await asRole('authenticated', owner, async (tx) => {
    await tx.query(
      "insert into public.profiles (id, display_name) values ($1, 'Owner')",
      [owner],
    )
    await tx.exec("update public.profiles set display_name = 'Updated'")
    assert.equal(
      (await tx.query('select display_name from public.profiles')).rows[0]
        .display_name,
      'Updated',
    )
  })
  await asRole('authenticated', other, async (tx) => {
    assert.equal(
      (await tx.query('select * from public.profiles')).rows.length,
      0,
    )
    assert.equal(
      (
        await tx.query(
          'update public.profiles set display_name = $1 returning id',
          ['No'],
        )
      ).rows.length,
      0,
    )
  })
  await assert.rejects(
    asRole('authenticated', other, (tx) =>
      tx.query('insert into public.profiles (id) values ($1)', [owner]),
    ),
    /row-level security/,
  )
})

test('signed-out Storage reads and writes are blocked', async () => {
  await asRole('anon', null, async (tx) => {
    assert.equal(
      (await tx.query('select * from storage.objects')).rows.length,
      0,
    )
    assert.equal(
      (await tx.query('delete from storage.objects returning id')).rows.length,
      0,
    )
    assert.equal(
      (await tx.query("update storage.objects set name = 'bad' returning id"))
        .rows.length,
      0,
    )
  })
  await assert.rejects(
    asRole('anon', null, (tx) =>
      tx.query(
        `insert into storage.objects
    (bucket_id, name) values ('closet-images', $1)`,
        [`${owner}/${outfit}.jpg`],
      ),
    ),
    /row-level security/,
  )
})

test('Storage owners can CRUD only files under their own folder', async () => {
  await asRole('authenticated', owner, async (tx) => {
    assert.equal(
      (await tx.query('select * from storage.objects')).rows.length,
      1,
    )
    await tx.query(
      "insert into storage.objects (bucket_id, name) values ('closet-images', $1)",
      [`${owner}/${outfit}.jpg`],
    )
    assert.equal(
      (await tx.query('update storage.objects set name = name returning id'))
        .rows.length,
      2,
    )
    assert.equal(
      (await tx.query('delete from storage.objects returning id')).rows.length,
      2,
    )
  })
  assert.equal((await db.query('select * from storage.objects')).rows.length, 1)
  for (const [bucket, path] of [
    ['closet-images', `${other}/${top}.jpg`],
    ['closet-images', `${owner}/photo.png`],
    ['another-bucket', `${owner}/${outfit}.jpg`],
  ]) {
    await assert.rejects(
      asRole('authenticated', owner, (tx) =>
        tx.query(
          'insert into storage.objects (bucket_id, name) values ($1, $2)',
          [bucket, path],
        ),
      ),
      /row-level security/,
    )
  }
})

test('Storage objects cannot be moved to another owner', async () => {
  await assert.rejects(
    asRole('authenticated', owner, (tx) =>
      tx.query('update storage.objects set name = $1', [`${other}/${top}.jpg`]),
    ),
    /row-level security/,
  )
})

test('bucket is private and restricts image type and size', async () => {
  const {
    rows: [bucket],
  } = await db.query("select * from storage.buckets where id = 'closet-images'")
  assert.equal(bucket.public, false)
  assert.equal(Number(bucket.file_size_limit), 600000)
  assert.deepEqual(bucket.allowed_mime_types, ['image/jpeg'])
})
