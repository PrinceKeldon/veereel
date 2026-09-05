# VEEREEL PITCH PLATFORM
## Quick Start (5 minutes)

You're here because we just pushed the **authentication foundation** to your GitHub repo.

---

## What's Live Right Now

✅ **Database** — All tables created (Writer, Producer, Pitch, etc.)  
✅ **Authentication** — Signup/login for writers and producers  
✅ **Server Actions** — Pitch submit, browse, bookmark, message  
✅ **Pages** — /writer/signup, /writer/login, /producer/login  

---

## Get It Running Locally

### 1. Update your code
```bash
cd /Users/frankkoine/veereel
git pull origin main
```

### 2. Create database tables
```bash
cd apps/web
npx prisma migrate deploy
```

### 3. Add the password salt
Edit `apps/web/.env` and add:
```
PASSWORD_SALT=anything-random-here
```

### 4. Start dev server
```bash
npm run dev
```

### 5. Test it
- Visit: `http://localhost:3000/writer/signup`
- Create an account
- Login at: `http://localhost:3000/writer/login`

Done! ✅

---

## Then Deploy

```bash
git push origin main
```

Vercel auto-deploys. Your app updates in 1 minute.

---

## What's Next (Optional)

Build these UI pages on top of the auth foundation:

- Pitch submission form → `/pitch/new`
- Browse pitches → `/pitches`
- Pitch detail → `/pitch/[id]`
- Writer profile → `/writer/[displayName]`
- Message inbox → `/messages`

All the backend logic is ready. These are just forms/lists.

---

## Questions?

Read: `/Users/frankkoine/veereel/PITCH_PLATFORM_DEPLOYMENT.md`

That's everything. The foundation is solid.

🚀
