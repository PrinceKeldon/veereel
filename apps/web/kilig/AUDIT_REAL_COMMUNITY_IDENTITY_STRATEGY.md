# Kilig Audit: Real Community Identity Strategy

## Executive Summary

**Good news:** Kilig's architecture is ~80% aligned with the proposed strategy. The User/Curator/Platform separation is already built into the schema, and the two-phase onboarding (anonymous claim → email attachment) is already implemented.

**Gap analysis:** Email verification, password recovery, and the Platform account UI don't exist yet — but the schema supports all three, and the architecture won't require retrofitting.

---

## What's Already Right ✅

### 1. Schema Structure (Excellent)

**Current state:**
```
USER (email, passwordHash, emailVerifiedAt)
  ├─ CURATOR (displayName, userId)
  └─ PLATFORM (name, slug, isVerified, officialCollections)
```

**Assessment:** This is exactly what the strategy recommends. One `User` can have either a `Curator` or a `Platform` profile (via unique foreign keys). The schema already supports:
- Email-based identity
- Password-protected accounts
- Email verification tracking
- Platform verification status
- Platform-specific collections

**What's right:**
- ✅ User model exists with email field (unique)
- ✅ passwordHash is nullable (allows magic-link-only accounts later)
- ✅ emailVerifiedAt tracks verification state
- ✅ Curator and Platform are separate, both linked to User
- ✅ Platform has isVerified flag for official badge
- ✅ Platform can have official collections (separate from fan collections)

### 2. Two-Phase Onboarding (Excellent)

**Current flow:**
1. **Phase 1:** `/claim` → user types display name → cookie-based identity → **instant, frictionless**
2. **Phase 2:** `/reclaim` → email + password → persistent account → triggered by identity-gated actions

**Code evidence:**
- `claimDisplayName()`: Creates Curator with just a name (no User)
- `reclaimCurator()`: Attaches User (email + password) on first gated action
- `requireReclaimedCurator()`: Guards collection creation, publishing, etc.

**Assessment:** This is smart. It gives the prototype frictionless onboarding while allowing real accounts to attach later.

**What's right:**
- ✅ Anonymous claim is instant (no email barrier)
- ✅ Email is only required when needed (creating collections, publishing)
- ✅ User can't lose their curator name because it's now linked to a persistent User account
- ✅ Can sign in from another device after reclaim
- ✅ Supports the "Kilig never charges people for having taste" principle

---

## What's Missing or Incomplete ⚠️

### 1. Email Verification (Not Implemented)

**Current state:**
- `User.emailVerifiedAt` exists in schema but is **never set**
- No verification email flow
- No resend-verification UI
- No verification status checks

**Risk:**
- Typos in email during reclaim go undetected
- Account recovery becomes impossible if email is wrong
- Platforms can't verify they actually own their domains

**Recommendation:**
- ✅ **Phase 2a (Now):** Add email verification to `reclaimCurator()` flow
  - Generate token, send verification email
  - Don't set `emailVerifiedAt` until link clicked
  - Mark user as "unverified" in UI (can still use account, but show warning)
  
- ✅ **Phase 3 (Later):** Add platform verification
  - Platforms verify domain ownership (DNS TXT or email to admin@ address)
  - Sets `Platform.isVerified` and `verifiedAt`
  - Show badge on their official collections

**Estimated effort:** 4-6 hours (send email, token validation, UI state)

---

### 2. Account Recovery (Not Implemented)

**Current state:**
- No password reset flow
- No "Forgot password?" link
- No recovery email
- If password is lost, account is locked

**Risk:**
- Users lock themselves out
- No way to regain access

**Recommendation:**
- ✅ **Phase 2b (Soon after email verification):** Add password reset
  - `/forgot-password` page
  - Send reset token via email
  - `/reset-password?token=X` page
  - Similar token flow to email verification

**Estimated effort:** 3-4 hours

---

### 3. Platform Account Registration (Structurally Ready, UI Missing)

**Current state:**
- Platform model exists in schema
- **Zero UI for platform registration**
- Admin or backend would need to manually create Platform records
- No platform dashboard

**Assessment:** This is **actually correct for now**. The strategy says: *"Don't build the platform dashboard yet. Just make the architecture capable of distinguishing them."*

The architecture is ready. When the first platform (ReelShort, FlareFlow, etc.) wants access, you can:
1. Manually create a Platform record pointing to their User
2. Build the platform registration flow if it becomes frequent

**Recommendation:**
- ✅ **Phase 4 (When a platform requests access):** Build platform registration
  - `/platform/register` page
  - Platform claims name (similar to curator)
  - Platform claims domain and verifies ownership
  - Gets unique slug for collections
  - Admin approval optional (could auto-approve if domain verified)
  
- ✅ **Phase 5 (Later):** Build platform dashboard
  - Collections management
  - Catalogue tools
  - Analytics (title performance, audience size, etc.)
  - Featured placements (eventually paid)

**Estimated effort (Phase 4):** 6-8 hours | **(Phase 5):** 40+ hours (dashboard, analytics)

---

### 4. Password Reset / Forgot Password (Not Implemented)

**Current state:**
- Only `reclaimCurator()` sets password
- No "Forgot password?" link
- If lost, no recovery path

**Recommendation:**
- Implement as part of email verification phase

---

### 5. Onboarding Copy (Close but Needs Update)

**Current state:**
- ClaimIdentityForm says: **"No password, no email — just a name you publish Collections under."**
- This is accurate for the claim phase, but misleading for new users
- Reclaim page says: "Add an email so you never lose this curator name, and can sign in from another device." ✅ **This is good.**

**Recommendation:**
- Claim page copy is fine for testing
- **Before public launch:** Update to reflect that "Reclaim is coming" or "Email is required to create collections"
- Make it clear that the two-phase flow is intentional, not a bug

---

## What Matches Strategy Perfectly ✅

### ✅ "Kilig never charges people for having taste"
- No paywall on curator accounts
- No subscription required to join
- `claimDisplayName()` is completely free and instant

### ✅ Community-first identity
- Curator identity is public (displayName is unique and visible)
- Collections build reputation
- No vanity badges yet (correct per strategy)

### ✅ Separate from platform/publisher accounts
- User model supports both Curator and Platform
- They don't share the same flows
- Platform collections can be separated from fan collections (officialCollections relation exists)

### ✅ Verified identity (future-proof)
- User.emailVerifiedAt exists
- Platform.isVerified exists
- Architecture supports verification badges later

### ✅ Lightweight onboarding
- Claim is 1 field (name only)
- No bio, genres, location, age, avatar required
- Users build identity through collections (not a profile questionnaire)

### ✅ Email for recovery (planned)
- Email is required at reclaim time
- Architecture supports account recovery once email verification is added

---

## Implementation Roadmap

### Phase 1: Email Verification (Next)
**Effort:** ~5 hours
**Blocks:** Nothing critical (good to have before first platform inquiry)

Steps:
1. Add email verification token logic (generate, validate, expire)
2. Send verification email after reclaim
3. Require verified email before creating collections (or show warning state)
4. Add UI for "resend verification email"

**Files to create/modify:**
- `src/lib/emailVerification.ts` (new)
- `src/app/verify-email/page.tsx` (new)
- `src/components/ReclaimForm.tsx` (add verification state)
- `src/lib/curator-actions.ts` (update requireReclaimedCurator check)

### Phase 2: Password Recovery (After Phase 1)
**Effort:** ~3-4 hours

Steps:
1. Add forgot-password flow (similar to email verification)
2. `/forgot-password` page
3. `/reset-password?token=X` page
4. Update ReclaimForm to include "Forgot password?" link

### Phase 3: Platform Email Verification (After Phase 1)
**Effort:** ~2-3 hours

Steps:
1. When platform registers, send verification email
2. Link to domain ownership (DNS TXT or admin@ email)
3. Set `Platform.isVerified` once verified
4. Show badge on platform's collections

### Phase 4: Platform Registration Flow (When first platform requests access)
**Effort:** ~6-8 hours

Steps:
1. Build `/platform/register` page (mirror of claim flow)
2. Platform claims name + domain
3. Sends verification email to admin@domain
4. Once verified, creates official collections
5. Platform can log in and manage presence

### Phase 5: Platform Dashboard (When you have 2+ platforms)
**Effort:** 40+ hours (depends on scope)

This is the "B2B" layer mentioned in the strategy. Build only when platforms are actually using the system.

---

## Risks & Edge Cases to Consider

### Risk 1: Stale Curator Names
- If someone claims "sarah_watches" but never verifies email, the name is held indefinitely
- **Mitigation:** Add cleanup job that deletes unverified Curators after 30 days of inactivity

### Risk 2: Curator → Platform Transition
- What if a curator starts, then later wants to claim a platform account?
- **Current state:** A User can only have one Curator OR one Platform (unique foreign keys)
- **Mitigation:** This is fine. They can create a second email/account for the platform role. Or, migrate later if needed.

### Risk 3: Platform Name Collision
- What if a real platform tries to claim "reelshort" but a curator already has a collection named that?
- **Current state:** Collection names are NOT unique, so no collision
- **Mitigation:** When platform registers, check if `Platform.name` is already claimed. Platform names are unique (not collection names).

### Risk 4: Account Deletion
- If a curator deletes their account, their collections become orphaned
- **Current state:** Curator deletion cascades to User, but not to collections
- **Recommendation:** Decide policy now
  - Option A: Soft-delete (mark as deleted, keep data)
  - Option B: Hard-delete collections too
  - Option C: Reassign to a "deleted curator" placeholder account

---

## Recommended Next Steps (Priority Order)

### 🔴 Critical (Before public launch)
1. **Email verification** — Users need recovery path
2. **Password reset** — Users locked out otherwise
3. **Delete account flow** — Users need data control

### 🟡 High (Before first platform inquiry)
4. **Platform email verification** — Platforms need real identity
5. **UI copy update** — Make it clear reclaim is coming
6. **Session management hardening** — Cookies should be secure/httpOnly/sameSite

### 🟢 Medium (When platforms request)
7. **Platform registration UI** — `/platform/register` page
8. **Platform collections** — Separate official from fan curations

### 🔵 Low (Nice to have)
9. **Social login (Google/Apple)** — Reduce friction
10. **Magic link auth** — Alternative to passwords
11. **Platform dashboard** — Analytics, bulk tools

---

## Architecture Strengths (Affirmed)

1. **Two-phase onboarding** is smart — frictionless claim + persistent reclaim
2. **User/Curator/Platform separation** prevents future retrofitting
3. **Nullable password** allows magic-link upgrade path
4. **Email verification tracking** is already modeled (just not implemented)
5. **Collections belong to Curator, not User** — right ownership model
6. **Platform verification flag** is ready for badges

---

## Conclusion

**Kilig is 80% aligned with the "Real Community Identity" strategy at the schema and flow level.**

The missing pieces are all **low-risk, well-scoped implementations** that don't require architectural changes:
- Email verification (5 hours)
- Password recovery (3-4 hours)
- Platform verification (2-3 hours)
- Platform registration UI (6-8 hours, when needed)

**The strategy can be executed incrementally without breaking the current system.** Start with email verification and password recovery, then wait to see if/when a platform requests access before building that registration flow.

**The architecture is ready for community scale.** Once these auth pieces are in place, Kilig will be able to support thousands of curators and multiple platform partners without retrofitting.
