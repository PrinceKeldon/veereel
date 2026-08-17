# Curator Experience Redesign — "Secret Shelf" Aesthetic

## Guiding Principle
**"Kilig curator pages should feel like discovering someone's secret shelf, not opening their database record."**

## Current State → New State

### Curator Profile Page

**Before:**
```
Curator
ROWAN
3 followers · 2 Collections

[New Collection button]

────────────────────
Country Romance
1 title

────────────────────
Werewolf Stories
6 titles
```

**After:**
```
                  [AVATAR]

                   ROWAN
         collector of dangerous
            love stories

         3 followers · 2 Collections
              [ FOLLOW ]

     ────────────────────────────

     "I don't want wholesome.
      I want complicated."

     ────────────────────────────

         FEATURED COLLECTION

     ┌──────────────────────────┐
     │ [poster] [poster] [poster]│
     │                          │
     │  COUNTRY ROMANCE         │
     │                          │
     │  The ones where the      │
     │  countryside is peaceful │
     │  but the relationship    │
     │  absolutely isn't.       │
     │                          │
     │  2 DRAMAS           →    │
     └──────────────────────────┘

     ALL COLLECTIONS

     [Same card layout for each]
```

### Collection Page

**Before:**
```
← ROWAN

Collection by rowan
COUNTRY ROMANCE

[Heart button]

────────────────────

[poster + title + note]
[poster + title + note]
```

**After:**
```
← ROWAN

ROWAN'S COLLECTION

COUNTRY ROMANCE

"The ones where the countryside 
is peaceful but the relationship 
absolutely isn't."

    [ FOLLOW ROWAN ]

───────────────────────────────

        [LARGE POSTER]

    THE REJECTED EX-MATE'S
        SECRET IDENTITY

    "Romance without an end."

           [ WATCH ]

───────────────────────────────

    [POSTER]              [POSTER]

    "..."                 "..."

───────────────────────────────
```

## Components to Build

### 1. CuratorHero (New)
- Avatar (generated if no URL, initials fallback)
- Display name (large, prominent)
- Bio (one-line identity below name)
- Taste statement in quotes (signature line)
- Follower count + collection count
- Follow button
- Separator line for visual break

### 2. CuratorCollectionCard (New)
- Replaces text-only collection link
- Shows 3 cover images from collection (if available)
- Collection name (large)
- Collection description (curator's emotional hook)
- Item count
- Arrow/link indication

### 3. CollectionHeaderHero (New)
- Curator name + link back
- Collection name (large, prominent)
- Collection description (curator's hook)
- Follow curator button

### 4. CollectionItemDisplay (Enhanced)
- Show title poster large for first item
- Curator note as visual callout
- Watch button prominent
- Remaining items in grid

## Data Model Changes

### Curator
- `bio` (optional, ~60 chars) — "collector of dangerous love stories"
- `tasteStatement` (optional, ~80 chars) — "I don't want wholesome. I want complicated."
- `avatarUrl` (optional) — uploaded or generated avatar

### Collection
- `description` (optional, ~140 chars) — "The ones where the countryside is peaceful but the relationship absolutely isn't."

## Styling Principles

1. **Large typography** — Names and titles should feel prominent
2. **Whitespace** — Visual breathing room, not dense information
3. **Posters as design** — Cover art is the visual language
4. **Quotes/Commentary** — Curator voice is primary, metadata secondary
5. **Cinematic spacing** — Section separators, visual breaks
6. **"Secret shelf" feeling** — Like discovering a personal collection, not a database

## Implementation Priority

### Phase 1 (This iteration): Core redesign
1. Add schema fields (curator bio/tasteStatement/avatarUrl, collection description)
2. Redesign curator profile page (CuratorHero + CuratorCollectionCard)
3. Redesign collection page (CollectionHeaderHero + larger item displays)
4. Update collection creation/edit form to capture description

### Phase 2 (Later): Polish & Discovery
1. Generated avatars (Gravatar, deterministic, etc.)
2. Avatar upload UI
3. Curator onboarding prompt for taste statement
4. Surface curators in homepage discovery

### Phase 3 (Eventually): Advanced Features
1. Featured collection selector
2. Curator feed/activity
3. Curator-to-curator discovery
4. Taste statement trending

## Forms to Update

1. **Collection creation/edit** — Add description field
2. **Curator settings** (new page) — Edit bio, taste statement, upload avatar
3. **Collection item add** — Already has note field, keep as-is

## No New Functionality

The mechanic stays the same. This is **pure aesthetic transformation**.
- Same data is stored
- Same queries run
- Same interactions work
- Just presented with emotional weight instead of database structure
