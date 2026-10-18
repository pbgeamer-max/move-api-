// TVORA procedural artwork — deterministic, cinematic SVG poster/backdrop data URIs
// Used when a title has no generated artwork, keeping everything premium and offline-safe.

const PALETTES: Array<{ bg: [string, string]; beam: string; orb: string; ink: string }> = [
  { bg: ["#0a0d12", "#11161d"], beam: "rgba(159,183,203,0.22)", orb: "rgba(159,183,203,0.30)", ink: "#cfe0ee" },
  { bg: ["#0d0a10", "#181018"], beam: "rgba(200,150,120,0.18)", orb: "rgba(216,201,163,0.25)", ink: "#e6d9c3" },
  { bg: ["#0a100d", "#101a14"], beam: "rgba(127,176,158,0.20)", orb: "rgba(127,176,158,0.28)", ink: "#c3e0d2" },
  { bg: ["#0c0a0a", "#171212"], beam: "rgba(229,120,110,0.16)", orb: "rgba(229,120,110,0.22)", ink: "#e8c4c0" },
  { bg: ["#0b0b0e", "#131318"], beam: "rgba(154,143,194,0.18)", orb: "rgba(154,143,194,0.24)", ink: "#d4cce8" },
  { bg: ["#0d0c08", "#161510"], beam: "rgba(216,201,163,0.16)", orb: "rgba(216,201,163,0.26)", ink: "#e6d9b8" },
];

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export interface ArtworkOptions {
  seed: string;
  title: string; // localized title to typeset
  subtitle?: string; // e.g. "SERIES • 2025"
  poster?: boolean; // true = 2:3 portrait, false = 16:9 backdrop
}

export function artworkUri({ seed, title, subtitle, poster }: ArtworkOptions): string {
  const h = hash(seed);
  const pal = PALETTES[h % PALETTES.length];
  const w = poster ? 600 : 1280;
  const ht = poster ? 900 : 720;
  const cx = 90 + (h % 40) * 4; // % positions drift per-seed
  const cy = poster ? 24 + (h % 5) * 3 : 30 + (h % 4) * 4;
  const rot = -12 + ((h >> 3) % 25);
  const beams = 2 + ((h >> 5) % 2);

  let shapes = "";
  for (let i = 0; i < beams; i++) {
    const x = ((h >> (i * 3 + 1)) % 70) + 10;
    shapes += `<rect x="${x}%" y="-20%" width="${3 + ((h >> i) % 5)}%" height="140%" transform="rotate(${rot + i * 7} 50 50)" fill="url(#beam)" opacity="${0.5 + i * 0.2}"/>`;
  }

  const fontSize = poster ? 44 : 64;
  const subSize = poster ? 20 : 24;
  const titleY = poster ? ht - 130 : ht - 90;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${ht}" viewBox="0 0 ${w} ${ht}">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${pal.bg[0]}"/><stop offset="1" stop-color="${pal.bg[1]}"/>
</linearGradient>
<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="${pal.beam}"/><stop offset="1" stop-color="rgba(0,0,0,0)"/>
</linearGradient>
<radialGradient id="orb" cx="${cx}%" cy="${cy}%" r="${poster ? 55 : 60}%">
<stop offset="0" stop-color="${pal.orb}"/><stop offset="1" stop-color="rgba(0,0,0,0)"/>
</radialGradient>
<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0.05"/></feComponentTransfer><feComposite operator="over" in2="SourceGraphic"/></filter>
</defs>
<rect width="${w}" height="${ht}" fill="url(#bg)"/>
${shapes}
<rect width="${w}" height="${ht}" fill="url(#orb)"/>
<circle cx="${cx}%" cy="${cy}%" r="${poster ? 3 : 4}" fill="${pal.ink}" opacity="0.9"/>
<rect width="${w}" height="${ht}" fill="url(#bg)" opacity="0" filter="url(#grain)"/>
<rect x="8%" y="${titleY - fontSize - 26}" width="56" height="2" fill="${pal.ink}" opacity="0.85"/>
<text x="8%" y="${titleY}" fill="#ffffff" font-family="'IBM Plex Sans Arabic','Manrope',system-ui,sans-serif" font-size="${fontSize}" font-weight="700" direction="auto">${esc(title.length > 26 ? title.slice(0, 26) + "…" : title)}</text>
${subtitle ? `<text x="8%" y="${titleY + subSize + 22}" fill="${pal.ink}" font-family="'Manrope',system-ui,sans-serif" font-size="${subSize}" letter-spacing="4" opacity="0.8">${esc(subtitle)}</text>` : ""}
<rect width="${w}" height="${ht}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="2"/>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function posterFor(seed: string, title: string, subtitle?: string): string {
  return artworkUri({ seed, title, subtitle, poster: true });
}

export function backdropFor(seed: string, title: string, subtitle?: string): string {
  return artworkUri({ seed, title, subtitle, poster: false });
}

// Deterministic procedural TV-channel logo — rounded screen tile with call letters
export function channelLogo(
  channel: { code: string; colorA: string; colorB: string },
  size = 96
): string {
  const initials = channel.code
    .replace(/^TVORA-?/i, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 4)
    .toUpperCase() || "TV";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 96 96">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${channel.colorA}"/><stop offset="1" stop-color="${channel.colorB}"/>
</linearGradient></defs>
<rect x="4" y="4" width="88" height="88" rx="18" fill="url(#g)" stroke="rgba(255,255,255,0.28)" stroke-width="1.5"/>
<rect x="4" y="70" width="88" height="22" rx="10" fill="rgba(0,0,0,0.35)"/>
<circle cx="16" cy="81" r="3" fill="#e5484d"/>
<text x="48" y="46" text-anchor="middle" fill="#fff" font-family="'Manrope',system-ui,sans-serif" font-weight="800" font-size="24" letter-spacing="1">${esc(initials)}</text>
<text x="48" y="85" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-family="'Manrope',system-ui,sans-serif" font-weight="700" font-size="10" letter-spacing="3">LIVE</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
