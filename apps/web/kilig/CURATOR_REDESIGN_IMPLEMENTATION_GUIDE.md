# Curator Experience Redesign — Implementation Guide

## Overview

This guide walks through building the "secret shelf" aesthetic for curator pages. The redesign transforms curator pages from database records into creator profiles.

**Scope:** Redesign existing pages + components, zero new functionality
**Effort:** ~15-20 hours (component building + page refactoring)
**Breaking Changes:** None (existing data flows unchanged)

---

## Phase 1: Foundation Components

### 1. CuratorHero Component

**File:** `src/components/CuratorHero.tsx`

This component displays the curator's identity at the top of their profile page.

**Props:**
```tsx
interface CuratorHeroProps {
  displayName: string;
  bio?: string | null;           // "collector of dangerous love stories"
  tasteStatement?: string | null; // "I don't want wholesome. I want complicated."
  avatarUrl?: string | null;
  followerCount: number;
  collectionCount: number;
  isOwnProfile: boolean;
  isFollowing: boolean;
  onFollowClick?: () => void;
}
```

**Layout:**
```
                  [AVATAR]    ← 120px circle, initials fallback

                   DISPLAYNAME
                    (bio if exists)

            X followers · Y collections
                   [ FOLLOW ]

        ──────────────────────────────

        "tasteStatement if exists"

        ──────────────────────────────
```

**Design Details:**
- Avatar: Circle, 120px, initials fallback (Curator[0] + Curator[1])
- Display name: Large (text-3xl), uppercase, centered
- Bio: Smaller, muted color, centered below name (optional)
- Stats line: Small mono font, muted
- Follow button: Marigold, only if not own profile
- Taste statement: Centered, italic/quotes styling, gray text
- Visual separators: Subtle horizontal lines

### 2. CuratorCollectionCard Component

**File:** `src/components/CuratorCollectionCard.tsx`

Visual collection card with poster grid and curator commentary.

**Props:**
```tsx
interface CuratorCollectionCardProps {
  id: string;
  name: string;
  description?: string | null;  // "The ones where the countryside..."
  itemCount: number;
  posterUrls: string[];          // First 3 cover images
  href: string;
}
```

**Layout:**
```
┌──────────────────────────────────────┐
│ [poster] [poster] [poster]           │
│                                      │
│ COLLECTION NAME                      │
│                                      │
│ The curator's one-line feeling       │
│ about this entire collection...      │
│                                      │
│ 6 DRAMAS                          →  │
└──────────────────────────────────────┘
```

**Design Details:**
- Grid: 3 columns of equal-width poster images
- Posters: Aspect ratio 9/16, rounded corners
- If < 3 items: Show what exists, fill gaps with placeholder
- Name: Large heading below posters (font-display, text-lg)
- Description: Smaller text in muted color (the "emotional hook")
- Item count + arrow: Mono font, right-aligned, marigold on hover
- Card border: Subtle, hover state brightens border to marigold
- Card click: Navigates to collection

### 3. CollectionHeaderHero Component

**File:** `src/components/CollectionHeaderHero.tsx`

Cinematic header for collection pages.

**Props:**
```tsx
interface CollectionHeaderHeroProps {
  collectionName: string;
  collectionDescription?: string | null;
  curatorDisplayName: string;
  curatorAvatarUrl?: string | null;
  curatorBio?: string | null;
  collectionLikeCount: number;
  collectionLiked: boolean;
  isOwner: boolean;
  onLikeClick?: () => void;
}
```

**Layout:**
```
← CURATOR NAME

CURATOR'S COLLECTION

COLLECTION NAME

"The curator's description of the
collection's feeling & purpose..."

        [ FOLLOW CURATOR ]

─────────────────────────────────

Collection likes / share / etc
```

**Design Details:**
- Back link: Subtle, muted, top-left
- "Curator's Collection" label: Small mono text, muted
- Collection name: Very large (text-4xl), uppercase, prominent
- Description: Italic, gray text, centered, generous spacing
- Follow button: Only if not curator's own profile
- Like button: Right side, marigold text/icon on hover
- Separator: Visual break before first item

---

## Phase 2: Page Redesigns

### 1. Redesigned Curator Profile Page

**File:** `src/app/curator/[displayName]/page.tsx`

**Current flow:**
1. Header with name + follower count
2. New Collection button (if own)
3. List of collections as text links

**New flow:**
1. CuratorHero component (avatar, name, bio, taste statement)
2. Featured collection (if exists) as CuratorCollectionCard
3. "All Collections" heading
4. Grid/list of CuratorCollectionCard components
5. "Add Collection" button (if own profile)

**Layout approximately:**
```
CuratorHero
  ↓
┌──────────────────────────────────────┐
│        FEATURED COLLECTION           │
│     (if curator marked one, or       │
│      most recent, or pick first)     │
└──────────────────────────────────────┘
  ↓
ALL COLLECTIONS

[CuratorCollectionCard] [CuratorCollectionCard]
[CuratorCollectionCard]

[+ New Collection] (if own)
```

**Database queries needed:**
- Curator (with bio, tasteStatement, avatarUrl)
- Collections (ordered by updatedAt desc)
- For each collection: 3 most recent item posters
- Follower count

### 2. Redesigned Collection Page

**File:** `src/app/collection/[id]/page.tsx`

**Current flow:**
1. Back link
2. Collection name + like button
3. Grid of poster + title + note

**New flow:**
1. Back link to curator profile
2. CollectionHeaderHero
3. First collection item displayed large (poster, title, curator note, watch button)
4. Visual separator
5. Remaining items in 2-column grid (poster + curator note)
6. Visual separator between sections

**Layout approximately:**
```
← CURATOR NAME

CollectionHeaderHero

──────────────────────────────────

        [LARGE POSTER]

    TITLE NAME

    "Curator's note about why
     this drama matters to them."

        [ WATCH ]

──────────────────────────────────

[POSTER]            [POSTER]

"Note"              "Note"

──────────────────────────────────

[More items...]
```

**Design Details:**
- First item: Large cinematic display
- Remaining items: 2-column grid (on desktop, single column on mobile)
- Posters: 9/16 aspect ratio, rounded
- Notes: Below poster, italic, muted color
- Watch button: Prominent, marigold

---

## Phase 3: Forms & Settings

### 1. Update Collection Creation/Edit Form

**File:** `src/components/NewCollectionForm.tsx` + edit page

Add a `description` field (optional, max 140 chars):

```tsx
<div>
  <label htmlFor="description">What's the vibe of this collection?</label>
  <textarea
    id="description"
    name="description"
    placeholder="The ones where the countryside is peaceful but the relationship absolutely isn't..."
    maxLength={140}
  />
  <p className="text-xs text-muted">{descriptionLength}/140</p>
</div>
```

**Placement:** After collection name field
**Help text:** "One line that captures the feeling of this collection"

### 2. Create Curator Settings Page (Future)

**File:** `src/app/settings/page.tsx`

Form to edit curator identity:
- Bio (optional, ~60 chars)
- Taste statement (optional, ~80 chars)
- Avatar upload (future: generate or let users pick from generated options)

**This can wait until email verification is done.**

---

## Migration Notes

### Running Migrations

```bash
npx prisma generate
npx prisma migrate deploy
npm run build
```

### Existing Data

- All new fields are nullable
- No data migration needed
- Existing curators/collections show with empty fields
- UI gracefully handles missing bio/tasteStatement/description

### Backward Compatibility

- All existing queries still work
- New fields are SELECT-ed when fetching curator/collection
- Pages render with or without new fields

---

## Implementation Order

### Step 1: Components (No Page Changes)
1. Build CuratorHero component (with placeholder avatar logic)
2. Build CuratorCollectionCard component
3. Build CollectionHeaderHero component
4. Test components with mock data

**Effort:** ~4-5 hours

### Step 2: Curator Profile Page
1. Refactor curator profile page to use CuratorHero
2. Add featured collection selector logic (or use most recent)
3. Refactor collections list to use CuratorCollectionCard
4. Test on desktop + mobile

**Effort:** ~4-5 hours

### Step 3: Collection Page
1. Add CollectionHeaderHero to collection page
2. Refactor first item to large display
3. Refactor remaining items to grid
4. Add visual separators
5. Test on desktop + mobile

**Effort:** ~3-4 hours

### Step 4: Forms
1. Add description field to collection create/edit form
2. Update database layer to save/fetch description
3. Test form validation (max length)

**Effort:** ~2-3 hours

### Step 5: Polish & Testing
1. Mobile responsive adjustments
2. Image loading states
3. Avatar fallbacks
4. Empty state handling

**Effort:** ~2-3 hours

**Total Estimate:** 15-20 hours

---

## Design Tokens to Use

All existing Kilig design tokens work:
- `--bg`, `--surface`, `--surface-raised` for backgrounds
- `--accent-marigold` for interactive elements
- `--text`, `--text-muted` for typography
- `--border` for subtle dividers
- `font-display` for hero text, `font-mono` for metadata
- Rounded corners: `rounded-xl`, `rounded-2xl`
- Spacing: Kilig's gap system (use generous gaps for "breathing room")

---

## Testing Checklist

- [ ] CuratorHero renders without avatar/bio/tasteStatement
- [ ] CuratorCollectionCard renders with 0-3 items
- [ ] Collection page with 0 items
- [ ] Collection page with 1 item
- [ ] Collection page with 20+ items
- [ ] Curator page on mobile (collection cards should stack)
- [ ] Hover states on all interactive elements
- [ ] Follow button states (own profile vs following vs not following)
- [ ] Empty state on new curator profile ("No collections yet")

---

## Notes

- **Avatar generation:** For now, use initials fallback. Implement Gravatar or deterministic avatar later.
- **Taste statement:** Not required for launch. Can add onboarding nudge later.
- **Featured collection:** Start with most recent. Can add curator-selectable later.
- **Description field:** Encourage but don't require in form. Keep optional.

The goal is to make curators feel like creators, not database records. Start with the visual/layout changes, collect feedback, then add the optional identity fields gradually.
