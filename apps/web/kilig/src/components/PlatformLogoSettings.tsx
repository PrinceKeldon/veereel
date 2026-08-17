"use client";

import { useActionState, useState } from "react";
import { updatePlatformLogo, type PlatformSettingsState } from "@/lib/platform-actions";

const LOGO_MAX_DIMENSION = 400;
const LOGO_JPEG_QUALITY = 0.9;
const MAX_INPUT_BYTES = 5_000_000; // accept most real logo files, let the canvas downscale them

interface PlatformLogoSettingsProps {
  name: string;
  logoUrl: string | null;
}

const initialState: PlatformSettingsState = {};

// Deliberately NOT a copy-paste of AvatarSettings.tsx. Avatars are
// people photos, safely force-cropped to a square JPEG; logos are brand
// marks that often aren't square and often need transparency (a
// wordmark on a transparent background is a completely normal logo
// shape). So the resize step CONTAIN-FITS within a 400×400 bounding box
// (no center-crop) and preserves PNG output when the source has an
// alpha channel rather than always flattening to JPEG — a
// transparent-background logo must not be flattened onto an arbitrary
// color. Same size-cap / no-bucket-needed reasoning carries over.
export function PlatformLogoSettings({ name, logoUrl }: PlatformLogoSettingsProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState(updatePlatformLogo, initialState);

  function handleFile(file: File | undefined) {
    setUploadError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Pick an image file.");
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setUploadError("That file is too large — try a smaller image (under 5MB).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        // Contain-fit: scale the image down to fit inside the bounding
        // box, preserving aspect ratio — never center-crop to a square.
        const scale = Math.min(1, LOGO_MAX_DIMENSION / img.width, LOGO_MAX_DIMENSION / img.height);
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Draw on a transparent canvas regardless of source format so a
        // transparent PNG stays transparent; only fall back to JPEG (with
        // a white base) when the source genuinely has no alpha — a JPEG
        // can't carry transparency, so forcing it would flatten a
        // transparent wordmark onto black. White is the safer flatten
        // target (wordmarks are usually dark-on-white intended).
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const hasAlpha = file.type === "image/png";
        setPreview(
          hasAlpha
            ? canvas.toDataURL("image/png")
            : canvas.toDataURL("image/jpeg", LOGO_JPEG_QUALITY)
        );
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  }

  const shownLogo = preview ?? logoUrl;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-5">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          {shownLogo ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-submitted data URI, preview only
            <img src={shownLogo} alt={`${name} logo`} className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="px-2 text-center font-[var(--font-display)] text-xs uppercase text-[var(--text-muted)]">
              {name}
            </span>
          )}
        </div>
        <label className="cursor-pointer rounded-xl border border-[var(--accent-marigold)] px-4 py-2 text-sm font-semibold text-[var(--accent-marigold)] transition-colors hover:bg-[var(--accent-marigold)]/10">
          {logoUrl || preview ? "Change logo" : "Upload logo"}
          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        </label>
      </div>

      {uploadError && <p className="text-sm text-[var(--accent-rose)]">{uploadError}</p>}

      {preview && (
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="logo" value={preview} />
          <p className="text-sm text-[var(--text-muted)]">
            Looks good? Save it — it&apos;ll appear next to your catalogue. Transparent PNGs stay transparent.
          </p>
          {state.error && <p className="text-sm text-[var(--accent-rose)]">{state.error}</p>}
          <button
            type="submit"
            disabled={isPending}
            className="w-fit rounded-xl bg-[var(--accent-marigold)] px-4 py-2 text-sm font-semibold text-[var(--bg)] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save logo"}
          </button>
        </form>
      )}
    </div>
  );
}