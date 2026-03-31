# Task 05 — Avatar Upload (Supabase Storage)

## Objective

Add custom avatar upload to the profile page. Users can click their avatar to upload a new image, replacing the default Google avatar. This teaches **Supabase Storage** — buckets, storage RLS policies, client-side file uploads, and public URLs.

## Current State

- Profile page shows Google avatar from `user_metadata.avatar_url`
- No storage bucket, no upload capability
- Storage is enabled in `config.toml` but no buckets configured

## Not in Scope

- Image cropping/resizing UI, drag-and-drop, multiple profile images

---

## Steps

### Phase A — Create storage bucket via migration *(user)*

> **Learning goal:** Supabase Storage buckets are backed by `storage.buckets` and `storage.objects` tables. You create them via SQL migrations just like regular tables. Public buckets serve files without auth tokens.

- [ ] **A1.** Create migration:
  ```bash
  supabase migration new create_avatars_bucket
  ```

- [ ] **A2.** Write the SQL to insert the bucket:
  ```sql
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'avatars',
    'avatars',
    true,
    2097152,  -- 2MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  );
  ```

**Hints:**
- `public = true` means files are accessible via public URL without auth token (good for avatars)
- `file_size_limit` is in bytes (2MB = 2 * 1024 * 1024 = 2097152)
- `allowed_mime_types` restricts upload to images only — server-side validation

---

### Phase B — Storage RLS policies *(user)*

> **Learning goal:** Storage uses the same RLS system as regular tables, but on `storage.objects`. The `name` column contains the file path (e.g., `{user_id}/avatar.png`). Use `(storage.foldername(name))[1]` to extract the first folder segment and match it to `auth.uid()`.

- [ ] **B1.** In the same migration (or a new one), add RLS policies:

  **SELECT** — anyone can read (public bucket, but policy still needed):
  ```sql
  CREATE POLICY "Public avatar read access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
  ```

  **INSERT** — users upload to their own folder only:
  ```sql
  CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
  ```

  **UPDATE** — users can overwrite their own files:
  ```sql
  CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
  ```

  **DELETE** — users can delete their own files:
  ```sql
  CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
  ```

- [ ] **B2.** Apply migration:
  ```bash
  supabase db reset
  ```

- [ ] **B3.** Verify in Studio: go to Storage → `avatars` bucket should exist

---

### Phase C — Storage helper functions *(user implements, Claude reviews)*

> **Learning goal:** Use `supabase.storage.from('avatars').upload()` for client-side uploads (uses anon key + RLS). Use `getPublicUrl()` to get the permanent URL. Upload uses `upsert: true` to overwrite existing files.

- [ ] **C1.** Create `lib/supabase/storage/avatars.ts` with:

  **`uploadAvatar(userId: string, file: File)`** — client-side function:
  - File path: `${userId}/avatar` (one file per user, overwritten each time)
  - Call `supabase.storage.from('avatars').upload(path, file, { upsert: true })`
  - Return the public URL via `supabase.storage.from('avatars').getPublicUrl(path)`
  - After upload, call `supabase.auth.updateUser({ data: { avatar_url: publicUrl } })` to save to metadata

  **`deleteAvatar(userId: string)`** — client-side function:
  - Call `supabase.storage.from('avatars').remove([`${userId}/avatar`])`

**Hints:**
- These run in the **browser** — import `createClient` from `lib/supabase/clients/client.ts`
- `upsert: true` replaces the existing file without needing to delete first
- `getPublicUrl()` returns a deterministic URL — it works even before the file exists
- Append `?t=${Date.now()}` to the URL as cache-buster so the browser shows the new image

- [ ] **C2.** Update `deleteAccount()` in `lib/supabase/auth/actions.ts`:
  - Before deleting the auth user, delete the avatar from storage:
    ```typescript
    await supabase.storage.from('avatars').remove([`${user.id}/avatar`])
    ```
  - This runs server-side with the regular client (RLS allows owner to delete)

---

### Phase D — Avatar upload UI *(Claude generates)*

- [ ] **D1.** Create `components/profile/avatar-upload.tsx` — Client Component:
  - Show current avatar (large, clickable)
  - Hidden file input triggered by click
  - Accept only `image/jpeg, image/png, image/webp, image/gif`
  - Show loading state during upload
  - Call `uploadAvatar()` on file select
  - Call `router.refresh()` after success to update server data
  - Toast on success/error

- [ ] **D2.** Update `components/profile/profile-view.tsx`:
  - Replace the static Avatar display with the new `AvatarUpload` component
  - Pass `userId` and `avatarUrl` as props

---

### Phase E — Test *(user)*

- [ ] **E1.** Go to `/dashboard/profile` — see current Google avatar
- [ ] **E2.** Click avatar → select a JPG/PNG → avatar updates immediately
- [ ] **E3.** Refresh page → new avatar persists (stored in Storage + metadata)
- [ ] **E4.** Check Studio → Storage → `avatars` → `{user_id}/avatar` file exists
- [ ] **E5.** Upload again → old file replaced (not duplicated)
- [ ] **E6.** Try uploading a `.txt` file → should be rejected (MIME type restriction)
- [ ] **E7.** Delete account → avatar file removed from storage

---

## Division of Work

| Who | What |
|-----|------|
| **User** | Phases A, B, C, E |
| **Claude** | Phase D |

---

## Key Supabase Storage APIs

| API | What it does | Runs where |
|-----|-------------|------------|
| `supabase.storage.from('avatars').upload(path, file, { upsert })` | Upload/replace a file | Browser |
| `supabase.storage.from('avatars').getPublicUrl(path)` | Get permanent public URL | Browser |
| `supabase.storage.from('avatars').remove([path])` | Delete file(s) | Browser or Server |
| `supabase.auth.updateUser({ data: { avatar_url } })` | Save URL to user metadata | Browser |
| `storage.foldername(name)` | PG function — extracts folder segments from path | SQL (RLS policies) |

---

## Done Criteria

- [ ] `avatars` bucket exists with public access, 2MB limit, image MIME types only
- [ ] RLS policies prevent uploading to other users' folders
- [ ] Upload from profile page works — file appears in Storage
- [ ] New avatar URL saved to `user_metadata.avatar_url`
- [ ] Page refresh shows the new avatar (not cached old one)
- [ ] Replacing avatar overwrites the file (no duplicates)
- [ ] Account deletion removes avatar from storage
- [ ] Non-image files rejected on upload
