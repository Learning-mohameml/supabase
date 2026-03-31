# Task 08 — Magic Link Authentication

## Objective

Add passwordless email login (Magic Link) alongside the existing Google OAuth. Users can choose either method on the login page.

## What's already done

- [x] `signInWithMagicLink(email)` function in `lib/supabase/auth/client.ts`
- [x] `/auth/callback` route — works for both OAuth and Magic Link (PKCE flow)
- [x] Middleware (proxy.ts) — auth-method agnostic
- [x] Supabase email auth — enabled by default in `config.toml`

## Completed work

### Phase A — Email template ✅

- [x] Create `supabase/templates/` folder
- [x] Create `supabase/templates/magic_link.html` — branded HTML email with:
  - App name + checkmark icon
  - Clear "Log in" call-to-action button using `{{ .ConfirmationURL }}`
  - Expiry notice ("This link expires in 1 hour")
  - Ignore notice ("If you didn't request this...")
  - Inline CSS only (email clients strip `<style>` tags)
- [x] Add template config to `config.toml`:
  ```toml
  [auth.email.template.magic_link]
  subject = "Your login link for Todos"
  content_path = "./supabase/templates/magic_link.html"
  ```
- [x] Restart Supabase — templates load at startup
- [x] Verified in Inbucket (`http://127.0.0.1:54324`) that the custom template renders correctly

### Phase B — Login page redesign ✅

- [x] Add email input field (controlled state)
- [x] Add "Send Magic Link" button that calls `signInWithMagicLink(email)`
- [x] Add loading state while email is sending
- [x] Add success state — "Check your email!" with the email address shown and option to try different email
- [x] Add error handling — toast on failure (rate limit, invalid email, etc.)
- [x] Add "or continue with" divider between Magic Link and Google OAuth
- [x] Magic Link form on top, Google button below the divider
- [x] Form uses `<form>` with `onSubmit` for Enter key support
- [x] Disable send button when email is empty or loading
- [x] Restyled `/auth/auth-code-error` page to match login page design

### Phase C — Testing

- [x] Send Magic Link to `test@example.com`
- [x] Open Inbucket, verify custom branded email template
- [x] Click link in Inbucket — redirected to dashboard, logged in
- [x] Verify session persists on page refresh
- [x] Test expired/used link → redirected to styled `/auth/auth-code-error`
- [x] Test rate limit → error toast shown
- [x] Test Google login still works (no regression)
- [x] Test same email with Google + Magic Link → single account, two providers

## Files modified

| File | Change |
|------|--------|
| `supabase/templates/magic_link.html` | Created branded email template |
| `supabase/config.toml` | Added `[auth.email.template.magic_link]` |
| `app/login/page.tsx` | Redesigned with email form + divider + Google |
| `app/auth/auth-code-error/page.tsx` | Restyled to match login page design |
