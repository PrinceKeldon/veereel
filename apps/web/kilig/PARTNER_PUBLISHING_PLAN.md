# Partner Publishing — Design Doc

## Guiding principle

**Platforms publish, Kilig never gatekeeps discovery — the fandom does.**

A verified partner (ReelShort, DramaBox, ShortMax...) gets a self-publishing
channel into Kilig: what they submit is live immediately, on their own page,
no approval queue. Separately, whether a title earns homepage/trending/hero
placement is decided by the exact same real, floor-gated fandom-signal
machinery every other title on Kilig already goes through — collections,
follows, likes. Never a manual admin pick of "best 15 of 50." Kilig's job is
infrastructure and moderation, not taste-making on a partner's behalf.

This corrects course from an earlier draft of this plan (produced in a
different session, never merged — see "What this replaces" below), which
proposed a second, admin-curated "editorial layer" on top of partner
submissions. That would have given Kilig two competing theories of
"featured" running side by side: one honest (fandom-earned, already built
for `lib/hero.ts` and the homepage rails), one manual (admin-picked). This
plan keeps exactly one.

## What already exists (infrastructure audit)

Read directly from the current schema/codebase, not assumed:

- **`Platform` is not `Producer`.** `Producer` (schema.prisma) is a passive
  metadata credit on `Title.producerId` — no login, no account. `Platform`
  (added for the real-accounts migration) is the actual authenticated
  identity: owns a `User`, carries `isVerified`/`logoUrl`/`slug`, owns
  official `Collection`s via `Collection.platformId`. **`Title` has no
  relation to `Platform` today** — that's the actual gap, not something
  already mostly built.
- **`Availability.platform` is a plain `String`**, unrelated to the
  `Platform` model — free text like `"ReelShort"` on a watch link, currently
  guessed from the submitted URL. Once a verified `Platform` submits
  directly, this can finally be set with certainty instead of guessed.
- **The reusable pattern is `curatorDraft`**, and it's the right shape with
  the gate flipped off. A curator submission goes `isPublished: true,
  curatorDraft: true` — visible only in their own collection, filtered out
  of every discovery surface (verified by grep: homepage rails, hero,
  search, `/titles`, sitemap, similar-titles matching all filter
  `curatorDraft: false`) — until an admin flips one checkbox. `/admin`
  already lists every title with a `via {curator}` attribution line. Partner
  submissions reuse this exact shape, minus the gate itself (justified by
  verification status — the draft gate's actual purpose is spam/quality
  control on anonymous submitters, which doesn't apply to a verified
  partner).
- **The fandom-signal machinery already exists and is real, not
  aspirational**: `TrendingRail`/`FandomTrendingRail` (page.tsx) require
  clearing `MIN_CLICKS_FOR_TRENDING = 5` / `MIN_REACTIONS_FOR_TRENDING = 5`
  or the rail doesn't render. `lib/hero.ts`'s `most_collected` mode requires
  `MIN_COLLECTS_FOR_HERO = 5`. A platform-submitted title becomes eligible
  for all of this the moment it's published — no new mechanism needed.
- **`AvatarSettings.tsx`** is the reusable pattern for the new platform-logo
  form: client-side read → resize → data-URI → server action, no storage
  bucket/CDN required, matches `Platform.logoUrl String?` already sitting
  unused in the schema. Needs one adaptation for logos vs. avatars — see
  below.
- **`TrendPost`** (admin-authored industry buzz, admin-only, `/buzz` only)
  is the right precedent for keeping a partner's own voice contained to
  their own page — not something to extend, but the reasoning to copy for
  `PlatformAnnouncement` below.

## What this replaces

The earlier draft's `PlatformSubmission` model (tracking a
`published → featured` curation status separate from `Title.isPublished`)
is dropped entirely. "Is this featured" already has an honest answer
mechanism (real signal, floor-gated); a second, manual one is redundant at
best and actively confusing at worst. Everything else genuinely useful in
that draft — no approval gate, `trailerUrl` as a simple future-proof
string, immediate partner-page visibility — carries over.

## The four pieces

### 1. Partner submission, no approval gate

- `Title.submittedByPlatformId String?` — mirrors `submittedByCuratorId`
  exactly: nullable, `onDelete: SetNull` (deleting a `Platform` account
  never deletes its titles, just clears attribution, same reasoning as the
  curator account-deletion cascade already built).
- On submit: `isPublished: true` immediately, **no draft-equivalent flag**.
  This is the one deliberate asymmetry from the curator path.
- Same `checkDuplicate()` call the curator path already uses — one dedup
  implementation (Sørensen–Dice bigram matching in
  `lib/discovery/duplicate.ts`), two callers, not two implementations.
- `Availability` record auto-created, `platform` string set to
  `platform.name` directly — certain, not guessed.
- `/platform/[slug]` — the partner's own page, listing everything they've
  submitted. This is their "our catalogue is live" proof point.
- `/admin` dashboard list gains a `via {platform.name}` line alongside the
  existing `via {curator}` line — a monitoring view for moderation
  (unpublish/edit if something's wrong), not a queue to clear before
  anything goes live.

### 2. Platform logo, surfaced prominently

New addition from this conversation, on top of the original three pieces.
`Platform.logoUrl` already exists in the schema (unused since the field was
added) — what's missing is the form to set it and the actual prominent
placement.

- **Form**: `PlatformLogoSettings.tsx`, adapting `AvatarSettings.tsx`'s
  client-side pattern rather than reusing it unmodified. One real
  difference: avatars are people photos, safely force-cropped to a square
  JPEG; logos are brand marks that often aren't square and often need
  transparency (a wordmark on a transparent background is a completely
  normal logo shape). The resize step should **contain-fit within a
  bounding box** (e.g. 400×400) rather than center-crop to a square, and
  should preserve PNG output (not force JPEG) when the source has an alpha
  channel, so a transparent-background logo doesn't get flattened onto an
  arbitrary color. Same size-cap/no-bucket-needed reasoning as
  `AvatarSettings` otherwise carries over unchanged.
- **Placement**: `TitleRail` gains an optional `eyebrowLogoUrl` prop —
  rendered as a small image before the eyebrow text instead of (or
  alongside) it. Used specifically for platform-attributed rails: a
  partner's own page (`/platform/[slug]`) uses the logo as a masthead above
  their title grid, and — once a platform has real submitted volume — a
  homepage rail (e.g. "Fresh from our partners") can render one row per
  platform with their logo leading the eyebrow, giving each partner actual
  brand presence on Kilig rather than a plain text credit line. This is a
  real, tangible thing to put in front of a partner during the pitch: their
  logo will actually appear next to their catalogue, not just their name in
  small text.

### 3. Trailers

- `Title.trailerUrl String?` — simple, external URL now. Nothing about the
  UI contract changes if this later points at a hosted asset instead —
  same "don't build storage before it's needed" discipline as the avatar
  pattern.
- "Watch Trailer" button on the title page, rendered only when the field is
  set, `target="_blank"` to an external window. No embedded player, no
  autoplay — consistent with the rest of the app's "no manufactured
  urgency" pattern (same reasoning as trending/hero never fabricating a
  signal that isn't real).

### 4. Announcements — platform-voiced, contained to their own page

- New `PlatformAnnouncement` model: `id`, `platformId`, `title`, `body`,
  optional `titleId` link to a specific `Title`, `createdAt`.
- Rendered **only** on `/platform/[slug]`, never the homepage or `/buzz` —
  deliberately kept separate from Kilig's neutral discovery surfaces, the
  same "fan curator vs. platform curator, coexisting but distinct voices"
  split from the original curator/platform identity design. A partner's own
  promotional announcement ("New season of X drops Friday") is their voice,
  not Kilig's — it shouldn't blend into rails that are otherwise entirely
  fandom-signal-driven.

## Rollout

1. Schema: `Title.submittedByPlatformId`, `Title.trailerUrl`,
   `PlatformAnnouncement` model. Purely additive, same zero-downtime shape
   as every migration so far.
2. Partner submission form + `/platform/[slug]` page + admin dashboard
   attribution line.
3. Trailer field + button on the title page.
4. Platform logo form + `eyebrowLogoUrl` on `TitleRail` + masthead on the
   partner page.
5. Announcements model + rendering on the partner page.
6. Homepage "Fresh from our partners" rail — deliberately last, and only
   once at least one real partner has real submitted volume. Same
   discipline as `hero.ts`'s `most_collected` mode: don't build the
   aggregate-partner-rail's floor logic speculatively before there's real
   data to floor-gate against.

## Explicitly deferred, not forgotten

- Bulk/CSV import for partner catalogues (the earlier draft's "50 titles at
  once" scenario) — the single-title form ships first; bulk import is a
  straightforward extension of the same `submitTitleFromPlatform` action
  once the single-title path is proven, not a blocker to launch.
- Bumping a `Title.submittedByPlatformId` and its `Availability.platform`
  string out of sync if a partner is ever renamed — same class of edge case
  the curator display-name-uniqueness system already accepts as
  out-of-scope for now.
- Any analytics dashboard for partners — the earlier draft's Phase 3.
  Nothing here blocks it later; nothing here builds toward it prematurely
  either.
