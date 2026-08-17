"use client";

import { useActionState, useState } from "react";
import { updateCuratorAvatar, removeCuratorAvatar, type CuratorSettingsState } from "@/lib/curator-actions";
import { CuratorAvatar } from "@/components/CuratorAvatar";

const AVATAR_TARGET_SIZE = 200;
const AVATAR_JPEG_QUALITY = 0.85;
const MAX_INPUT_BYTES = 5_000_000; // accept most phone photos, let the canvas downscale them

interface AvatarSettingsProps {
  displayName: string;
  avatarUrl: string | null;
}

const initialState: CuratorSettingsState = {};

// Avatar editing is client-side crop-and-downscale, not a raw dump:
// read the chosen file, center-crop it to a square, resize it to a
// 200px JPEG, and only then submit the small data URI to the server
// action (which stored in curator.avatar_url — see updateCuratorAvatar
// in curator-actions.ts for the size cap and validation scheme). Keeps
// the DB bloat to a few KB-characters instead of a full-resolution
// upload, and no storage infra (buckets/CDN) is needed.
export function AvatarSettings({ displayName, avatarUrl }: AvatarSettingsProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState(updateCuratorAvatar, initialState);

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
        const side = Math.min(img.width, img.height);
        const canvas = document.createElement("canvas");
        canvas.width = AVATAR_TARGET_SIZE;
        canvas.height = AVATAR_TARGET_SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(
          img,
          (img.width - side) / 2,
          (img.height - side) / 2,
          side,
          side,
          0,
          0,
          AVATAR_TARGET_SIZE,
          AVATAR_TARGET_SIZE
        );
        setPreview(canvas.toDataURL("image/jpeg", AVATAR_JPEG_QUALITY));
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  }

  const shownAvatar = preview ?? avatarUrl;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-5">
        <CuratorAvatar displayName={displayName} avatarUrl={shownAvatar} size={72} />
        <label className="cursor-pointer rounded-xl border border-[var(--accent-marigold)] px-4 py-2 text-sm font-semibold text-[var(--accent-marigold)] transition-colors hover:bg-[var(--accent-marigold)]/10">
          {avatarUrl || preview ? "Change avatar" : "Upload avatar"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>
      </div>

      {uploadError && <p className="text-sm text-[var(--accent-rose)]">{uploadError}</p>}

      {preview && (
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="avatar" value={preview} />
          <p className="text-sm text-[var(--text-muted)]">Looks good? Save it, or pick another image.</p>
          {state.error && <p className="text-sm text-[var(--accent-rose)]">{state.error}</p>}
          <button
            type="submit"
            disabled={isPending}
            className="w-fit rounded-xl bg-[var(--accent-marigold)] px-4 py-2 text-sm font-semibold text-[var(--bg)] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save avatar"}
          </button>
        </form>
      )}

      {avatarUrl && !preview && (
        <form action={removeCuratorAvatar}>
          <button
            type="submit"
            className="font-mono text-[11px] uppercase tracking-wide text-[var(--text-muted)] transition-colors hover:text-[var(--accent-rose)]"
          >
            Remove avatar
          </button>
        </form>
      )}
    </div>
  );
}