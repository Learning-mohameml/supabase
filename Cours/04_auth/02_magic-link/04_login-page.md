# Step 3 — Update the Login Page

## Goal

Add a Magic Link form (email input + submit button) to the existing login page alongside the Google OAuth button.

---

## 1. The updated login page

The login page should offer both auth methods. The UX pattern:

```
┌──────────────────────────────┐
│         Todos                │
│   Sign in to manage tasks    │
│                              │
│  ┌──────────────────────┐    │
│  │  your@email.com      │    │
│  └──────────────────────┘    │
│  ┌──────────────────────┐    │
│  │  Send Magic Link     │    │
│  └──────────────────────┘    │
│                              │
│  ──── or continue with ────  │
│                              │
│  ┌──────────────────────┐    │
│  │  G  Sign in with Google│   │
│  └──────────────────────┘    │
│                              │
└──────────────────────────────┘
```

---

## 2. What changes

The login page needs:
1. An email input field (controlled state)
2. A "Send Magic Link" button that calls `signInWithMagicLink(email)`
3. Loading state while the email is being sent
4. Success feedback ("Check your email!")
5. Error feedback (toast on failure)
6. A divider between Magic Link and Google OAuth

---

## 3. Key implementation details

### Form handling

```tsx
const [email, setEmail] = useState("")
const [loading, setLoading] = useState(false)
const [sent, setSent] = useState(false)
```

Three states:
- **Default**: Email input + "Send Magic Link" button
- **Loading**: Button disabled, shows spinner
- **Sent**: Success message — "Check your email!"

### The submit handler

```tsx
const handleMagicLink = async () => {
  setLoading(true)
  try {
    await signInWithMagicLink(email)
    setSent(true)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Failed to send link")
  } finally {
    setLoading(false)
  }
}
```

Important patterns:
- `try/catch` because `signInWithMagicLink()` throws on error
- `setSent(true)` to show "check your email" instead of the form
- `finally` to reset loading state even on error

### Email validation

HTML5 `type="email"` provides basic validation, but you should also disable the button when the email is empty:

```tsx
<Button disabled={!email || loading}>
  Send Magic Link
</Button>
```

For production, consider more robust validation (Chapter 06).

### After sending: "Check your email" state

Once the email is sent, replace the form with a success message:

```tsx
{sent ? (
  <div>
    <p>Check your email for the login link!</p>
    <p className="text-sm text-muted-foreground">
      We sent a link to {email}
    </p>
    <Button variant="ghost" onClick={() => setSent(false)}>
      Try a different email
    </Button>
  </div>
) : (
  // ... email input + send button
)}
```

This prevents confused users from clicking "Send" again and hitting rate limits.

---

## 4. The divider pattern

A visual separator between auth methods is standard UX:

```tsx
<div className="relative">
  <div className="absolute inset-0 flex items-center">
    <span className="w-full border-t" />
  </div>
  <div className="relative flex justify-center text-xs uppercase">
    <span className="bg-card px-2 text-muted-foreground">
      or continue with
    </span>
  </div>
</div>
```

This creates the classic "── or continue with ──" line.

---

## 5. UX considerations

### Magic Link first, Google second

Put Magic Link (email) above Google because:
- Email is universal — everyone has one
- Google is a convenience option for those who prefer it
- Email-first is the standard pattern (GitHub, Linear, Notion all do this)

### Don't use `<form>` with `action`

Since this is a Client Component that calls a browser-side function (not a Server Action), use `onClick` or `onSubmit` with `preventDefault`:

```tsx
<form onSubmit={(e) => { e.preventDefault(); handleMagicLink() }}>
```

Using a `<form>` is still good practice because:
- Enter key submits the form
- Better accessibility
- Screen readers understand forms

### Show which email was used

After sending, show the email address: "We sent a link to **john@example.com**". This helps users who have multiple email accounts know which inbox to check.

---

## 6. What you should NOT do

### Don't auto-redirect after sending

```tsx
// BAD — user hasn't clicked the link yet!
await signInWithMagicLink(email)
router.push('/dashboard')

// GOOD — show "check your email" and wait
await signInWithMagicLink(email)
setSent(true)
```

The user isn't logged in after `signInWithOtp()` — they still need to click the link.

### Don't hide Google OAuth

Both methods should be visible. Some users will prefer Google (faster, no email switching), others will prefer Magic Link (no Google account, privacy concerns).

---

## Summary

| Component | What to do |
|-----------|-----------|
| Email input | Controlled input with `useState` |
| Submit button | Calls `signInWithMagicLink(email)`, shows loading state |
| Success state | "Check your email!" with option to try different email |
| Error handling | Toast notification on failure |
| Google button | Kept as-is, below a divider |
| Form | `<form>` with `onSubmit` for Enter key support |

---

**Next:** [05_local-testing.md](./05_local-testing.md) — Test the Magic Link flow end-to-end with Inbucket
