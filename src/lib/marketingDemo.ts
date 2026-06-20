import type { MarketingEngine } from "./api";

const escapeSvg = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function adPoster({
  eyebrow,
  headline,
  sub,
  cta,
  from,
  to,
}: {
  eyebrow: string;
  headline: string;
  sub: string;
  cta: string;
  from: string;
  to: string;
}): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${from}" />
          <stop offset="1" stop-color="${to}" />
        </linearGradient>
        <radialGradient id="flare" cx="82%" cy="18%" r="62%">
          <stop offset="0" stop-color="rgba(255,255,255,0.44)" />
          <stop offset="1" stop-color="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <rect width="1200" height="675" fill="url(#bg)" />
      <rect width="1200" height="675" fill="url(#flare)" />
      <g fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2">
        <path d="M725 -40 L1220 455" />
        <path d="M810 -40 L1305 455" />
        <path d="M650 720 L1140 230" />
      </g>
      <circle cx="986" cy="154" r="140" fill="rgba(255,255,255,0.08)" />
      <circle cx="1040" cy="230" r="52" fill="rgba(255,255,255,0.12)" />
      <rect x="64" y="78" width="238" height="42" rx="21" fill="rgba(255,255,255,0.16)" />
      <text x="92" y="106" fill="rgba(255,255,255,0.86)" font-size="17" font-weight="800" letter-spacing="5" font-family="Space Grotesk, Arial, sans-serif">${escapeSvg(eyebrow)}</text>
      <text x="64" y="332" fill="#fff" font-size="76" font-weight="900" font-family="Space Grotesk, Arial, sans-serif">${escapeSvg(headline)}</text>
      <text x="68" y="386" fill="rgba(255,255,255,0.9)" font-size="28" font-family="Inter, Arial, sans-serif">${escapeSvg(sub)}</text>
      <rect x="64" y="462" width="322" height="66" rx="33" fill="#fff" />
      <text x="225" y="505" fill="#0b1020" font-size="24" font-weight="800" text-anchor="middle" font-family="Space Grotesk, Arial, sans-serif">${escapeSvg(cta)}</text>
      <text x="64" y="602" fill="rgba(255,255,255,0.58)" font-size="18" letter-spacing="4" font-family="Space Grotesk, Arial, sans-serif">KOKSPLAY PERFORMANCE LAB</text>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const adVariants = [
  {
    label: "Pattern interrupt",
    headline: "Stop blaming your aim.",
    subheadline: "Sub-1ms wireless that obeys your thumbs.",
    body: "Tournament-grade precision, anodized grip, zero drift. Climb the ranks you actually deserve.",
    cta: "Claim Pro Precision",
    caption: "Your controller is why you're hardstuck. Fix that. #KoksPlay #RankedClimb",
    copy_logic: {
      audience_trigger: "Loss aversion plus ranked status.",
      tone_alignment: "Bold challenger voice with a sharp gaming-native edge.",
      ab_hypothesis: "Provocation beats feature-led copy on cold TikTok traffic.",
    },
    image_prompt:
      "Dutch-angle controller hero, neon rim light, refraction streaks, bold headline overlaid.",
  },
  {
    label: "Proof and curiosity",
    headline: "What the 1% play with.",
    subheadline: "The pro controller, now in your hands.",
    body: "The gear behind tournament clutches: sub-1ms latency, gold-strip grip, 2-year swap warranty.",
    cta: "See the Spec",
    caption: "Pros do not get lucky. They get precise. #KoksPlay",
    copy_logic: {
      audience_trigger: "Social proof plus aspiration.",
      tone_alignment: "Premium, confident, and technically credible.",
      ab_hypothesis: "Authority framing wins warmer, mid-funnel audiences.",
    },
    image_prompt:
      "Macro shot of gold-strip grip on a dark studio set, champion-gold gradient, headline overlaid.",
  },
];

export const DEMO_ENGINE: MarketingEngine = {
  brand_identity: {
    brand_identity: {
      name: "KoksPlay",
      category: "Gaming peripherals and esports hardware",
      brand_archetype: "Hero",
      tone_of_voice: "Bold, precise, competitive",
      personality_traits: ["Electric", "Exacting", "Fearless"],
    },
    visual_identity: {
      primary_colors: ["#1E90FF Dodger Blue", "#D4AF37 Champion Gold"],
      secondary_colors: ["#0B1020 Void", "#F5F7FF Ice"],
      typography_style: "Wide geometric sans with engineered spacing",
      logo_treatment: "Angular K monogram with a compact wordmark",
      visual_language: "Street racing energy meets premium esports lab",
    },
    brand_positioning: {
      market_tier: "Premium",
      key_differentiator: "Tournament-grade precision for everyday ranked players",
      brand_promise: "Play like the 1%.",
    },
    content_signature: {
      recurring_visual_motifs: "Refraction streaks, hex grids, LED cores, motion trails",
      copywriting_style: "Punchy and provocative",
      content_energy: "High-energy",
    },
  },
  product_blueprint: {
    product_identity: {
      model_type: "Pro wireless controller",
      wear_application: "Competitive console and PC sessions",
    },
    blueprint: {
      product_identity: {
        category: "Esports controller",
        positioning: "Sub-1ms wireless that disappears in your hands",
        signature: "Marbled gold-strip grip plus LED status core",
      },
      buying_behavior: {
        trigger: "Social proof from streamers and ranked creators",
        decision_window: "1-2 weeks of comparison and review watching",
        friction: "Premium price versus mass-market pads, answered by a 2-year swap warranty",
      },
      category_tension: {
        default: "Cheap pads that drift after three months",
        whitespace: "Tournament reliability for non-pros",
        opportunity: "Own pro-grade for everyone before incumbents react",
      },
    },
  },
  audience: {
    personas: [
      {
        tier: "Primary",
        name: "The Ranked Climber",
        role: "19-26, semi-competitive console gamer chasing the next tier",
        gradient: "linear-gradient(135deg,#1E90FF,#6f3cf5)",
        jobs: ["Win more ranked matches", "Look pro on stream", "Upgrade gear without guesswork"],
        channels: ["TikTok", "Twitch", "YouTube Shorts"],
      },
      {
        tier: "Secondary",
        name: "The Gifting Parent",
        role: "38-50, buying a milestone gift for a teen gamer",
        gradient: "linear-gradient(135deg,#D4AF37,#ff7a64)",
        jobs: ["Pick a gift that impresses", "Trust the quality", "Avoid buyer remorse"],
        channels: ["Instagram", "Google Search", "Amazon"],
      },
    ],
  },
  visual_dna: {
    medium: "35mm editorial product photography",
    composition: "Dutch-angle hero with aggressive negative space",
    color_grading: "Dodger-blue and champion-gold, high contrast",
    lighting: "Hard rim light with neon practicals",
    texture_finish: "Smooth anodized metal, soft grain, refracted highlights",
    mood: "Confidence, urgency, precision",
    style_reference: "Cyberpunk product lab x editorial sports campaign",
    special_qualities: "Subtle scan lines, glass streaks, kinetic HUD markings",
  },
  social_plan: {
    platform_strategy: [
      { platform: "TikTok", role: "Reach and hype through clip-driven discovery" },
      { platform: "Twitch", role: "Proof through creator integrations and live demos" },
      { platform: "Instagram", role: "Brand memory, gifting, and premium hero shots" },
    ],
    content_pillars: [
      {
        name: "Clutch Moments",
        description: "Ranked highlights won on KoksPlay gear.",
        example_content: "POV ranked clutch with slow-motion input overlay.",
        visual_direction: "Motion blur, refraction streaks, electric captions.",
      },
      {
        name: "Engineered to Win",
        description: "Teardown and spec storytelling for skeptical buyers.",
        example_content: "Macro gold-strip grip plus latency test.",
        visual_direction: "Macro detail, hard rim light, lab-grade overlays.",
      },
      {
        name: "Creator Co-Sign",
        description: "Pros and streamers validating feel, grip, and latency.",
        example_content: "First-impression stream clip with hand cam.",
        visual_direction: "Neon practicals, candid creator desk setups.",
      },
      {
        name: "Gift Like a Pro",
        description: "Seasonal gifting angle for parents and partners.",
        example_content: "Premium unboxing as the ultimate gamer gift.",
        visual_direction: "Editorial packaging, warm gold highlights.",
      },
    ],
  },
  hooks: {
    hooks: [
      {
        id: "a",
        title: "Your controller is why you're hardstuck.",
        body: "Sub-1ms wireless that does exactly what your thumbs say. No drift. No excuses.",
        type: "Pattern interrupt",
        pair_with: "POV ranked clutch in slow motion",
        alienates: false,
        why: "It names the climber's pain and blames the gear, not the player.",
      },
      {
        id: "b",
        title: "Spec sheet you'll actually feel.",
        body: "Tournament-grade latency, anodized grip, 2-year swap warranty.",
        type: "Feature-led proof",
        pair_with: "Macro teardown and latency test",
        alienates: true,
        why: "It reads too corporate for the hype-driven primary persona.",
      },
      {
        id: "c",
        title: "The gift that gets you best-parent-ever status.",
        body: "The controller pros actually use, wrapped and ready.",
        type: "Relatability",
        pair_with: "Premium unboxing sequence",
        alienates: false,
        why: "It speaks to the gifting parent's need to impress and de-risk.",
      },
    ],
    negative_hooks: ["Generic BUY NOW discount copy cheapens a premium, pro-grade brand."],
  },
  ad_copy: { variants: adVariants },
  ad_creatives: [
    adPoster({
      eyebrow: "KOKSPLAY",
      headline: adVariants[0].headline,
      sub: adVariants[0].subheadline,
      cta: adVariants[0].cta,
      from: "#1E90FF",
      to: "#6f3cf5",
    }),
    adPoster({
      eyebrow: "PRO SPEC",
      headline: adVariants[1].headline,
      sub: adVariants[1].subheadline,
      cta: adVariants[1].cta,
      from: "#D4AF37",
      to: "#ff7a64",
    }),
  ],
  context_data: {
    materials: "Anodized aluminium, marbled polymer grip, LED core",
    pricing_tier: "Premium",
    region: "USA",
    channels: "DTC, Amazon, creator storefronts",
    category: "Esports controller",
    stage: "Scale",
  },
  flags: {
    brand_identity: false,
    product_blueprint: false,
    audience: false,
    visual_dna: false,
    social_plan: false,
    hooks: false,
    ad_copy: false,
  },
  blueprint: {
    product_identity: {
      category: "Esports controller",
      positioning: "Sub-1ms wireless that disappears in your hands",
      signature: "Marbled gold-strip grip plus LED status core",
    },
    buying_behavior: {
      trigger: "Social proof from streamers and ranked creators",
      decision_window: "1-2 weeks of comparison and review watching",
      friction: "Premium price versus mass-market pads, answered by a 2-year swap warranty",
    },
    category_tension: {
      default: "Cheap pads that drift after three months",
      whitespace: "Tournament reliability for non-pros",
      opportunity: "Own pro-grade for everyone before incumbents react",
    },
  },
  personas: [
    {
      tier: "Primary",
      name: "The Ranked Climber",
      role: "19-26, semi-competitive console gamer chasing the next tier",
      gradient: "linear-gradient(135deg,#1E90FF,#6f3cf5)",
      jobs: ["Win more ranked matches", "Look pro on stream", "Upgrade gear without guesswork"],
      channels: ["TikTok", "Twitch", "YouTube Shorts"],
    },
    {
      tier: "Secondary",
      name: "The Gifting Parent",
      role: "38-50, buying a milestone gift for a teen gamer",
      gradient: "linear-gradient(135deg,#D4AF37,#ff7a64)",
      jobs: ["Pick a gift that impresses", "Trust the quality", "Avoid buyer remorse"],
      channels: ["Instagram", "Google Search", "Amazon"],
    },
  ],
};

export const DEMO_BRANDS = [
  { session_id: "demo-koksplay", brand_name: "KoksPlay" },
  { session_id: "demo-zaytouna", brand_name: "Zaytouna" },
  { session_id: "demo-lumio", brand_name: "Lumio" },
];
