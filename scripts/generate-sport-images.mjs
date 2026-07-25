/**
 * Generates the sample court imagery in /public/images/sports.
 *
 * These are flat vector scenes built from the Courtix palette — stand-ins for
 * real host photography, sized and framed the same way (4:3, 800×600) so
 * swapping in real uploads later needs no layout changes.
 *
 * Run:  node scripts/generate-sport-images.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "images", "sports");

const W = 800;
const H = 600;

const PALETTE = {
  lineWhite: "#F4F1E8",
  ballYellow: "#E4FF5C",
  ink: "#0E1512",
  deep: "#0E2621",
};

/* ------------------------------------------------------------------ helpers */

/** Shared defs: film grain, vignette, and a warm light bloom. */
function defs(id, surfaceTop, surfaceBottom, skyTop, skyBottom) {
  return `
  <defs>
    <linearGradient id="sky-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${skyTop}"/>
      <stop offset="100%" stop-color="${skyBottom}"/>
    </linearGradient>
    <linearGradient id="floor-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${surfaceTop}"/>
      <stop offset="100%" stop-color="${surfaceBottom}"/>
    </linearGradient>
    <radialGradient id="bloom-${id}" cx="0.5" cy="0.28" r="0.55">
      <stop offset="0%" stop-color="${PALETTE.ballYellow}" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="${PALETTE.ballYellow}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vig-${id}" cx="0.5" cy="0.5" r="0.78">
      <stop offset="55%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.55"/>
    </radialGradient>
    <filter id="grain-${id}" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="${id.length * 7}"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.055"/></feComponentTransfer>
    </filter>
    <filter id="soft-${id}" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="14"/>
    </filter>
  </defs>`;
}

function frame(id, inner, surfaceTop, surfaceBottom, skyTop, skyBottom) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">
${defs(id, surfaceTop, surfaceBottom, skyTop, skyBottom)}
  <rect width="${W}" height="${H}" fill="url(#sky-${id})"/>
  <rect width="${W}" height="${H}" fill="url(#bloom-${id})"/>
${inner}
  <rect width="${W}" height="${H}" fill="url(#vig-${id})"/>
  <rect width="${W}" height="${H}" filter="url(#grain-${id})" opacity="0.5"/>
</svg>
`;
}

/**
 * Perspective helper. Maps a point on a normalised court plane
 * (cx: -1 left .. 1 right, cy: 0 far .. 1 near) into screen space.
 */
function makeProjector({ horizon, nearY, farHalf, nearHalf, centerX = W / 2 }) {
  return (cx, cy) => {
    const y = horizon + (nearY - horizon) * cy;
    const half = farHalf + (nearHalf - farHalf) * cy;
    return [centerX + cx * half, y];
  };
}

const pt = ([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`;

function poly(points, fill, extra = "") {
  return `<polygon points="${points.map(pt).join(" ")}" fill="${fill}" ${extra}/>`;
}

function line(a, b, stroke, width = 2, opacity = 1) {
  return `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${stroke}" stroke-width="${width}" opacity="${opacity}" stroke-linecap="round"/>`;
}

/**
 * Overhead ceiling light rigs for indoor scenes. `id` must match the frame's
 * id — filter refs are scoped per scene, and a dangling url() reference makes
 * the element drop out entirely rather than just losing the blur.
 */
function ceilingRig(id, count, y, spread, glow = PALETTE.ballYellow) {
  let out = "";
  for (let i = 0; i < count; i++) {
    const x = W / 2 + (i - (count - 1) / 2) * spread;
    out += `
    <ellipse cx="${x.toFixed(0)}" cy="${y}" rx="46" ry="12" fill="${glow}" opacity="0.14" filter="url(#soft-${id})"/>
    <rect x="${(x - 30).toFixed(0)}" y="${y - 5}" width="60" height="9" rx="4" fill="${PALETTE.lineWhite}" opacity="0.5"/>`;
  }
  return out;
}

/** A net rendered in perspective, with visible mesh. */
function net(project, height, cordColor = PALETTE.lineWhite, meshOpacity = 0.28) {
  const cy = 0.46;
  const [lx, ly] = project(-1.08, cy);
  const [rx, ry] = project(1.08, cy);
  const top = ly - height;
  let mesh = "";
  for (let i = 0; i <= 26; i++) {
    const t = i / 26;
    const x = lx + (rx - lx) * t;
    mesh += `<line x1="${x.toFixed(1)}" y1="${top.toFixed(1)}" x2="${x.toFixed(1)}" y2="${ly.toFixed(1)}" stroke="${cordColor}" stroke-width="1" opacity="${meshOpacity}"/>`;
  }
  for (let j = 0; j <= 5; j++) {
    const y = top + ((ly - top) * j) / 5;
    mesh += `<line x1="${lx.toFixed(1)}" y1="${y.toFixed(1)}" x2="${rx.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${cordColor}" stroke-width="1" opacity="${meshOpacity}"/>`;
  }
  return `
  <g>
    ${mesh}
    <line x1="${lx.toFixed(1)}" y1="${top.toFixed(1)}" x2="${rx.toFixed(1)}" y2="${top.toFixed(1)}" stroke="${cordColor}" stroke-width="4" opacity="0.92"/>
    <line x1="${lx.toFixed(1)}" y1="${ly.toFixed(1)}" x2="${lx.toFixed(1)}" y2="${(top - 8).toFixed(1)}" stroke="${cordColor}" stroke-width="5" opacity="0.75"/>
    <line x1="${rx.toFixed(1)}" y1="${ry.toFixed(1)}" x2="${rx.toFixed(1)}" y2="${(top - 8).toFixed(1)}" stroke="${cordColor}" stroke-width="5" opacity="0.75"/>
  </g>`;
}

/* ------------------------------------------------------------------- scenes */

const SCENES = {
  /* ---------------------------------------------------------- pickleball */
  "pickleball-1": () => {
    const p = makeProjector({ horizon: 232, nearY: 588, farHalf: 118, nearHalf: 470 });
    const L = PALETTE.lineWhite;
    return frame(
      "a",
      `
  ${ceilingRig("a", 0, 0, 0)}
  <!-- back fence -->
  <rect x="0" y="150" width="${W}" height="84" fill="#0b1f1b" opacity="0.85"/>
  ${Array.from({ length: 30 }, (_, i) => `<line x1="${i * 28}" y1="150" x2="${i * 28}" y2="234" stroke="${L}" stroke-width="1" opacity="0.09"/>`).join("")}
  <!-- surface -->
  ${poly([p(-1.35, 0), p(1.35, 0), p(1.35, 1), p(-1.35, 1)], `url(#floor-a)`)}
  <!-- kitchen (non-volley zone) -->
  ${poly([p(-1, 0.33), p(1, 0.33), p(1, 0.6), p(-1, 0.6)], "#2F5185", 'opacity="0.34"')}
  <!-- court lines -->
  ${line(p(-1, 0.06), p(1, 0.06), L, 2, 0.85)}
  ${line(p(-1, 1), p(1, 1), L, 4, 0.95)}
  ${line(p(-1, 0.06), p(-1, 1), L, 3, 0.9)}
  ${line(p(1, 0.06), p(1, 1), L, 3, 0.9)}
  ${line(p(-1, 0.33), p(1, 0.33), L, 2, 0.8)}
  ${line(p(-1, 0.6), p(1, 0.6), L, 2, 0.8)}
  ${line(p(0, 0.6), p(0, 1), L, 2, 0.75)}
  ${line(p(0, 0.06), p(0, 0.33), L, 2, 0.7)}
  ${net(p, 96)}
  <!-- ball mid-flight -->
  <circle cx="486" cy="322" r="11" fill="${PALETTE.ballYellow}"/>
  <circle cx="486" cy="322" r="11" fill="none" stroke="${PALETTE.ink}" stroke-width="1.5" opacity="0.35"/>
  ${Array.from({ length: 7 }, (_, i) => `<circle cx="${486 - i * 3.2}" cy="${322 - i * 1.1}" r="${1.6 + i * 0.15}" fill="${PALETTE.ink}" opacity="0.2"/>`).join("")}
  <circle cx="486" cy="322" r="26" fill="${PALETTE.ballYellow}" opacity="0.16" filter="url(#soft-a)"/>`,
      "#1f5a4c",
      "#143d34",
      "#0E2621",
      "#163832",
    );
  },

  "pickleball-2": () => {
    const L = PALETTE.lineWhite;
    return frame(
      "b",
      `
  <!-- close crop: paddle + ball resting on the kitchen line -->
  ${poly([[0, 300], [W, 250], [W, H], [0, H]], "url(#floor-b)")}
  <rect x="0" y="0" width="${W}" height="310" fill="#0b1f1b" opacity="0.5"/>
  <line x1="0" y1="300" x2="${W}" y2="250" stroke="${L}" stroke-width="3" opacity="0.5"/>
  <line x1="0" y1="418" x2="${W}" y2="368" stroke="${L}" stroke-width="7" opacity="0.9"/>
  <line x1="470" y1="393" x2="520" y2="${H}" stroke="${L}" stroke-width="6" opacity="0.75"/>
  <!-- paddle -->
  <g transform="translate(250 372) rotate(-14)">
    <rect x="-8" y="70" width="26" height="96" rx="12" fill="#1a1410"/>
    <rect x="-4" y="76" width="18" height="70" rx="9" fill="#2a211a"/>
    <rect x="-62" y="-72" width="134" height="152" rx="30" fill="#12312a" stroke="${PALETTE.ballYellow}" stroke-width="4"/>
    <rect x="-50" y="-60" width="110" height="128" rx="22" fill="#0f2a24" opacity="0.9"/>
    <circle cx="5" cy="4" r="30" fill="${PALETTE.ballYellow}" opacity="0.10"/>
    <text x="5" y="12" font-family="monospace" font-size="19" font-weight="700" fill="${PALETTE.ballYellow}" text-anchor="middle" opacity="0.85">CTX</text>
  </g>
  <!-- ball with holes -->
  <g transform="translate(556 404)">
    <ellipse cx="6" cy="60" rx="46" ry="11" fill="#000" opacity="0.35"/>
    <circle r="52" fill="${PALETTE.ballYellow}"/>
    <circle r="52" fill="none" stroke="${PALETTE.ink}" stroke-width="2" opacity="0.25"/>
    ${[
      [-24, -20], [2, -30], [26, -14], [-28, 8], [-4, 2], [22, 14], [-16, 32], [12, 36],
    ]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="${PALETTE.ink}" opacity="0.42"/>`)
      .join("")}
    <path d="M-38,-30 A52,52 0 0 1 0,-50" stroke="${PALETTE.lineWhite}" stroke-width="6" fill="none" opacity="0.5" stroke-linecap="round"/>
  </g>`,
      "#2a6d5c",
      "#153f36",
      "#0E2621",
      "#123029",
    );
  },

  "pickleball-3": () => {
    const p = makeProjector({ horizon: 268, nearY: 600, farHalf: 96, nearHalf: 520, centerX: 330 });
    const L = PALETTE.lineWhite;
    return frame(
      "c",
      `
  <!-- night session, floodlights from the right -->
  <rect x="0" y="0" width="${W}" height="278" fill="#071613"/>
  ${Array.from({ length: 40 }, (_, i) => {
    const x = (i * 137) % W;
    const y = (i * 61) % 250;
    return `<circle cx="${x}" cy="${y}" r="${(i % 3) * 0.6 + 0.7}" fill="${L}" opacity="${0.08 + (i % 4) * 0.05}"/>`;
  }).join("")}
  <!-- floodlight masts -->
  <rect x="672" y="96" width="9" height="190" fill="${L}" opacity="0.28"/>
  <rect x="640" y="80" width="74" height="26" rx="6" fill="${L}" opacity="0.4"/>
  <polygon points="676,106 900,600 420,600" fill="${PALETTE.ballYellow}" opacity="0.07"/>
  <ellipse cx="676" cy="100" rx="70" ry="42" fill="${PALETTE.ballYellow}" opacity="0.22" filter="url(#soft-c)"/>
  ${poly([p(-1.7, 0), p(1.7, 0), p(1.7, 1), p(-1.7, 1)], "url(#floor-c)")}
  ${poly([p(-1, 0.3), p(1, 0.3), p(1, 0.58), p(-1, 0.58)], "#2F5185", 'opacity="0.3"')}
  ${line(p(-1, 0.04), p(1, 0.04), L, 2, 0.6)}
  ${line(p(-1, 0.04), p(-1, 1), L, 3, 0.8)}
  ${line(p(1, 0.04), p(1, 1), L, 3, 0.8)}
  ${line(p(-1, 0.3), p(1, 0.3), L, 2, 0.65)}
  ${line(p(-1, 0.58), p(1, 0.58), L, 2, 0.65)}
  ${line(p(0, 0.58), p(0, 1), L, 2, 0.6)}
  ${net(p, 88, PALETTE.lineWhite, 0.2)}
  <ellipse cx="330" cy="560" rx="300" ry="60" fill="${PALETTE.ballYellow}" opacity="0.06" filter="url(#soft-c)"/>`,
      "#1b4f43",
      "#0f322b",
      "#050f0d",
      "#0b201c",
    );
  },

  /* ----------------------------------------------------------- badminton */
  "badminton-1": () => {
    const p = makeProjector({ horizon: 236, nearY: 592, farHalf: 112, nearHalf: 448 });
    const L = PALETTE.lineWhite;
    return frame(
      "a",
      `
  <!-- indoor hall: trusses + rig -->
  <rect x="0" y="0" width="${W}" height="238" fill="#0a1e1a"/>
  ${Array.from({ length: 5 }, (_, i) => `<line x1="0" y1="${40 + i * 30}" x2="${W}" y2="${52 + i * 30}" stroke="${L}" stroke-width="2" opacity="0.07"/>`).join("")}
  ${ceilingRig("a", 4, 62, 178)}
  <!-- wooden floor with plank lines -->
  ${poly([p(-1.9, 0), p(1.9, 0), p(1.9, 1), p(-1.9, 1)], "url(#floor-a)")}
  ${Array.from({ length: 17 }, (_, i) => {
    const cx = -1.9 + (i * 3.8) / 16;
    return line(p(cx, 0), p(cx, 1), "#3b2a18", 1.5, 0.3);
  }).join("")}
  <!-- court -->
  ${poly([p(-1, 0.02), p(1, 0.02), p(1, 1), p(-1, 1)], "#1c4b40", 'opacity="0.55"')}
  ${line(p(-1, 0.02), p(1, 0.02), L, 3, 0.9)}
  ${line(p(-1, 1), p(1, 1), L, 4, 0.95)}
  ${line(p(-1, 0.02), p(-1, 1), L, 3, 0.9)}
  ${line(p(1, 0.02), p(1, 1), L, 3, 0.9)}
  ${line(p(-0.86, 0.02), p(-0.86, 1), L, 2, 0.7)}
  ${line(p(0.86, 0.02), p(0.86, 1), L, 2, 0.7)}
  ${line(p(-1, 0.28), p(1, 0.28), L, 2, 0.75)}
  ${line(p(-1, 0.66), p(1, 0.66), L, 2, 0.75)}
  ${line(p(0, 0.66), p(0, 1), L, 2, 0.7)}
  ${line(p(0, 0.02), p(0, 0.28), L, 2, 0.7)}
  ${net(p, 118)}
  <!-- shuttlecock arc -->
  <path d="M212,392 Q368,214 548,300" stroke="${PALETTE.ballYellow}" stroke-width="2.5" fill="none" opacity="0.4" stroke-dasharray="7 9"/>
  <g transform="translate(548 300) rotate(38)">
    <path d="M0,0 L-17,-40 L17,-40 Z" fill="${L}" opacity="0.95"/>
    ${Array.from({ length: 5 }, (_, i) => `<line x1="0" y1="0" x2="${-17 + i * 8.5}" y2="-40" stroke="${PALETTE.ink}" stroke-width="1" opacity="0.3"/>`).join("")}
    <circle cx="0" cy="4" r="8" fill="${PALETTE.ballYellow}"/>
    <circle cx="0" cy="4" r="8" fill="none" stroke="${PALETTE.ink}" stroke-width="1.2" opacity="0.35"/>
  </g>`,
      "#7a5a34",
      "#4a3620",
      "#0E2621",
      "#14332c",
    );
  },

  "badminton-2": () => {
    const L = PALETTE.lineWhite;
    return frame(
      "b",
      `
  <!-- racket + shuttle detail on hall floor -->
  ${poly([[0, 268], [W, 232], [W, H], [0, H]], "url(#floor-b)")}
  <rect x="0" y="0" width="${W}" height="272" fill="#09201c"/>
  ${ceilingRig("b", 3, 78, 240)}
  ${Array.from({ length: 14 }, (_, i) => `<line x1="0" y1="${300 + i * 24}" x2="${W}" y2="${268 + i * 24}" stroke="#3b2a18" stroke-width="1.5" opacity="0.32"/>`).join("")}
  <line x1="0" y1="360" x2="${W}" y2="326" stroke="${L}" stroke-width="6" opacity="0.85"/>
  <line x1="0" y1="470" x2="${W}" y2="434" stroke="${L}" stroke-width="4" opacity="0.5"/>
  <!-- racket -->
  <g transform="translate(268 388) rotate(-22)">
    <rect x="-9" y="58" width="20" height="150" rx="10" fill="#15100c"/>
    <rect x="-11" y="118" width="24" height="76" rx="12" fill="#241a12"/>
    <path d="M-8,62 L-30,26 M10,62 L32,26" stroke="#15100c" stroke-width="9" stroke-linecap="round"/>
    <ellipse cx="1" cy="-36" rx="72" ry="90" fill="none" stroke="#15100c" stroke-width="9"/>
    <ellipse cx="1" cy="-36" rx="66" ry="84" fill="${PALETTE.ballYellow}" opacity="0.05"/>
    <g opacity="0.55">
      ${Array.from({ length: 11 }, (_, i) => `<line x1="${-58 + i * 11.8}" y1="-116" x2="${-58 + i * 11.8}" y2="44" stroke="${L}" stroke-width="1.1"/>`).join("")}
      ${Array.from({ length: 13 }, (_, i) => `<line x1="-68" y1="${-114 + i * 12.8}" x2="70" y2="${-114 + i * 12.8}" stroke="${L}" stroke-width="1.1"/>`).join("")}
    </g>
    <ellipse cx="1" cy="-36" rx="72" ry="90" fill="none" stroke="${PALETTE.ballYellow}" stroke-width="2.5" opacity="0.5"/>
  </g>
  <!-- shuttlecocks -->
  <g transform="translate(576 424)">
    <ellipse cx="0" cy="82" rx="62" ry="14" fill="#000" opacity="0.32"/>
    <path d="M0,44 L-52,-56 L52,-56 Z" fill="${L}"/>
    ${Array.from({ length: 7 }, (_, i) => `<line x1="0" y1="44" x2="${-52 + i * 17.3}" y2="-56" stroke="${PALETTE.ink}" stroke-width="1.2" opacity="0.28"/>`).join("")}
    <path d="M-52,-56 A56,20 0 0 0 52,-56" fill="none" stroke="${PALETTE.ink}" stroke-width="1.5" opacity="0.22"/>
    <circle cx="0" cy="52" r="26" fill="${PALETTE.ballYellow}"/>
    <path d="M-26,52 A26,26 0 0 0 26,52" fill="${PALETTE.ink}" opacity="0.14"/>
  </g>`,
      "#8a6538",
      "#4a3620",
      "#0a221d",
      "#123029",
    );
  },

  "badminton-3": () => {
    // Each of the three receding courts builds its own projector below.
    const L = PALETTE.lineWhite;
    return frame(
      "c",
      `
  <!-- multi-court hall, angled view -->
  <rect x="0" y="0" width="${W}" height="252" fill="#0a1e1a"/>
  ${ceilingRig("c", 5, 54, 168)}
  <rect x="0" y="180" width="${W}" height="72" fill="#0d2924" opacity="0.9"/>
  ${Array.from({ length: 16 }, (_, i) => `<rect x="${i * 52 + 6}" y="196" width="40" height="42" rx="4" fill="${L}" opacity="0.06"/>`).join("")}
  ${poly([[0, 252], [W, 252], [W, H], [0, H]], "url(#floor-c)")}
  ${Array.from({ length: 22 }, (_, i) => `<line x1="${-200 + i * 62}" y1="252" x2="${-460 + i * 96}" y2="${H}" stroke="#3b2a18" stroke-width="1.5" opacity="0.26"/>`).join("")}
  <!-- three courts receding -->
  ${[0, 1, 2]
    .map((k) => {
      const off = k * 2.35;
      const q = makeProjector({
        horizon: 250,
        nearY: 596,
        farHalf: 88,
        nearHalf: 400,
        centerX: 300 + off * 96,
      });
      const o = k === 0 ? 1 : k === 1 ? 0.62 : 0.36;
      return `
  ${poly([q(-1, 0.05), q(1, 0.05), q(1, 1), q(-1, 1)], "#1c4b40", `opacity="${0.5 * o}"`)}
  ${line(q(-1, 0.05), q(1, 0.05), L, 2.5, 0.85 * o)}
  ${line(q(-1, 1), q(1, 1), L, 3.5, 0.9 * o)}
  ${line(q(-1, 0.05), q(-1, 1), L, 2.5, 0.85 * o)}
  ${line(q(1, 0.05), q(1, 1), L, 2.5, 0.85 * o)}
  ${line(q(-1, 0.62), q(1, 0.62), L, 2, 0.7 * o)}
  ${line(q(0, 0.62), q(0, 1), L, 2, 0.65 * o)}
  ${net(q, 104, PALETTE.lineWhite, 0.22 * o)}`;
    })
    .join("")}`,
      "#7a5a34",
      "#43301c",
      "#0a201c",
      "#123029",
    );
  },

  /* ---------------------------------------------------------- basketball */
  "basketball-1": () => {
    const p = makeProjector({ horizon: 244, nearY: 594, farHalf: 132, nearHalf: 500 });
    const L = PALETTE.lineWhite;
    return frame(
      "a",
      `
  <rect x="0" y="0" width="${W}" height="246" fill="#1a0f09"/>
  ${ceilingRig("a", 4, 50, 186, "#ffb27a")}
  <!-- bleachers -->
  ${Array.from({ length: 6 }, (_, i) => `<rect x="0" y="${152 + i * 16}" width="${W}" height="12" fill="${L}" opacity="${0.04 + i * 0.012}"/>`).join("")}
  <!-- hardwood -->
  ${poly([p(-1.7, 0), p(1.7, 0), p(1.7, 1), p(-1.7, 1)], "url(#floor-a)")}
  ${Array.from({ length: 19 }, (_, i) => {
    const cx = -1.7 + (i * 3.4) / 18;
    return line(p(cx, 0), p(cx, 1), "#5d3316", 1.5, 0.28);
  }).join("")}
  <!-- key + arcs -->
  ${poly([p(-0.42, 0.02), p(0.42, 0.02), p(0.42, 0.44), p(-0.42, 0.44)], "#E4572E", 'opacity="0.3"')}
  ${line(p(-1, 0.02), p(1, 0.02), L, 3, 0.85)}
  ${line(p(-1, 0.02), p(-1, 1), L, 3, 0.8)}
  ${line(p(1, 0.02), p(1, 1), L, 3, 0.8)}
  ${line(p(-0.42, 0.02), p(-0.42, 0.44), L, 2.5, 0.85)}
  ${line(p(0.42, 0.02), p(0.42, 0.44), L, 2.5, 0.85)}
  ${line(p(-0.42, 0.44), p(0.42, 0.44), L, 2.5, 0.85)}
  <path d="M${pt(p(-0.42, 0.44))} A 62 30 0 0 0 ${pt(p(0.42, 0.44))}" fill="none" stroke="${L}" stroke-width="2.5" opacity="0.8"/>
  <path d="M${pt(p(-1, 0.28))} A 250 118 0 0 0 ${pt(p(1, 0.28))}" fill="none" stroke="${L}" stroke-width="2.5" opacity="0.7"/>
  ${line(p(-1, 1), p(1, 1), L, 4, 0.9)}
  <!-- hoop -->
  <g>
    <rect x="392" y="118" width="16" height="106" fill="${L}" opacity="0.34"/>
    <rect x="330" y="88" width="140" height="86" rx="5" fill="#0d2924" opacity="0.9" stroke="${L}" stroke-width="3"/>
    <rect x="368" y="126" width="64" height="40" rx="2" fill="none" stroke="${L}" stroke-width="3"/>
    <ellipse cx="400" cy="184" rx="34" ry="9" fill="none" stroke="${PALETTE.ballYellow}" stroke-width="5"/>
    ${Array.from({ length: 11 }, (_, i) => {
      const a = (i / 11) * Math.PI * 2;
      const x1 = 400 + Math.cos(a) * 34;
      const y1 = 184 + Math.sin(a) * 9;
      const x2 = 400 + Math.cos(a) * 17;
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="230" stroke="${L}" stroke-width="1.6" opacity="0.62"/>`;
    }).join("")}
    <path d="M366,214 Q400,238 434,214" fill="none" stroke="${L}" stroke-width="1.6" opacity="0.5"/>
  </g>
  <!-- ball -->
  <g transform="translate(556 372)">
    <ellipse cx="0" cy="54" rx="42" ry="10" fill="#000" opacity="0.4"/>
    <circle r="44" fill="#E4572E"/>
    <circle r="44" fill="none" stroke="${PALETTE.ink}" stroke-width="2.5" opacity="0.5"/>
    <path d="M-44,0 A44,44 0 0 0 44,0" fill="none" stroke="${PALETTE.ink}" stroke-width="2.5" opacity="0.5"/>
    <path d="M0,-44 A44,44 0 0 0 0,44" fill="none" stroke="${PALETTE.ink}" stroke-width="2.5" opacity="0.5"/>
    <path d="M-38,-22 Q0,0 38,-22" fill="none" stroke="${PALETTE.ink}" stroke-width="2.5" opacity="0.5"/>
    <path d="M-38,22 Q0,0 38,22" fill="none" stroke="${PALETTE.ink}" stroke-width="2.5" opacity="0.5"/>
    <circle cx="-15" cy="-16" r="15" fill="${PALETTE.lineWhite}" opacity="0.12"/>
  </g>`,
      "#a4622c",
      "#5d3316",
      "#180d07",
      "#2a1a12",
    );
  },

  "basketball-2": () => {
    const L = PALETTE.lineWhite;
    return frame(
      "b",
      `
  <!-- low-angle hoop against night sky -->
  ${Array.from({ length: 46 }, (_, i) => {
    const x = (i * 173) % W;
    const y = (i * 97) % 340;
    return `<circle cx="${x}" cy="${y}" r="${(i % 3) * 0.7 + 0.7}" fill="${L}" opacity="${0.07 + (i % 5) * 0.045}"/>`;
  }).join("")}
  <ellipse cx="400" cy="210" rx="290" ry="180" fill="${PALETTE.ballYellow}" opacity="0.07" filter="url(#soft-b)"/>
  ${poly([[0, 470], [W, 430], [W, H], [0, H]], "url(#floor-b)")}
  <line x1="0" y1="470" x2="${W}" y2="430" stroke="${L}" stroke-width="3" opacity="0.4"/>
  <line x1="0" y1="536" x2="${W}" y2="496" stroke="${L}" stroke-width="5" opacity="0.6"/>
  <!-- pole + backboard, seen from below -->
  <rect x="384" y="300" width="30" height="220" rx="4" fill="#0a1a16" stroke="${L}" stroke-width="2" opacity="0.9"/>
  <g>
    <path d="M212,96 L588,68 L596,236 L204,244 Z" fill="#0d2924" stroke="${L}" stroke-width="4"/>
    <path d="M340,150 L462,142 L466,214 L336,218 Z" fill="none" stroke="${PALETTE.ballYellow}" stroke-width="4"/>
    <text x="400" y="120" font-family="monospace" font-size="21" font-weight="700" fill="${L}" opacity="0.35" text-anchor="middle">COURTIX</text>
  </g>
  <ellipse cx="400" cy="256" rx="66" ry="19" fill="none" stroke="#E4572E" stroke-width="7"/>
  ${Array.from({ length: 13 }, (_, i) => {
    const a = (i / 13) * Math.PI * 2;
    const x1 = 400 + Math.cos(a) * 66;
    const y1 = 256 + Math.sin(a) * 19;
    const x2 = 400 + Math.cos(a) * 30;
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="334" stroke="${L}" stroke-width="2" opacity="0.7"/>`;
  }).join("")}
  <ellipse cx="400" cy="332" rx="30" ry="8" fill="none" stroke="${L}" stroke-width="2" opacity="0.6"/>
  <!-- ball dropping through -->
  <g transform="translate(400 214)">
    <circle r="52" fill="#E4572E"/>
    <circle r="52" fill="none" stroke="${PALETTE.ink}" stroke-width="3" opacity="0.5"/>
    <path d="M0,-52 A52,52 0 0 0 0,52" fill="none" stroke="${PALETTE.ink}" stroke-width="3" opacity="0.5"/>
    <path d="M-45,-26 Q0,0 45,-26" fill="none" stroke="${PALETTE.ink}" stroke-width="3" opacity="0.5"/>
    <path d="M-45,26 Q0,0 45,26" fill="none" stroke="${PALETTE.ink}" stroke-width="3" opacity="0.5"/>
    <circle cx="-18" cy="-19" r="18" fill="${PALETTE.lineWhite}" opacity="0.13"/>
  </g>`,
      "#3f4a44",
      "#1b2622",
      "#04100d",
      "#0b201c",
    );
  },

  "basketball-3": () => {
    const p = makeProjector({ horizon: 268, nearY: 598, farHalf: 150, nearHalf: 620, centerX: 380 });
    const L = PALETTE.lineWhite;
    return frame(
      "c",
      `
  <!-- covered outdoor court, side angle -->
  <rect x="0" y="0" width="${W}" height="270" fill="#0d1f1a"/>
  <path d="M0,60 L400,14 L800,60 L800,96 L400,52 L0,96 Z" fill="#0a1815" stroke="${L}" stroke-width="2" opacity="0.55"/>
  ${Array.from({ length: 7 }, (_, i) => `<rect x="${60 + i * 116}" y="70" width="7" height="200" fill="${L}" opacity="0.16"/>`).join("")}
  ${ceilingRig("c", 3, 108, 250, "#ffd98a")}
  ${poly([p(-2.2, 0), p(2.2, 0), p(2.2, 1), p(-2.2, 1)], "url(#floor-c)")}
  <!-- painted court -->
  ${poly([p(-1.25, 0.05), p(1.25, 0.05), p(1.25, 1), p(-1.25, 1)], "#2b6a4f", 'opacity="0.28"')}
  ${line(p(-1.25, 0.05), p(1.25, 0.05), L, 2.5, 0.7)}
  ${line(p(-1.25, 1), p(1.25, 1), L, 4, 0.85)}
  ${line(p(-1.25, 0.05), p(-1.25, 1), L, 3, 0.75)}
  ${line(p(1.25, 0.05), p(1.25, 1), L, 3, 0.75)}
  ${line(p(-1.25, 0.5), p(1.25, 0.5), L, 3, 0.8)}
  <ellipse cx="${p(0, 0.5)[0].toFixed(0)}" cy="${p(0, 0.5)[1].toFixed(0)}" rx="96" ry="30" fill="none" stroke="${L}" stroke-width="2.5" opacity="0.75"/>
  <path d="M${pt(p(-0.6, 0.05))} A 150 76 0 0 0 ${pt(p(0.6, 0.05))}" fill="none" stroke="${L}" stroke-width="2.5" opacity="0.6"/>
  <!-- hoops both ends -->
  ${[
    { x: 380, y: 214, s: 1 },
    { x: 380, y: 300, s: 0 },
  ]
    .filter((h) => h.s === 1)
    .map(
      (h) => `
  <rect x="${h.x - 7}" y="${h.y - 6}" width="14" height="92" fill="${L}" opacity="0.3"/>
  <rect x="${h.x - 62}" y="${h.y - 86}" width="124" height="76" rx="4" fill="#0d2924" opacity="0.92" stroke="${L}" stroke-width="3"/>
  <rect x="${h.x - 28}" y="${h.y - 54}" width="56" height="36" rx="2" fill="none" stroke="${PALETTE.ballYellow}" stroke-width="2.5"/>
  <ellipse cx="${h.x}" cy="${h.y + 2}" rx="30" ry="8" fill="none" stroke="#E4572E" stroke-width="4"/>
  ${Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    return `<line x1="${(h.x + Math.cos(a) * 30).toFixed(1)}" y1="${(h.y + 2 + Math.sin(a) * 8).toFixed(1)}" x2="${(h.x + Math.cos(a) * 15).toFixed(1)}" y2="${h.y + 42}" stroke="${L}" stroke-width="1.4" opacity="0.55"/>`;
  }).join("")}`,
    )
    .join("")}`,
      "#2f6b52",
      "#17372c",
      "#081a16",
      "#0e2621",
    );
  },

  /* ---------------------------------------------------------------- golf */
  "golf-1": () => {
    const L = PALETTE.lineWhite;
    return frame(
      "a",
      `
  <!-- simulator bay: projected fairway on an impact screen -->
  <rect x="0" y="0" width="${W}" height="${H}" fill="#08130f"/>
  <!-- screen -->
  <rect x="64" y="40" width="672" height="392" rx="6" fill="#0d2a20"/>
  <clipPath id="screen-a"><rect x="64" y="40" width="672" height="392" rx="6"/></clipPath>
  <g clip-path="url(#screen-a)">
    <rect x="64" y="40" width="672" height="196" fill="#1d4f6e"/>
    <rect x="64" y="40" width="672" height="196" fill="url(#bloom-a)"/>
    <circle cx="620" cy="106" r="34" fill="${PALETTE.ballYellow}" opacity="0.45"/>
    <path d="M64,236 Q220,200 400,214 Q580,228 736,196 L736,432 L64,432 Z" fill="#3f7a3a"/>
    <path d="M64,286 Q240,254 420,270 Q600,286 736,252 L736,432 L64,432 Z" fill="#4C7A3F"/>
    <path d="M180,432 Q300,300 400,286 Q500,300 620,432 Z" fill="#5f9b4e" opacity="0.85"/>
    <ellipse cx="400" cy="292" rx="52" ry="13" fill="#6fb35a"/>
    <ellipse cx="286" cy="336" rx="34" ry="14" fill="#c8b98d" opacity="0.8"/>
    <ellipse cx="516" cy="352" rx="40" ry="15" fill="#c8b98d" opacity="0.7"/>
    ${Array.from({ length: 9 }, (_, i) => `<path d="M${90 + i * 82},236 l-13,-30 l13,-8 l13,8 z" fill="#1f4a22" opacity="0.55"/>`).join("")}
    <!-- pin -->
    <line x1="400" y1="290" x2="400" y2="236" stroke="${L}" stroke-width="2.5"/>
    <path d="M400,236 L432,246 L400,256 Z" fill="#E4572E"/>
    <circle cx="400" cy="291" r="4" fill="#123" opacity="0.6"/>
    <!-- shot tracer -->
    <path d="M400,424 Q400,222 400,290" stroke="${PALETTE.ballYellow}" stroke-width="2.5" fill="none" opacity="0.5" stroke-dasharray="6 8"/>
  </g>
  <rect x="64" y="40" width="672" height="392" rx="6" fill="none" stroke="${L}" stroke-width="3" opacity="0.35"/>
  <!-- HUD readout -->
  <g font-family="monospace" font-size="15" fill="${PALETTE.ballYellow}">
    <rect x="88" y="62" width="196" height="94" rx="8" fill="#04100d" opacity="0.72"/>
    <text x="104" y="86" opacity="0.55" font-size="11">CARRY</text><text x="196" y="86">212 yd</text>
    <text x="104" y="112" opacity="0.55" font-size="11">BALL SPD</text><text x="196" y="112">148 mph</text>
    <text x="104" y="138" opacity="0.55" font-size="11">LAUNCH</text><text x="196" y="138">14.2°</text>
  </g>
  <!-- hitting mat -->
  ${poly([[64, 432], [736, 432], [800, H], [0, H]], "#2f5c2c")}
  ${Array.from({ length: 26 }, (_, i) => `<line x1="${64 + i * 27}" y1="432" x2="${i * 32}" y2="${H}" stroke="#1f4a22" stroke-width="2" opacity="0.5"/>`).join("")}
  <rect x="300" y="470" width="200" height="70" rx="6" fill="#3f7a3a" stroke="${L}" stroke-width="2" opacity="0.9"/>
  <!-- tee + ball -->
  <line x1="400" y1="486" x2="400" y2="504" stroke="${L}" stroke-width="4"/>
  <circle cx="400" cy="478" r="14" fill="${PALETTE.lineWhite}"/>
  ${[[-5, -5], [3, -6], [-6, 3], [4, 3], [0, -1]].map(([x, y]) => `<circle cx="${400 + x}" cy="${478 + y}" r="1.9" fill="${PALETTE.ink}" opacity="0.25"/>`).join("")}
  <circle cx="400" cy="478" r="26" fill="${PALETTE.ballYellow}" opacity="0.18" filter="url(#soft-a)"/>`,
      "#3f7a3a",
      "#1c3016",
      "#08130f",
      "#0d2019",
    );
  },

  "golf-2": () => {
    const L = PALETTE.lineWhite;
    return frame(
      "b",
      `
  <!-- ball on tee, dawn fairway, shallow depth -->
  <rect x="0" y="0" width="${W}" height="330" fill="url(#sky-b)"/>
  <circle cx="612" cy="128" r="58" fill="${PALETTE.ballYellow}" opacity="0.28" filter="url(#soft-b)"/>
  <circle cx="612" cy="128" r="30" fill="${PALETTE.ballYellow}" opacity="0.55"/>
  ${Array.from({ length: 5 }, (_, i) => `<ellipse cx="${140 + i * 170}" cy="${172 + (i % 3) * 26}" rx="${72 + i * 12}" ry="14" fill="${L}" opacity="0.05"/>`).join("")}
  <path d="M0,300 Q200,268 400,286 Q600,304 800,272 L800,340 L0,340 Z" fill="#25452a"/>
  ${Array.from({ length: 11 }, (_, i) => `<path d="M${34 + i * 74},300 l-17,-40 l17,-11 l17,11 z" fill="#16301a" opacity="0.75"/>`).join("")}
  <path d="M0,326 Q220,300 420,316 Q620,332 800,304 L800,${H} L0,${H} Z" fill="url(#floor-b)"/>
  <!-- mown stripes -->
  ${Array.from({ length: 8 }, (_, i) => `<path d="M${-260 + i * 190},${H} L${140 + i * 118},322 L${226 + i * 118},322 L${-120 + i * 190},${H} Z" fill="${L}" opacity="${i % 2 ? 0.045 : 0}"/>`).join("")}
  <!-- distant pin -->
  <line x1="596" y1="306" x2="596" y2="252" stroke="${L}" stroke-width="2" opacity="0.75"/>
  <path d="M596,252 L628,262 L596,272 Z" fill="#E4572E" opacity="0.9"/>
  <!-- hero: ball on tee -->
  <g transform="translate(300 452)">
    <ellipse cx="6" cy="96" rx="96" ry="20" fill="#000" opacity="0.35"/>
    <path d="M-13,52 L13,52 L7,104 L-7,104 Z" fill="#f0e6d0"/>
    <ellipse cx="0" cy="52" rx="15" ry="5" fill="#fff8ea"/>
    <circle cy="0" r="66" fill="${PALETTE.lineWhite}"/>
    <circle cy="0" r="66" fill="none" stroke="${PALETTE.ink}" stroke-width="1.5" opacity="0.18"/>
    <path d="M-66,0 A66,66 0 0 1 -20,-62" stroke="#fff" stroke-width="9" fill="none" opacity="0.85" stroke-linecap="round"/>
    <path d="M40,44 A66,66 0 0 0 66,0" stroke="${PALETTE.ink}" stroke-width="7" fill="none" opacity="0.10" stroke-linecap="round"/>
    ${(() => {
      let d = "";
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 7; c++) {
          const x = -46 + c * 15.5 + (r % 2) * 7.5;
          const y = -42 + r * 20;
          if (Math.hypot(x, y) < 54) d += `<circle cx="${x.toFixed(1)}" cy="${y}" r="4.6" fill="${PALETTE.ink}" opacity="0.10"/>`;
        }
      }
      return d;
    })()}
  </g>
  <!-- club head entering frame -->
  <g transform="translate(566 470) rotate(16)">
    <path d="M0,0 L96,-16 Q126,-12 126,16 L126,54 Q126,74 100,74 L0,66 Z" fill="#b9c2c6"/>
    <path d="M8,10 L112,-2 L112,50 L8,58 Z" fill="#8d979c" opacity="0.55"/>
    ${Array.from({ length: 9 }, (_, i) => `<line x1="${20 + i * 10}" y1="6" x2="${20 + i * 10}" y2="60" stroke="#5e686c" stroke-width="2" opacity="0.6"/>`).join("")}
    <rect x="-46" y="4" width="52" height="17" rx="8" fill="#5e686c" transform="rotate(-24 -20 12)"/>
  </g>`,
      "#4C7A3F",
      "#2a4a22",
      "#153a4e",
      "#2c6a52",
    );
  },

  "golf-3": () => {
    const L = PALETTE.lineWhite;
    return frame(
      "c",
      `
  <!-- floodlit driving range, covered stalls -->
  ${Array.from({ length: 40 }, (_, i) => {
    const x = (i * 149) % W;
    const y = (i * 83) % 200;
    return `<circle cx="${x}" cy="${y}" r="${(i % 3) * 0.6 + 0.6}" fill="${L}" opacity="${0.06 + (i % 4) * 0.05}"/>`;
  }).join("")}
  <!-- range floodlights -->
  ${[130, 400, 670]
    .map(
      (x) => `
  <rect x="${x - 4}" y="150" width="8" height="120" fill="${L}" opacity="0.25"/>
  <rect x="${x - 30}" y="136" width="60" height="20" rx="5" fill="${L}" opacity="0.38"/>
  <ellipse cx="${x}" cy="152" rx="58" ry="34" fill="${PALETTE.ballYellow}" opacity="0.16" filter="url(#soft-c)"/>
  <polygon points="${x},156 ${x + 210},${H} ${x - 210},${H}" fill="${PALETTE.ballYellow}" opacity="0.045"/>`,
    )
    .join("")}
  <!-- distance markers on turf -->
  <path d="M0,272 Q400,246 800,272 L800,${H} L0,${H} Z" fill="url(#floor-c)"/>
  ${[
    { y: 306, t: "250" },
    { y: 356, t: "200" },
    { y: 424, t: "150" },
  ]
    .map(
      (m) => `
  <path d="M0,${m.y} Q400,${m.y - 16} 800,${m.y}" stroke="${L}" stroke-width="1.5" fill="none" opacity="0.18" stroke-dasharray="16 22"/>
  <text x="712" y="${m.y - 8}" font-family="monospace" font-size="15" fill="${L}" opacity="0.4">${m.t}</text>`,
    )
    .join("")}
  <!-- covered stall structure, foreground -->
  <rect x="0" y="0" width="${W}" height="122" fill="#071411"/>
  <rect x="0" y="112" width="${W}" height="14" fill="${L}" opacity="0.2"/>
  ${[40, 300, 560].map((x) => `<rect x="${x}" y="122" width="13" height="${H - 122}" fill="#0a1a16" stroke="${L}" stroke-width="1.5" opacity="0.55"/>`).join("")}
  <!-- mats -->
  ${[
    [88, 0.95],
    [348, 0.7],
    [608, 0.5],
  ]
    .map(
      ([x, o]) => `
  <g opacity="${o}">
    <rect x="${x}" y="470" width="168" height="86" rx="6" fill="#2f5c2c" stroke="${L}" stroke-width="2"/>
    ${Array.from({ length: 12 }, (_, i) => `<line x1="${x + 8 + i * 13}" y1="474" x2="${x + 8 + i * 13}" y2="552" stroke="#1f4a22" stroke-width="2.5" opacity="0.6"/>`).join("")}
    <line x1="${x + 84}" y1="492" x2="${x + 84}" y2="506" stroke="${L}" stroke-width="3.5"/>
    <circle cx="${x + 84}" cy="486" r="11" fill="${PALETTE.lineWhite}"/>
    <ellipse cx="${x + 84}" cy="560" rx="70" ry="12" fill="#000" opacity="0.3"/>
  </g>`,
    )
    .join("")}
  <!-- bucket of balls -->
  <g transform="translate(700 468)">
    <path d="M-38,0 L38,0 L30,74 L-30,74 Z" fill="#1b3a33" stroke="${L}" stroke-width="2" opacity="0.95"/>
    ${[[-18, -6], [0, -12], [18, -6], [-9, -20], [9, -20], [0, -28]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="11" fill="${PALETTE.lineWhite}" opacity="0.9"/><circle cx="${x - 3}" cy="${y - 3}" r="4" fill="#fff" opacity="0.5"/>`).join("")}
  </g>`,
      "#2f6b3f",
      "#14301a",
      "#050f0d",
      "#0b201c",
    );
  },
};

/* --------------------------------------------------------------------- run */

mkdirSync(OUT, { recursive: true });

let count = 0;
for (const [name, build] of Object.entries(SCENES)) {
  const svg = build();
  writeFileSync(join(OUT, `${name}.svg`), svg, "utf8");
  count++;
  console.log(`  ✓ ${name}.svg`);
}

console.log(`\nGenerated ${count} sport images into public/images/sports/`);
