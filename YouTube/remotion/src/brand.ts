// AriseTransform brand constants — sourced from YouTube/brand-guidelines.md
// Edit brand-guidelines.md to change values, then update here.

export const brand = {
  // Colors
  primary: "#F97316",        // vibrant orange — accent, active states, stat numbers
  secondary: "#E8622A",      // deeper orange — gradient ends, hover states
  background: "#FDF5EE",     // warm cream — video background base
  cardBg: "#FFFFFF",         // pure white — all floating cards
  textPrimary: "#1C1C1E",    // near-black charcoal — body text, card titles
  textMuted: "#9CA3AF",      // warm gray — subtitles, timestamps, axis labels
  accentGlow: "rgba(249, 115, 22, 0.20)", // orange glow — active card rings, nodes

  // Background gradient (apply as CSS background on root container)
  // Centered warm glow — matches reference screenshots
  backgroundGradient: "radial-gradient(ellipse 70% 65% at 62% 48%, rgba(249,115,22,0.22) 0%, rgba(253,245,238,1) 68%)",

  // Bar chart gradient (applied vertically, bottom to top)
  barGradient: ["#F97316", "#FDBA74"], // [bottom, top]

  // Fonts — must be loaded via @import in index.css
  fontSans: "Inter, sans-serif",
  fontBold: "Inter, sans-serif",     // use fontWeight: 700-900
  fontScript: "Caveat, cursive",     // emphasis words only: "never", "talent"
  fontHeading: "Poppins, sans-serif",

  // Layout
  borderRadius: 20,                                    // all cards, bubbles, icon badges
  cardBorder: "1px solid rgba(0, 0, 0, 0.05)",
  cardShadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
  activeBorder: "2px solid #F97316",
  activeGlow: "0 0 0 4px rgba(249, 115, 22, 0.15)",   // orange ring on active card

  // Icon badge (rounded square with orange gradient)
  badgeBorderRadius: 16,
  badgeGradient: "linear-gradient(135deg, #FDBA74, #F97316)",

  // Animation timing (in frames at 30fps)
  enterFrames: 11,   // ~350ms — slide+fade from 0.95 scale + 12px below
  holdFrames: 75,    // ~2500ms
  exitFrames: 8,     // ~250ms — quick fade
  staggerFrames: 5,  // ~150ms between stacked card reveals

  // Channel
  channelName: "Shubham Gunjal",
  channelHandle: "@shubhamgunjal",
  ctaText: "Subscribe — I build in public daily",
} as const;
