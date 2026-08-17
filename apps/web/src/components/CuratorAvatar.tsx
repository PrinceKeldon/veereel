interface CuratorAvatarProps {
  displayName: string;
  avatarUrl?: string | null;
  /** Size in px — both diameters, so it stays a square/circle at any scale. */
  size?: number;
}

/**
 * The curator's face, or a deterministic initials fallback when no
 * avatar is set yet (Curator[0] + Curator[1], uppercased) — always
 * renders, never a broken image state. External user-provided avatar
 * URLs are raw <img>s (same reasoning as TitleCoverArt's cover art).
 */
export function CuratorAvatar({ displayName, avatarUrl, size = 120 }: CuratorAvatarProps) {
  const initials = displayName.trim().slice(0, 2).toUpperCase();
  const style = { width: size, height: size };

  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- external, user-uploaded avatar URLs
    return <img src={avatarUrl} alt={`${displayName}'s avatar`} style={style} className="rounded-full object-cover" />;
  }

  return (
    <div
      style={style}
      role="img"
      aria-label={`${displayName}'s avatar`}
      className="flex items-center justify-center rounded-full bg-gradient-to-br from-[#332417] to-[#E8A33D] font-[var(--font-display)] text-3xl font-semibold text-[var(--bg)] ring-1 ring-[var(--border)]"
    >
      {initials}
    </div>
  );
}