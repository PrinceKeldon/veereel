"use server";

import { prisma } from "@/lib/prisma";
import { setPlatformCookie } from "@/lib/platform";
import {
  peekCuratorId,
  peekCuratorAuthStatus,
  setCuratorCookie,
  clearCuratorCookie,
  requireReclaimedCurator,
} from "@/lib/curator";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { checkDuplicate } from "@/lib/discovery/duplicate";
import { Prisma } from "@/generated/prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// Mirrors MIN_SESSIONS_FOR_BEHAVIORAL_SIGNAL (matching.ts) and
// MIN_VOTES_FOR_SKIP_METER_DISPLAY (actions.ts) — same reasoning: a
// handful of followers isn't a real signal, it's noise wearing a
// number. Below this, a visitor sees "New curator" instead of a count
// — see getFollowerDisplay() below. The curator themselves always
// sees their real number regardless (see ARCHITECTURE.md's
// Collections section — "two audiences" — for why).
const MIN_FOLLOWERS_FOR_PUBLIC_DISPLAY = 5;

const NOTE_MAX_LENGTH = 140;
const DISPLAY_NAME_MIN_LENGTH = 3;
const DISPLAY_NAME_MAX_LENGTH = 24;
const DISPLAY_NAME_PATTERN = /^[a-zA-Z0-9_]+$/;

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Only ever redirect to a same-origin relative path after claiming a
 * name. `next` comes from a query param round-tripped through a
 * hidden form field (see ClaimIdentityForm.tsx) — treat it the same
 * as any other user-supplied string. A bare "/" prefix with no
 * leading "//" (protocol-relative) or "http"/backslash trick is the
 * whole check; anything else falls back to the curator's own profile.
 */
function safeNextPath(next: string | null, fallback: string): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}

/**
 * The non-redirecting counterpart to requireReclaimedCurator(), for
 * actions invoked directly from a client onClick (followCurator,
 * likeCollection, likeCollectionItem) rather than a <form action=>.
 * Those components (FollowButton.tsx, LikeButton.tsx) do optimistic
 * local state + silent revert-on-failure — a thrown redirect() would
 * skip that revert entirely, so these report `needsReclaim` back as
 * data instead and let the client component decide how to surface it
 * (currently: revert the optimistic state and navigate to /reclaim).
 */
type ReclaimGuardResult = { curatorId: string } | { curatorId: null; needsReclaim: boolean };

async function softRequireReclaimedCurator(): Promise<ReclaimGuardResult> {
  const status = await peekCuratorAuthStatus();
  if (!status) return { curatorId: null, needsReclaim: false };
  if (!status.hasUser) return { curatorId: null, needsReclaim: true };
  return { curatorId: status.curatorId };
}

// ---------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------

export interface ClaimDisplayNameState {
  error?: string;
}

/**
 * Claims a display name and sets the curator cookie — still instant
 * and password-free, that part hasn't changed. What has changed:
 * this used to be the entire identity surface, with email deferred
 * until a curator first hit a gated action (see reclaimCurator()'s
 * docstring below for the old reasoning). It's no longer deferred —
 * every successful claim now redirects straight into /reclaim, making
 * "add an email" the very next mandatory step of onboarding rather
 * than something a curator could put off indefinitely while still
 * following/liking/collecting. Deliberately still not merged into a
 * single name+email+password form, though: keeping the name claim
 * itself a single, trivial field means someone can find out in one
 * second whether the name they want is even available, before being
 * asked for anything with more weight.
 *
 * Deliberately case-insensitive on the availability check (so
 * "Sarah" and "sarah" can't both be claimed and confused for each
 * other) while still storing whatever casing the person typed, since
 * that's part of how they want their name displayed. The DB's plain
 * @unique constraint is case-sensitive, so a same-casing race is
 * still possible between the check and the insert — caught below via
 * the P2002 branch, same pattern as logReaction()'s uniqueness
 * handling in actions.ts.
 *
 * Shaped as a useActionState action (prevState, formData) — same
 * pattern as loginAdminAction in admin-actions.ts — so the claim form
 * can show a validation error inline instead of losing all input on
 * failure.
 */
export async function claimDisplayName(
  _prevState: ClaimDisplayNameState,
  formData: FormData
): Promise<ClaimDisplayNameState> {
  const displayName = str(formData, "displayName");

  if (displayName.length < DISPLAY_NAME_MIN_LENGTH || displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    return { error: `Name must be ${DISPLAY_NAME_MIN_LENGTH}–${DISPLAY_NAME_MAX_LENGTH} characters.` };
  }
  if (!DISPLAY_NAME_PATTERN.test(displayName)) {
    return { error: "Letters, numbers, and underscores only." };
  }

  const existing = await prisma.curator.findFirst({
    where: { displayName: { equals: displayName, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) {
    return { error: "That name is already taken." };
  }

  let curatorId: string;
  try {
    const curator = await prisma.curator.create({ data: { displayName } });
    curatorId = curator.id;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "That name is already taken." };
    }
    console.error("Failed to claim display name", err);
    return { error: "Something went wrong — try again." };
  }

  // redirect() throws internally (that's how it interrupts render) —
  // it has to happen outside the try/catch above, or it'd get caught
  // and reported as "Something went wrong."
  await setCuratorCookie(curatorId);
  // Straight into /reclaim now, not the profile/next path directly —
  // see this function's docstring for why email is no longer a
  // deferred, optional step. `next` is carried through unresolved so
  // /reclaim can keep forwarding it — resolving it here would mean
  // reclaimCurator() couldn't tell "no next was given" apart from
  // "next was already resolved to this specific path."
  redirect(`/kilig/reclaim?next=${encodeURIComponent(safeNextPath(str(formData, "next"), `/kilig/curator/${displayName}`))}`);
}

/**
 * Read-only lookup of the currently claimed curator, if any — for
 * Server Component render bodies deciding what to show (e.g. "New
 * Collection" vs "Claim your name" on a title's detail page). Safe to
 * call during render since peekCuratorId() never writes a cookie
 * (mirrors peekSessionId() in session.ts).
 */
export async function getCurrentCurator() {
  const curatorId = await peekCuratorId();
  if (!curatorId) return null;
  return prisma.curator.findUnique({ where: { id: curatorId } });
}

// ---------------------------------------------------------------------
// Account — attaching a real User to a claimed Curator, and signing
// back in / deleting that account. See schema.prisma's User/Platform
// models and the add_users_and_platforms migration for why this
// exists: a claimed display name alone has no recovery path and
// can't be used from a second device.
// ---------------------------------------------------------------------

export interface ReclaimState {
  error?: string;
  suggestSignIn?: boolean;
}

/**
 * Attaches a real User (email + password) to the currently-claimed
 * Curator — see schema.prisma's User/Platform models and the
 * add_users_and_platforms migration for why a User exists at all, and
 * claimDisplayName()'s docstring for why this step now happens
 * immediately after claiming instead of being deferred. The email is
 * stored exactly as typed, with nothing to confirm — an earlier pass
 * added a confirmation-link step here and then deliberately dropped
 * it (see peekCuratorAuthStatus()'s docstring in curator.ts).
 *
 * Fires whenever requireReclaimedCurator() redirects here — for a
 * curator claimed before real accounts existed, or (the common case
 * now) a brand-new claim, redirected here immediately.
 *
 * Magic-link sign-in is deliberately not built here — this ships the
 * password-only version now; passwordHash is nullable on User
 * specifically so a magic-link-only path can be added later without a
 * migration (see the field's comment in schema.prisma).
 */
export async function reclaimCurator(
  _prevState: ReclaimState,
  formData: FormData
): Promise<ReclaimState> {
  const curatorId = await peekCuratorId();
  if (!curatorId) return { error: "No curator claimed in this browser." };

  const curator = await prisma.curator.findUnique({
    where: { id: curatorId },
    select: { userId: true, displayName: true },
  });
  if (!curator) return { error: "That curator no longer exists." };
  const nextTarget = safeNextPath(str(formData, "next"), `/kilig/curator/${curator.displayName}`);
  if (curator.userId) {
    // Already reclaimed (e.g. a stale form re-submitted) — nothing to do.
    redirect(nextTarget);
  }

  const email = str(formData, "email").toLowerCase();
  const password = str(formData, "password");
  if (!email || !email.includes("@")) return { error: "Enter a valid email." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    // Don't silently attach this Curator to an email that already has
    // an account — that's account-takeover-shaped (this browser could
    // belong to anyone). Point them at sign-in instead; signing in
    // re-points this browser's curator cookie at whichever Curator
    // that User already owns.
    return { error: "An account already exists for that email — sign in instead.", suggestSignIn: true };
  }

  try {
    await prisma.user.create({
      data: {
        email,
        passwordHash: hashPassword(password),
        curator: { connect: { id: curatorId } },
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "An account already exists for that email — sign in instead.", suggestSignIn: true };
    }
    console.error("Failed to reclaim curator", err);
    return { error: "Something went wrong — try again." };
  }

  redirect(nextTarget);
}

export interface SignInState {
  error?: string;
}

/**
 * Signs in with an existing User's email/password and re-points this
 * browser's identity cookie at whichever identity (curator OR platform)
 * that User owns — the actual "use my identity from a second device"
 * path. Always overwrites whatever identity cookie this browser already
 * had, same as signing into any account overrides a prior session. A
 * User owns exactly one of curator/platform (see the User model's
 * one-to-ones), so one lookup tells us where to send them.
 */
export async function signInWithEmail(
  _prevState: SignInState,
  formData: FormData
): Promise<SignInState> {
  const email = str(formData, "email").toLowerCase();
  const password = str(formData, "password");
  if (!email || !password) return { error: "Enter your email and password." };

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      passwordHash: true,
      curator: { select: { id: true, displayName: true } },
      platform: { select: { id: true, slug: true } },
    },
  });
  // Same error either way — don't reveal whether the email exists.
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return { error: "Incorrect email or password." };
  }

  if (user.curator) {
    await setCuratorCookie(user.curator.id);
    redirect(safeNextPath(str(formData, "next"), `/kilig/curator/${user.curator.displayName}`));
  }

  if (user.platform) {
    // A Platform logs in through the exact same email/password flow a
    // curator does — no separate login UI. The cookie is deliberately a
    // sibling (kilig_platform_id), not the curator cookie, so the same
    // browser can hold both identities without them overwriting each
    // other. See lib/platform.ts.
    await setPlatformCookie(user.platform.id);
    redirect(safeNextPath(str(formData, "next"), `/kilig/platform/${user.platform.slug}`));
  }

  return { error: "This account has no curator or platform identity." };
}

export interface DeleteAccountState {
  error?: string;
}

/**
 * Deletes the current curator's User (and, by DB cascade, the Curator
 * row itself — see User/Curator's onDelete: Cascade in schema.prisma,
 * which in turn cascades to that curator's Collections,
 * CollectionItems, CollectionLikes, CollectionItemLikes, and Follow
 * rows on both sides). Deliberate product choice, not an oversight:
 * this orphans anything that pointed at the deleted display name from
 * *outside* the cascade — most notably Title.submittedByCuratorId,
 * which is SetNull rather than Cascade, so a title a since-deleted
 * curator brought into the catalogue stays in the catalogue,
 * attribution simply cleared. Nothing rebuilds a "ghost" profile:
 * once the Curator row is gone, /curator/[displayName] just 404s like
 * any other unknown name, and the display name becomes claimable
 * again by someone else.
 *
 * Requires typing the exact display name to confirm — same
 * deliberate-friction pattern as the destructive-delete disclosures
 * already used in the admin UI (see ARCHITECTURE.md's "Full CRUD"
 * section), not a bare confirm() dialog.
 */
export async function deleteAccount(
  _prevState: DeleteAccountState,
  formData: FormData
): Promise<DeleteAccountState> {
  const curatorId = await requireReclaimedCurator("/kilig/settings");

  const curator = await prisma.curator.findUnique({
    where: { id: curatorId },
    select: { userId: true, displayName: true },
  });
  if (!curator || !curator.userId) {
    return { error: "Something went wrong — try again." };
  }

  const confirmation = str(formData, "confirmDisplayName");
  if (confirmation !== curator.displayName) {
    return { error: `Type "${curator.displayName}" exactly to confirm.` };
  }

  await prisma.user.delete({ where: { id: curator.userId } });
  await clearCuratorCookie();
  redirect("/");
}

// ---------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------

export interface CreateCollectionState {
  error?: string;
}

export async function createCollection(
  _prevState: CreateCollectionState,
  formData: FormData
): Promise<CreateCollectionState> {
  const curatorId = await requireReclaimedCurator("/kilig/collection/new");

  const name = str(formData, "name");
  if (!name) return { error: "Give the Collection a name." };
  if (name.length > 80) return { error: "Keep the name under 80 characters." };

  const description = str(formData, "description");
  if (description.length > 140) return { error: "Keep the description under 140 characters." };

  const collection = await prisma.collection.create({
    data: { curatorId, name, description: description || null },
  });

  redirect(`/kilig/collection/${collection.id}`);
}

/**
 * Adds a title to one of the current curator's own Collections with a
 * one-line note — the entire "add" loop described in the doc: save,
 * one line, done. Re-adding a title already in the Collection just
 * updates the note (see the unique index on
 * [collectionId, titleId]) rather than erroring or duplicating —
 * editing your own note is a legitimate thing to want to do, and
 * there's no separate "edit" UI for it yet.
 */
export interface AddToCollectionState {
  error?: string;
  ok?: boolean;
}

export async function addToCollection(
  _prevState: AddToCollectionState,
  formData: FormData
): Promise<AddToCollectionState> {
  const collectionId = str(formData, "collectionId");
  const curatorId = await requireReclaimedCurator(
    collectionId ? `/kilig/collection/${collectionId}` : "/"
  );
  const titleId = str(formData, "titleId");
  const note = str(formData, "note").slice(0, NOTE_MAX_LENGTH);

  if (!collectionId || !titleId) return { error: "Missing collection or title." };

  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    select: { curatorId: true },
  });
  if (!collection || collection.curatorId !== curatorId) {
    return { error: "That's not one of your Collections." };
  }

  await prisma.collectionItem.upsert({
    where: { collectionId_titleId: { collectionId, titleId } },
    create: { collectionId, titleId, note },
    update: { note },
  });
  // Keep updatedAt in sync with actual activity — the profile page's
  // featured-collection fallback (and the "recently updated" ordering
  // on the curator page) is driven by it, and Prisma's @updatedAt only
  // fires when the Collection row itself is written, not when children
  // (items) are added to it. An explicit touch here is cheap and keeps
  // "the shelf they last worked on" honest.
  await prisma.collection.update({ where: { id: collectionId }, data: { updatedAt: new Date() } });

  revalidatePath(`/kilig/collection/${collectionId}`);
  revalidatePath(`/kilig/title/${titleId}`);
  return { ok: true };
}

export async function removeFromCollection(collectionId: string, titleId: string): Promise<void> {
  const curatorId = await peekCuratorId();
  if (!curatorId) return;

  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    select: { curatorId: true },
  });
  if (!collection || collection.curatorId !== curatorId) return;

  await prisma.collectionItem.deleteMany({ where: { collectionId, titleId } });
  revalidatePath(`/kilig/collection/${collectionId}`);
  revalidatePath(`/kilig/title/${titleId}`);
}

/** The current curator's own Collections — used to populate the "Save to Collection" picker. */
export async function getMyCollections() {
  const curatorId = await peekCuratorId();
  if (!curatorId) return [];
  return prisma.collection.findMany({
    where: { curatorId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true },
  });
}

/**
 * "Add a title not on Kilig" — the curator-facing counterpart to
 * createTitleAction() in adminForms.ts, deliberately simpler and
 * stricter in different ways:
 *
 * - Simpler: only the fields fetchTitleMetadataForCurator() can
 *   actually surface (name, synopsis, cover, episode count, cast,
 *   release date) plus this curator's own note. No trope/mood tags,
 *   no Skip Meter fields, no publish toggle, no season linking —
 *   those stay editorial, decided at admin review time, same as
 *   every field a curator isn't positioned to judge.
 * - Stricter on duplicates: admin's version warns but allows an
 *   override; this one blocks outright on a likely match and points
 *   at the existing title instead, since a curator doesn't have the
 *   context to knowingly override the way admin might (e.g. not
 *   knowing about season-linking) — see ARCHITECTURE.md.
 *
 * Always creates isPublished: false and stamps submittedByCuratorId,
 * then immediately adds the new draft into the curator's chosen
 * Collection — this is *why* the title shows up in their collection
 * right away even before admin reviews it (with a "pending review"
 * badge — see CollectionPage's isPublished-aware rendering) rather
 * than only appearing once published.
 */
export interface SubmitTitleState {
  error?: string;
  duplicateOf?: { id: string; name: string };
}

export async function submitTitleFromLink(
  _prevState: SubmitTitleState,
  formData: FormData
): Promise<SubmitTitleState> {
  const collectionId = str(formData, "collectionId");
  const curatorId = await requireReclaimedCurator(
    collectionId ? `/kilig/collection/${collectionId}` : "/"
  );

  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    select: { curatorId: true },
  });
  if (!collection || collection.curatorId !== curatorId) {
    return { error: "That's not one of your Collections." };
  }

  const name = str(formData, "name");
  if (!name) {
    return { error: "Couldn't get a title name from that link — try fetching again, or a different page." };
  }

  const duplicate = await checkDuplicate(name);
  if (duplicate.isDuplicate && duplicate.existingTitleId && duplicate.existingTitleName) {
    return {
      error: "This looks like it's already on Kilig.",
      duplicateOf: { id: duplicate.existingTitleId, name: duplicate.existingTitleName },
    };
  }

  const synopsis = str(formData, "synopsis");
  const coverImageUrl = str(formData, "coverImageUrl");
  const episodeCountRaw = str(formData, "episodeCount");
  const castNamesRaw = str(formData, "castNames");
  const releaseDateRaw = str(formData, "releaseDate");
  const note = str(formData, "note").slice(0, NOTE_MAX_LENGTH);

  const title = await prisma.title.create({
    data: {
      name,
      synopsis: synopsis || undefined,
      // Same default reasoning as the admin form — see
      // ARCHITECTURE.md's "viewing language, not production language"
      // reframing. Not a field a curator should have to think about
      // either.
      language: "en",
      tropeTags: [],
      moodTags: [],
      castNames: castNamesRaw
        ? castNamesRaw.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      episodeCount: episodeCountRaw ? Number(episodeCountRaw) : undefined,
      releaseDate: releaseDateRaw ? new Date(releaseDateRaw) : undefined,
      coverImageUrl: coverImageUrl || undefined,
      // Curator-submitted titles publish to their collection immediately
      // (visible only to that curator and in their collection card on
      // their profile), but don't appear on the homepage or public search
      // until an admin approves (curatorDraft: false). This decouples
      // "in a curator's collection" from "officially on Kilig" and lets
      // curators see their work in context without friction while still
      // requiring admin review before broad discoverability.
      isPublished: true,
      curatorDraft: true,
      submittedByCuratorId: curatorId,
    },
  });

  await prisma.collectionItem.create({
    data: {
      collectionId,
      titleId: title.id,
      note: note || "Added by me — pending review before it's fully live on Kilig.",
    },
  });
  // Same updatedAt touch as addToCollection — adding a title is the
  // collection's most recent activity, which drives the curator
  // profile's featured-collection fallback.
  await prisma.collection.update({ where: { id: collectionId }, data: { updatedAt: new Date() } });

  revalidatePath(`/kilig/collection/${collectionId}`);
  redirect(`/kilig/collection/${collectionId}`);
}

// ---------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------

export interface CuratorSettingsState {
  error?: string;
  ok?: boolean;
}

// The whole avatar is stored as a resized, JPEG-compressed data URI
// (the client resizes to a square ≤ ~200px before submitting — see
// AvatarSettings.tsx), so the cap just keeps a hostile/oversized
// submission from bloating the row. 500k chars is generous for a
// 200px JPEG (~10–40KB) but weeds out multi-MB raw dumps.
const AVATAR_DATA_URI_MAX_LENGTH = 500_000;

function isValidAvatarDataUri(value: string): boolean {
  return /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(value);
}

/**
 * Pins which of the curator's own Collections acts as the "Featured
 * Collection" on their profile. An empty selection clears the pin back
 * to automatic (most-recently-active fallback — see the curator page).
 * Validation is ownership-first: the id must resolve to one of this
 * curator's Collections, never anyone else's.
 */
export async function setFeaturedCollection(
  _prevState: CuratorSettingsState,
  formData: FormData
): Promise<CuratorSettingsState> {
  const curatorId = await requireReclaimedCurator("/kilig/settings");
  const collectionId = str(formData, "collectionId");

  if (collectionId) {
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      select: { curatorId: true },
    });
    if (!collection || collection.curatorId !== curatorId) {
      return { error: "That's not one of your Collections." };
    }
  }

  const curator = await prisma.curator.findUniqueOrThrow({
    where: { id: curatorId },
    select: { displayName: true },
  });
  await prisma.curator.update({
    where: { id: curatorId },
    data: { featuredCollectionId: collectionId || null },
  });
  revalidatePath("/kilig/settings");
  revalidatePath(`/kilig/curator/${curator.displayName}`);
  revalidatePath("/kilig/curators");
  return { ok: true };
}

/**
 * Stores a new avatar as a base64 data URI (client resizes first —
 * see AvatarSettings.tsx). Rejects non-image payloads and anything past
 * the length cap; blanks are rejected too (use the separate remove
 * action for clearing). Re-recorded wholesale on every save, which is
 * fine for a small monochrome-ish JPEG avatar.
 */
export async function updateCuratorAvatar(
  _prevState: CuratorSettingsState,
  formData: FormData
): Promise<CuratorSettingsState> {
  const curatorId = await requireReclaimedCurator("/kilig/settings");
  const avatar = str(formData, "avatar");

  if (!avatar) return { error: "Choose an image first." };
  if (avatar.length > AVATAR_DATA_URI_MAX_LENGTH) return { error: "That image is too large." };
  if (!isValidAvatarDataUri(avatar)) return { error: "That doesn't look like a supported image." };

  const curator = await prisma.curator.findUniqueOrThrow({
    where: { id: curatorId },
    select: { displayName: true },
  });
  await prisma.curator.update({
    where: { id: curatorId },
    data: { avatarUrl: avatar },
  });
  revalidatePath("/kilig/settings");
  revalidatePath(`/kilig/curator/${curator.displayName}`);
  revalidatePath("/kilig/curators");
  return { ok: true };
}

/** Clears the avatar back to the initials fallback (see CuratorAvatar). */
export async function removeCuratorAvatar(): Promise<void> {
  const curatorId = await requireReclaimedCurator("/kilig/settings");
  const curator = await prisma.curator.findUniqueOrThrow({
    where: { id: curatorId },
    select: { displayName: true },
  });
  await prisma.curator.update({
    where: { id: curatorId },
    data: { avatarUrl: null },
  });
  revalidatePath("/kilig/settings");
  revalidatePath(`/kilig/curator/${curator.displayName}`);
  revalidatePath("/kilig/curators");
}

// ---------------------------------------------------------------------
// Following
// ---------------------------------------------------------------------

/**
 * Follows another curator. Enforced one-follow-per-pair by the real
 * database unique constraint (see the comment on Follow in
 * schema.prisma), not by this function checking first — same
 * reasoning as logReaction() in actions.ts: a check-then-insert would
 * be a race between two tabs/taps, not an actual guarantee. P2002 is
 * the expected shape of "already following," everything else is a
 * genuine unexpected failure.
 */
export async function followCurator(
  targetCuratorId: string
): Promise<{ ok: true } | { ok: false; alreadyFollowing: boolean; needsReclaim?: boolean }> {
  const guard = await softRequireReclaimedCurator();
  if (guard.curatorId === null) {
    return { ok: false, alreadyFollowing: false, needsReclaim: guard.needsReclaim };
  }
  const curatorId = guard.curatorId;
  if (curatorId === targetCuratorId) {
    return { ok: false, alreadyFollowing: false };
  }

  try {
    await prisma.follow.create({
      data: { followerId: curatorId, followingId: targetCuratorId },
    });
    revalidatePath(`/kilig/curators`);
    return { ok: true };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, alreadyFollowing: true };
    }
    console.error("Failed to follow curator", err);
    return { ok: false, alreadyFollowing: false };
  }
}

export async function unfollowCurator(targetCuratorId: string): Promise<void> {
  const curatorId = await peekCuratorId();
  if (!curatorId) return;

  await prisma.follow.deleteMany({
    where: { followerId: curatorId, followingId: targetCuratorId },
  });
  revalidatePath(`/kilig/curators`);
}

/**
 * Whether the current session's curator already follows the given
 * curator — used to render the follow button's initial state
 * server-side, same "check the database, not client state" approach
 * as the ReactionTap/SkipMeter prior-vote lookups in title/[id]/page.tsx.
 */
export async function isFollowing(targetCuratorId: string): Promise<boolean> {
  const curatorId = await peekCuratorId();
  if (!curatorId) return false;

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: curatorId, followingId: targetCuratorId } },
    select: { id: true },
  });
  return existing !== null;
}

/**
 * The two-audiences split described in ARCHITECTURE.md: the curator
 * viewing their own profile always sees their real number (truth
 * matters, they're building something), a visitor sees it only once
 * it clears MIN_FOLLOWERS_FOR_PUBLIC_DISPLAY — below that, `count` is
 * null and the profile page renders "New curator" instead of a
 * number close to zero. The follow relationship itself is always
 * recorded either way (see followCurator()); this only gates what
 * gets rendered to a stranger.
 */
export async function getFollowerDisplay(
  targetCuratorId: string,
  isOwnProfile: boolean
): Promise<{ count: number | null; real: number }> {
  const real = await prisma.follow.count({ where: { followingId: targetCuratorId } });
  if (isOwnProfile || real >= MIN_FOLLOWERS_FOR_PUBLIC_DISPLAY) {
    return { count: real, real };
  }
  return { count: null, real };
}

// ---------------------------------------------------------------------
// Likes
// ---------------------------------------------------------------------
//
// Unlike follower counts, like counts are always shown as their real
// number, never threshold-gated. The thing MIN_FOLLOWERS_FOR_PUBLIC_DISPLAY
// protects against is a stat stamped on a *person's* public identity
// reading as "nobody's here" — a like count on a piece of curation is
// a normal, unremarkable content stat (same category as a track's
// play count or a post's like count on any other platform), not an
// identity signal, so it doesn't have the same cost at zero.

export async function likeCollection(collectionId: string): Promise<{ ok: boolean; needsReclaim: boolean }> {
  const guard = await softRequireReclaimedCurator();
  if (guard.curatorId === null) return { ok: false, needsReclaim: guard.needsReclaim };
  const curatorId = guard.curatorId;

  try {
    await prisma.collectionLike.create({ data: { curatorId, collectionId } });
  } catch (err) {
    // P2002 = already liked, not a real error — same idempotent-tap
    // handling as followCurator().
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) {
      console.error("Failed to like collection", err);
    }
  }
  revalidatePath(`/kilig/collection/${collectionId}`);
  return { ok: true, needsReclaim: false };
}

export async function unlikeCollection(collectionId: string): Promise<void> {
  const curatorId = await peekCuratorId();
  if (!curatorId) return;

  await prisma.collectionLike.deleteMany({ where: { curatorId, collectionId } });
  revalidatePath(`/kilig/collection/${collectionId}`);
}

export async function likeCollectionItem(
  collectionItemId: string,
  collectionId: string
): Promise<{ ok: boolean; needsReclaim: boolean }> {
  const guard = await softRequireReclaimedCurator();
  if (guard.curatorId === null) return { ok: false, needsReclaim: guard.needsReclaim };
  const curatorId = guard.curatorId;

  try {
    await prisma.collectionItemLike.create({ data: { curatorId, collectionItemId } });
  } catch (err) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) {
      console.error("Failed to like collection item", err);
    }
  }
  revalidatePath(`/kilig/collection/${collectionId}`);
  return { ok: true, needsReclaim: false };
}

export async function unlikeCollectionItem(collectionItemId: string, collectionId: string): Promise<void> {
  const curatorId = await peekCuratorId();
  if (!curatorId) return;

  await prisma.collectionItemLike.deleteMany({ where: { curatorId, collectionItemId } });
  revalidatePath(`/kilig/collection/${collectionId}`);
}

/** Server-side render state for a Collection's like button — real count plus whether the viewer (if any) already liked it. */
export async function getCollectionLikeState(collectionId: string): Promise<{ count: number; liked: boolean }> {
  const curatorId = await peekCuratorId();
  const [count, liked] = await Promise.all([
    prisma.collectionLike.count({ where: { collectionId } }),
    curatorId
      ? prisma.collectionLike.findUnique({ where: { curatorId_collectionId: { curatorId, collectionId } } }).then((r) => r !== null)
      : Promise.resolve(false),
  ]);
  return { count, liked };
}

/** Same as getCollectionLikeState() but batched for every item in a Collection at once, to avoid N+1 queries when rendering the item list. */
export async function getCollectionItemLikeStates(
  collectionItemIds: string[]
): Promise<Record<string, { count: number; liked: boolean }>> {
  if (collectionItemIds.length === 0) return {};
  const curatorId = await peekCuratorId();

  const [counts, likedRows] = await Promise.all([
    prisma.collectionItemLike.groupBy({
      by: ["collectionItemId"],
      where: { collectionItemId: { in: collectionItemIds } },
      _count: { _all: true },
    }),
    curatorId
      ? prisma.collectionItemLike.findMany({
          where: { curatorId, collectionItemId: { in: collectionItemIds } },
          select: { collectionItemId: true },
        })
      : Promise.resolve([]),
  ]);

  const countById = new Map(counts.map((c) => [c.collectionItemId, c._count._all]));
  const likedIds = new Set(likedRows.map((r) => r.collectionItemId));

  return Object.fromEntries(
    collectionItemIds.map((id) => [id, { count: countById.get(id) ?? 0, liked: likedIds.has(id) }])
  );
}

// ---------------------------------------------------------------------
// Discovery — making curators and Collections prominent
// ---------------------------------------------------------------------
//
// Deliberately a step short of a full trending/leaderboard surface
// (ARCHITECTURE.md's "not built in this pass" list still holds for
// ranking-by-popularity): these are plain, unranked "recent" and
// "alphabetical" listings, not a competitive social-proof surface.
// The gate is what does the identity-driving work here, not ranking.

/** Recently-updated Collections for the homepage rail — the primary "make curation visible" surface. */
/**
 * Only the most recently-updated items count, and only published
 * ones — a pending "Add a title not on Kilig" submission (see
 * submitTitleFromLink()) must never be the cover art a totally
 * anonymous homepage visitor sees. A Collection whose only items are
 * still pending review just shows no cover art, same graceful
 * degradation as everywhere else that filters rather than leaks.
 */
export async function getRecentCollections(limit = 8) {
  const collections = await prisma.collection.findMany({
    where: {
      // The homepage rail is keyed on curator names — a platform-owned
      // Collection has no displayName and doesn't belong here. None
      // exist today; this is the scope statement, not a workaround.
      curatorId: { not: null },
      items: { some: { title: { isPublished: true, curatorDraft: false } } },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      curator: { select: { displayName: true } },
      _count: { select: { items: { where: { title: { isPublished: true, curatorDraft: false } } } } },
      items: {
        where: { title: { isPublished: true, curatorDraft: false } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { title: { select: { id: true, coverImageUrl: true, name: true } } },
      },
    },
  });
  return curatorOwned(collections);
}

/**
 * Curator surfaces only — these queries render a curator's displayName
 * directly, and Collection ownership is curator XOR platform (see
 * schema.prisma's Collection model). Narrowing the rows after the
 * query keeps both the DB filter and the return type honest without
 * forcing a null-check at every render site.
 */
function curatorOwned<T extends { curator: unknown }>(
  rows: T[],
): Array<T & { curator: NonNullable<T["curator"]> }> {
  return rows.filter((r): r is T & { curator: NonNullable<T["curator"]> } => r.curator !== null);
}

/** Every published Collection that includes a given title, with its curator — surfaced directly on the title detail page. */
export async function getCollectionsFeaturingTitle(titleId: string) {
  const items = await prisma.collectionItem.findMany({
    where: { titleId, collection: { curator: { isNot: null } } },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: {
      note: true,
      collection: { select: { id: true, name: true, curator: { select: { displayName: true } } } },
    },
  });
  return curatorOwned(items.map((i) => ({ note: i.note, ...i.collection })));
}

/** All curators with at least one Collection — the /curators directory. */
export async function getCuratorDirectory() {
  const curators = await prisma.curator.findMany({
    where: { collections: { some: { items: { some: {} } } } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      _count: { select: { collections: true } },
      collections: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          description: true,
          items: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              title: {
                select: {
                  id: true,
                  coverImageUrl: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return Promise.all(
    curators.map(async (c) => ({
      ...c,
      followers: await getFollowerDisplay(c.id, false),
    }))
  );
}
