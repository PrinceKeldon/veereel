"use server";

import { prisma } from "@/lib/prisma";
import { requirePlatform } from "@/lib/platform";
import { checkDuplicate } from "@/lib/discovery/duplicate";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// Same size-cap reasoning as AVATAR_DATA_URI_MAX_LENGTH in
// curator-actions.ts — a contain-fit 400×400 PNG/JPEG logo as a data
// URI is typically 10–150KB, so the cap weeds out multi-MB raw dumps
// while leaving generous headroom for a detailed logo.
const LOGO_DATA_URI_MAX_LENGTH = 1_000_000;

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export interface SubmitPlatformTitleState {
  error?: string;
  duplicateOf?: { id: string; name: string };
}

/**
 * A verified partner (ReelShort, DramaBox, ShortMax…) publishing one of
 * its own titles directly into Kilig — the core of the partner
 * self-service flow (see PARTNER_PUBLISHING_PLAN.md). Mirrors the
 * curator path's submitTitleFromLink() shape with two deliberate
 * differences:
 *
 * 1. NO draft-equivalent flag. A curator submission lands
 *    isPublished: true + curatorDraft: true and waits for admin
 *    review before broad discoverability; a verified partner's
 *    submission is isPublished: true, curatorDraft: false — live
 *    immediately everywhere, no approval queue. The draft gate exists
 *    for spam/quality control on anonymous submitters, which a
 *    verified partner isn't (verification is baked in at
 *    createPlatformAccount time, never toggled separately).
 * 2. Availability.platform is set from platform.name directly, not
 *    guessed from the submitted URL — the whole reason a direct
 *    channel exists (see the plan's availability audit).
 *
 * Everything else reuses existing machinery: the same checkDuplicate()
 * bigram match, the same metadata-fetch preview, the same simple
 * field surface (name/synopsis/cover/episodes/cast/release date — no
 * trope/mood/Skip Meter/season, which stay editorial decisions).
 */
export async function submitTitleFromPlatform(
  _prevState: SubmitPlatformTitleState,
  formData: FormData
): Promise<SubmitPlatformTitleState> {
  // requirePlatform() redirects (not throws) when there's no platform
  // session — same "normal, expected mid-flow state" contract as the
  // curator guard. It also returns the platform's name/slug for us.
  const platform = await requirePlatform();

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
  const trailerUrl = str(formData, "trailerUrl");
  const deepLinkUrl = str(formData, "deepLinkUrl");

  if (!deepLinkUrl || !/^https?:\/\//.test(deepLinkUrl)) {
    return { error: "Paste the watch link (https://…) where viewers watch this title." };
  }

  await prisma.title.create({
    data: {
      name,
      synopsis: synopsis || undefined,
      language: "en",
      tropeTags: [],
      moodTags: [],
      castNames: castNamesRaw
        ? castNamesRaw.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      episodeCount: episodeCountRaw ? Number(episodeCountRaw) : undefined,
      releaseDate: releaseDateRaw ? new Date(releaseDateRaw) : undefined,
      coverImageUrl: coverImageUrl || undefined,
      trailerUrl: trailerUrl || undefined,
      // Live immediately, no draft gate — see this function's docstring.
      isPublished: true,
      curatorDraft: false,
      submittedByPlatformId: platform.id,
      availability: {
        create: {
          // Set with certainty from the platform's own name, not
          // guessed from the submitted URL.
          platform: platform.name,
          deepLinkUrl,
          isActive: true,
        },
      },
    },
  });

  revalidatePath(`/kilig/platform/${platform.slug}`);
  revalidatePath("/");
  redirect(`/kilig/platform/${platform.slug}`);
}

// ---------------------------------------------------------------------
// Platform settings — logo
// ---------------------------------------------------------------------

function isValidLogoDataUri(value: string): boolean {
  return /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(value);
}

export interface PlatformSettingsState {
  error?: string;
  ok?: boolean;
}

/**
 * Stores a new platform logo as a base64 data URI. Same wholesale
 * re-record pattern as updateCuratorAvatar() — the client contain-fits
 * and downscales first (see PlatformLogoSettings.tsx), and the logo is
 * kept as PNG when the source has alpha so a transparent wordmark isn't
 * flattened onto an arbitrary color. Rejects non-image payloads and
 * anything past the cap; blanks are rejected too (there's no separate
 * remove action yet — set a new image to replace, matching the
 * simplified platform settings surface).
 */
export async function updatePlatformLogo(
  _prevState: PlatformSettingsState,
  formData: FormData
): Promise<PlatformSettingsState> {
  const platform = await requirePlatform();
  const logo = str(formData, "logo");

  if (!logo) return { error: "Choose an image first." };
  if (logo.length > LOGO_DATA_URI_MAX_LENGTH) return { error: "That image is too large." };
  if (!isValidLogoDataUri(logo)) return { error: "That doesn't look like a supported image." };

  await prisma.platform.update({
    where: { id: platform.id },
    data: { logoUrl: logo },
  });
  revalidatePath(`/kilig/platform/${platform.slug}`);
  return { ok: true };
}

// ---------------------------------------------------------------------
// Announcements — a platform's own voice on its page
// ---------------------------------------------------------------------

export interface AnnouncementState {
  error?: string;
  ok?: boolean;
}

const ANNOUNCEMENT_HEADLINE_MAX = 80;
const ANNOUNCEMENT_BODY_MAX = 400;

/**
 * Posts an announcement on the platform's own /platform/[slug] page —
 * their voice, deliberately contained there (never the homepage or
 * /buzz). Optional titleId anchors it to one of the platform's titles.
 * Length-capped like every other editorial string in this codebase.
 */
export async function createPlatformAnnouncement(
  _prevState: AnnouncementState,
  formData: FormData
): Promise<AnnouncementState> {
  const platform = await requirePlatform();

  const headline = str(formData, "headline");
  const body = str(formData, "body");
  const titleId = str(formData, "titleId");

  if (!headline) return { error: "Give the announcement a headline." };
  if (headline.length > ANNOUNCEMENT_HEADLINE_MAX) {
    return { error: `Keep the headline under ${ANNOUNCEMENT_HEADLINE_MAX} characters.` };
  }
  if (body.length > ANNOUNCEMENT_BODY_MAX) {
    return { error: `Keep the announcement under ${ANNOUNCEMENT_BODY_MAX} characters.` };
  }

  if (titleId) {
    // The optional link must point at one of the platform's OWN titles,
    // never someone else's — same ownership-first validation as
    // setFeaturedCollection's/collectionId check.
    const owned = await prisma.title.findFirst({
      where: { id: titleId, submittedByPlatformId: platform.id },
      select: { id: true },
    });
    if (!owned) return { error: "That title isn't one of yours." };
  }

  await prisma.platformAnnouncement.create({
    data: {
      platformId: platform.id,
      headline,
      body,
      titleId: titleId || null,
    },
  });
  revalidatePath(`/kilig/platform/${platform.slug}`);
  return { ok: true };
}

/** The platform's own titles, for the announcement form's title picker. */
export async function getMyPlatformTitles(): Promise<{ id: string; name: string }[]> {
  const platform = await requirePlatform();
  return prisma.title.findMany({
    where: { submittedByPlatformId: platform.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  });
}

/**
 * Current platform's announcements for the settings/manage surface —
 * returns id/headline/createdAt so the page can list them and offer
 * deletion. Full body stays on the public page.
 */
export async function getMyPlatformAnnouncements(): Promise<
  { id: string; headline: string; createdAt: Date }[]
> {
  const platform = await requirePlatform();
  return prisma.platformAnnouncement.findMany({
    where: { platformId: platform.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, headline: true, createdAt: true },
  });
}

export async function deletePlatformAnnouncement(announcementId: string): Promise<void> {
  const platform = await requirePlatform();
  await prisma.platformAnnouncement.deleteMany({
    where: { id: announcementId, platformId: platform.id },
  });
  revalidatePath(`/kilig/platform/${platform.slug}`);
}