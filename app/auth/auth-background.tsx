"use client";

/**
 * Animated auth background: scattered post-its → drag select → AI prompt → sorted by theme.
 * ALL animations use CSS @keyframes with linear timing on one clock. No SVG SMIL.
 *
 * 18s loop:
 *   0–1s     (0–5.6%)      Scattered post-its, idle
 *   1–3s     (5.6–16.7%)   Cursor drags, selection rect grows with it
 *   3–3.3s   (16.7–18.3%)  Cursor + rect fade out, blue outlines appear on notes
 *   3.3–5s   (18.3–27.8%)  AI prompt slides in, text types
 *   5–7s     (27.8–38.9%)  Notes sort into 3 columns, headers appear
 *   7–14.5s  (38.9–80.6%)  Hold sorted
 *   14.5–16s (80.6–88.9%)  Fade out
 *   16–18s   (88.9–100%)   Reset + fade in
 */

const notes = [
  { id: "n1", text: "User interviews",  sub: "5 sessions booked",    sx: 340, sy: 160, fx: 110, fy: 120, color: "#fef9c3", tc: "#713f12" },
  { id: "n2", text: "Feature requests",  sub: "from beta testers",   sx: 460, sy: 260, fx: 110, fy: 230, color: "#fef9c3", tc: "#713f12" },
  { id: "n3", text: "Pricing tiers",     sub: "free / pro / team",   sx: 230, sy: 310, fx: 110, fy: 340, color: "#fef9c3", tc: "#713f12" },
  { id: "n4", text: "Launch sequence",   sub: "week 1-4 timeline",   sx: 520, sy: 170, fx: 340, fy: 120, color: "#fce7f3", tc: "#701a4e" },
  { id: "n5", text: "Content calendar",  sub: "blog + social posts", sx: 290, sy: 230, fx: 340, fy: 230, color: "#fce7f3", tc: "#701a4e" },
  { id: "n6", text: "Landing page copy", sub: "hero + CTA variants", sx: 420, sy: 360, fx: 340, fy: 340, color: "#fce7f3", tc: "#701a4e" },
  { id: "n7", text: "API endpoints",     sub: "REST + webhooks",     sx: 190, sy: 190, fx: 570, fy: 120, color: "#dbeafe", tc: "#1e3a5f" },
  { id: "n8", text: "DB migrations",     sub: "schema v2 rollout",   sx: 560, sy: 320, fx: 570, fy: 230, color: "#dbeafe", tc: "#1e3a5f" },
  { id: "n9", text: "CI/CD pipeline",    sub: "staging → prod flow", sx: 380, sy: 130, fx: 570, fy: 340, color: "#dbeafe", tc: "#1e3a5f" },
];

const W = 140;
const H = 90;
const D = "18s";
// Selection box encompasses all scattered notes
const S = { x: 150, y: 100, w: 480, h: 320 };

export default function AuthBackground() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", filter: "blur(6px)", opacity: 0.65 }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 800 560"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block" }}
      >
        <defs>
          <pattern id="bg-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="12" cy="12" r="1.2" fill="#cfc7b8" />
          </pattern>
        </defs>

        {/* Background */}
        <rect width="800" height="560" fill="#fef9f3" />
        <rect width="800" height="560" fill="url(#bg-dots)" />

        {/* Notes */}
        {notes.map((n) => (
          <g key={n.id} className={`note ${n.id}`}>
            <rect x="2" y="2" width={W} height={H} rx="2" fill="rgba(0,0,0,0.06)" />
            <rect className="note-sel" x="-2" y="-2" width={W+4} height={H+4} rx="4" fill="none" stroke="#3b82f6" strokeWidth="2.5" />
            <rect width={W} height={H} rx="2" fill={n.color} stroke="#1a1814" strokeWidth="0.8" />
            <text x="12" y="28" fontFamily="var(--font-dm-sans),sans-serif" fontSize="13" fontWeight="600" fill={n.tc}>{n.text}</text>
            <text x="12" y="48" fontFamily="var(--font-dm-sans),sans-serif" fontSize="10.5" fill={n.tc} opacity="0.6">{n.sub}</text>
            <line x1="12" y1="62" x2={W-24} y2="62" stroke={n.tc} strokeWidth="0.5" opacity="0.2" />
          </g>
        ))}

        {/* Column headers */}
        <g className="col-headers">
          <text x="130" y="108" fontFamily="var(--font-ibm-plex-mono),monospace" fontSize="10" fill="#1a1814" fontWeight="600" letterSpacing="0.06em">PRODUCT</text>
          <text x="360" y="108" fontFamily="var(--font-ibm-plex-mono),monospace" fontSize="10" fill="#1a1814" fontWeight="600" letterSpacing="0.06em">MARKETING</text>
          <text x="590" y="108" fontFamily="var(--font-ibm-plex-mono),monospace" fontSize="10" fill="#1a1814" fontWeight="600" letterSpacing="0.06em">ENGINEERING</text>
        </g>

        {/* AI prompt */}
        <g className="ai-prompt" transform="translate(200, 490)">
          <rect width="400" height="36" rx="18" fill="#1a1814" />
          <text x="16" y="23" fontFamily="var(--font-ibm-plex-mono),monospace" fontSize="12" fill="#f7f4ef" className="prompt-text">Sort these by theme</text>
          <circle cx="376" cy="18" r="8" fill="#f5e642" />
          <text x="372" y="22" fontSize="10" fill="#1a1814">&#x2728;</text>
        </g>

        {/* Selection rectangle — full size, scaled from top-left via CSS */}
        <rect
          className="sel-rect"
          x={S.x} y={S.y} width={S.w} height={S.h}
          fill="rgba(59,130,246,0.08)"
          stroke="#3b82f6"
          strokeWidth="2"
        />

        {/* Cursor — rendered last to be on top */}
        <g className="cursor-g">
          <path d="M0,0 L0,16 L4.2,11.8 L7.5,19 L10.2,17.5 L7,10.5 L12,10.5 Z" fill="#1a1814" stroke="#f7f4ef" strokeWidth="1.2" />
        </g>
      </svg>

      <style>{`
        /* ================================================================= */
        /* ALL animations: CSS @keyframes, linear easing, same ${D} clock    */
        /* ================================================================= */

        /* --- Selection rectangle ----------------------------------------- */
        /* Scales from top-left corner (transform-box makes origin local)    */
        .sel-rect {
          transform-box: fill-box;
          transform-origin: 0% 0%;
          opacity: 0;
          transform: scale(0, 0);
          animation: sel ${D} linear infinite;
        }
        @keyframes sel {
          0%, 5%    { transform: scale(0, 0); opacity: 0; }
          5.6%      { transform: scale(0, 0); opacity: 1; }
          16.7%     { transform: scale(1, 1); opacity: 1; }
          18.3%     { transform: scale(1, 1); opacity: 0; }
          100%      { transform: scale(0, 0); opacity: 0; }
        }

        /* --- Cursor ------------------------------------------------------ */
        .cursor-g {
          opacity: 0;
          animation: cur ${D} linear infinite;
        }
        @keyframes cur {
          0%, 4%    { transform: translate(${S.x - 20}px, ${S.y - 20}px); opacity: 0; }
          5.6%      { transform: translate(${S.x}px, ${S.y}px); opacity: 1; }
          16.7%     { transform: translate(${S.x + S.w}px, ${S.y + S.h}px); opacity: 1; }
          18.3%     { transform: translate(${S.x + S.w}px, ${S.y + S.h}px); opacity: 0; }
          100%      { transform: translate(${S.x + S.w}px, ${S.y + S.h}px); opacity: 0; }
        }

        /* --- Blue outline on each note (appears after selection) --------- */
        .note-sel {
          opacity: 0;
          animation: nsel ${D} linear infinite;
        }
        @keyframes nsel {
          0%, 16.7%  { opacity: 0; }
          17.5%      { opacity: 1; }
          28%        { opacity: 1; }
          31%        { opacity: 0; }
          100%       { opacity: 0; }
        }

        /* --- AI prompt bar ----------------------------------------------- */
        .ai-prompt {
          opacity: 0;
          animation: prompt ${D} linear infinite;
        }
        @keyframes prompt {
          0%, 20%   { opacity: 0; transform: translate(200px, 500px); }
          23%       { opacity: 1; transform: translate(200px, 490px); }
          80.6%     { opacity: 1; transform: translate(200px, 490px); }
          86%       { opacity: 0; transform: translate(200px, 490px); }
          100%      { opacity: 0; }
        }

        /* Typing reveal */
        .prompt-text {
          animation: ptype ${D} steps(18, end) infinite;
        }
        @keyframes ptype {
          0%, 21%   { clip-path: inset(0 100% 0 0); }
          27.8%     { clip-path: inset(0 0% 0 0); }
          100%      { clip-path: inset(0 0% 0 0); }
        }

        /* --- Column headers ---------------------------------------------- */
        .col-headers {
          opacity: 0;
          animation: hdrs ${D} linear infinite;
        }
        @keyframes hdrs {
          0%, 36%   { opacity: 0; }
          42%       { opacity: 1; }
          80.6%     { opacity: 1; }
          86%       { opacity: 0; }
          100%      { opacity: 0; }
        }

        /* --- Note positions (scatter → sort) ----------------------------- */
        ${notes.map((n) => `
        .${n.id} {
          animation: ${n.id}m ${D} linear infinite;
        }
        @keyframes ${n.id}m {
          0%        { transform: translate(${n.sx}px, ${n.sy}px); }
          27.8%     { transform: translate(${n.sx}px, ${n.sy}px); }
          38.9%     { transform: translate(${n.fx}px, ${n.fy}px); }
          80.6%     { transform: translate(${n.fx}px, ${n.fy}px); opacity: 1; }
          86%       { transform: translate(${n.fx}px, ${n.fy}px); opacity: 0; }
          92%       { transform: translate(${n.sx}px, ${n.sy}px); opacity: 0; }
          100%      { transform: translate(${n.sx}px, ${n.sy}px); opacity: 1; }
        }
        `).join("")}

        /* --- Scene fade for loop reset ----------------------------------- */
        svg {
          animation: sfade ${D} linear infinite;
        }
        @keyframes sfade {
          0%, 80.6% { opacity: 1; }
          86%       { opacity: 0; }
          93%       { opacity: 0; }
          98%       { opacity: 1; }
          100%      { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
