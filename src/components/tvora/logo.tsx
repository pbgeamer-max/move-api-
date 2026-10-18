"use client";
// TVORA original brand mark — geometric T with integrated play-button concept.
// The stem of the T is a downward-pointing "beam" triangle (a play glyph rotated 90°),
// giving the silhouette a projector-beam feel while remaining a clear T.

export function TvoraMark({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      role="img"
      aria-label="TVORA"
    >
      <defs>
        <linearGradient id="tvora-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2f6fa" />
          <stop offset="0.38" stopColor="#c9d6e2" />
          <stop offset="0.52" stopColor="#8fa3b5" />
          <stop offset="0.66" stopColor="#e6edf4" />
          <stop offset="1" stopColor="#a7b8c8" />
        </linearGradient>
        <linearGradient id="tvora-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cfe0ee" />
          <stop offset="1" stopColor="#7e97ab" />
        </linearGradient>
      </defs>
      {/* T bar — chamfered "screen" */}
      <path d="M6 8 H58 L52 20 H12 Z" fill="url(#tvora-metal)" />
      {/* Stem — downward beam / play glyph */}
      <path d="M21 24 H43 L32 56 Z" fill="url(#tvora-beam)" />
      {/* Thin light reflection */}
      <rect x="10" y="12.5" width="40" height="1.6" fill="#ffffff" opacity="0.55" rx="0.8" />
    </svg>
  );
}

export function TvoraLogo({
  size = 32,
  showWordmark = true,
  compact = false,
  onClick,
}: {
  size?: number;
  showWordmark?: boolean;
  compact?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="TVORA — home"
      className="tv-focusable group flex items-center gap-2.5 select-none"
    >
      <TvoraMark size={size} className="transition-transform duration-500 ease-out group-hover:scale-105" />
      {showWordmark && (
        <span
          className="tv-metal-text font-extrabold leading-none"
          style={{
            fontFamily: "var(--font-manrope), system-ui, sans-serif",
            fontSize: size * 0.62,
            letterSpacing: compact ? "0.14em" : "0.24em",
          }}
        >
          TVORA
        </span>
      )}
    </button>
  );
}
