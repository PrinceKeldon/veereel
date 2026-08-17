import { ChevronDown } from "lucide-react";

interface CollapsibleSectionProps {
  label: string;
  /** Optional content rendered in the collapsed header row next to the label (e.g. editorial badges) so key info stays visible without expanding. */
  summaryExtra?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

/**
 * Native <details>/<summary> collapse — collapsible with zero client
 * JS, so it stays within the app's "few Client Components" rule.
 * Renders a card whose header is one compact row (label + any
 * summaryExtra + a chevron) and whose body appears only when expanded.
 */
export function CollapsibleSection({
  label,
  summaryExtra,
  children,
  defaultOpen = false,
  className = "mb-7",
}: CollapsibleSectionProps) {
  return (
    <details
      className={`group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 ${className}`}
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
        <span className="mr-auto font-mono text-xs uppercase tracking-wide text-[var(--text-muted)]">{label}</span>
        {summaryExtra && <span className="flex flex-wrap items-center gap-1.5">{summaryExtra}</span>}
        <ChevronDown
          size={14}
          className="shrink-0 text-[var(--text-muted)] transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="mt-3 border-t border-[var(--border)] pt-3">{children}</div>
    </details>
  );
}
