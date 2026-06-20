/**
 * SCOPE Studio — API Client
 * Centralized fetch layer for communicating with the FastAPI backend.
 */

import { streamPost, type SSEvent } from "./sse";

const API_BASE = "http://localhost:8000";

// --- Auth token helpers ---

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("scope_token");
}

function setToken(token: string) {
  localStorage.setItem("scope_token", token);
}

function clearToken() {
  localStorage.removeItem("scope_token");
  localStorage.removeItem("scope_user");
}

function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

// --- Types ---

export type AuthUser = {
  id: number | string;
  email: string;
  name: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type BrandNode = {
  type: string;
  title: string;
  content: string;
};

export type ChatMode = "free" | "guided";

export type ChatSuggestion = {
  label: string;
  prompt: string;
  rationale: string;
};

export type ProposedPalette = {
  name: string;
  colors: string[];
  mood: string;
  usage_note: string;
  recommended: boolean;
};

export type VisualIdentity = {
  palettes?: { name: string; colors: string[]; mood?: string; usage_note?: string }[];
  font_pairings?: { display: string; body: string; mood?: string; rationale?: string }[];
  logo_concepts?: { name: string; desc?: string; description?: string; icon?: string }[];
};

export type ChatHistoryItem = {
  id: string;
  role: string;
  text: string;
  at: number;
};

export type ChatResponse = {
  response: string;
  mode: ChatMode;
  suggestions: ChatSuggestion[];
  nodes: BrandNode[];
  proposed_palettes: ProposedPalette[];
};

export type MarketingBlueprint = {
  product_identity: { category: string; positioning: string; signature: string };
  buying_behavior: { trigger: string; decision_window: string; friction: string };
  category_tension: { default: string; whitespace: string; opportunity: string };
};

export type MarketingPersona = {
  tier: string;
  name: string;
  role: string;
  gradient: string;
  jobs: string[];
  channels: string[];
};

export type MarketingHook = {
  id: string;
  title: string;
  body: string;
  alienates: boolean;
  why: string;
  type?: string;
  pair_with?: string;
};

export type MarketingResult = {
  blueprint: MarketingBlueprint;
  personas: MarketingPersona[];
  hooks: MarketingHook[];
};

// --- Marketing Engine + Ideas Factory (Refraction Engine) ---

export type AdVariant = {
  label: string;
  headline: string;
  subheadline: string;
  body: string;
  cta: string;
  caption: string;
  copy_logic: { audience_trigger: string; tone_alignment: string; ab_hypothesis: string };
  image_prompt: string;
};

export type SocialPillar = {
  name: string;
  description: string;
  example_content: string;
  visual_direction: string;
};

export type MarketingEngine = {
  brand_identity: Record<string, unknown>;
  product_blueprint: Record<string, unknown>;
  audience: Record<string, unknown>;
  visual_dna: Record<string, unknown>;
  social_plan: Record<string, unknown>;
  hooks: { hooks?: MarketingHook[]; negative_hooks?: string[] };
  ad_copy: { variants?: AdVariant[] };
  ad_creatives: string[];
  context_data: Record<string, string>;
  flags: Record<string, boolean>;
  // Legacy convenience for the dashboard cards.
  blueprint: MarketingBlueprint;
  personas: MarketingPersona[];
};

export type MarketingStandards = {
  audience: string;
  positioning: string;
  value_proposition: string;
  reasons_to_believe: string[];
  recommended_channels: string[];
  compliance_cultural_notes: string[];
  competitive_context: string;
};

export type LogoResult = {
  concept_description: string;
  tagline: string;
  variations: { name: string; description: string }[];
  generated_image?: string;
  generated_images?: string[];
  settings?: Record<string, string>;
};

export type LogoHistoryItem = LogoResult & {
  id: number;
  settings: Record<string, string>;
  created_at: string | null;
};

export type MockupType = "business_card" | "signage" | "packaging" | "social_apparel";

export type MockupResult = {
  mockup_types: string[];
  source_logo?: string | null;
  generated_images?: string[];
  settings?: Record<string, string>;
};

export type MockupHistoryItem = MockupResult & {
  id: number;
  created_at: string | null;
};

export type HistoryVersion = {
  version: number;
  is_active: boolean;
  timestamp: string | null;
  brand_name: string;
  nodes: BrandNode[];
};

export type BriefResult = {
  brand_name: string;
  brand_name_ar?: string;
  brand_name_en?: string;
  language?: "ar" | "en";
  industry: string;
  one_line_concept?: string;
  summary: string;
  market_lens?: string;
  region: "usa" | "mena" | "gcc";
  pillars: {
    mission: string;
    vision: string;
    persona: string;
    values: string;
    voice: string;
    promise: string;
  };
  marketing_standards: MarketingStandards;
  visual_direction?: string[];
  visual_cues: string[];
  competitive_signals: string[];
  recommended_next: string;
  moodboard_images?: string[];
};

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let detail = `API error ${res.status}`;
    try {
      const parsed = JSON.parse(body);
      if (parsed.detail) detail = parsed.detail;
    } catch {
      if (body) detail = body;
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // --- Auth ---

  /** Sign up a new user */
  signup: async (name: string, email: string, password: string): Promise<AuthResponse> => {
    const res = await fetch(`${API_BASE}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await handleResponse<AuthResponse>(res);
    setToken(data.token);
    localStorage.setItem("scope_user", JSON.stringify(data.user));
    return data;
  },

  /** Sign in an existing user */
  signin: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await fetch(`${API_BASE}/api/auth/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse<AuthResponse>(res);
    setToken(data.token);
    localStorage.setItem("scope_user", JSON.stringify(data.user));
    return data;
  },

  /** Get current user profile from token */
  me: async (): Promise<AuthUser> => {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse<AuthUser>(res);
  },

  /** Log out (clear stored credentials) */
  logout: () => {
    clearToken();
  },

  /** Check if user is authenticated (client-side check) */
  isAuthenticated: (): boolean => !!getToken(),

  /** Get stored user from localStorage */
  getStoredUser: (): AuthUser | null => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("scope_user");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },

  // --- Core API ---

  /** Health check */
  health: () => fetch(`${API_BASE}/api/health`).then((r) => handleResponse<{ status: string }>(r)),

  /** Send a chat message and get AI response + updated nodes */
  chat: (
    messages: { role: string; content: string }[],
    sessionId: string,
    options?: {
      mode?: ChatMode;
      focus_node_type?: string | null;
      focus_node_title?: string | null;
      focus_node_value?: string | null;
    },
  ) =>
    fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({
        messages,
        session_id: sessionId,
        mode: options?.mode ?? "guided",
        focus_node_type: options?.focus_node_type ?? null,
        focus_node_title: options?.focus_node_title ?? null,
        focus_node_value: options?.focus_node_value ?? null,
      }),
    }).then((r) => handleResponse<ChatResponse>(r)),

  /** Get active brand nodes for a session */
  getNodes: (sessionId: string) =>
    fetch(`${API_BASE}/api/nodes/${sessionId}`, {
      headers: { ...getAuthHeaders() },
    }).then((r) => handleResponse<BrandNode[]>(r)),

  /** Get version history for a session */
  getHistory: (sessionId: string) =>
    fetch(`${API_BASE}/api/history/${sessionId}`, {
      headers: { ...getAuthHeaders() },
    }).then((r) => handleResponse<HistoryVersion[]>(r)),

  /** Restore a specific version */
  restoreVersion: (sessionId: string, version: number) =>
    fetch(`${API_BASE}/api/restore/${sessionId}/${version}`, {
      method: "POST",
      headers: { ...getAuthHeaders() },
    }).then((r) => handleResponse<BrandNode[]>(r)),

  /** Get the full marketing engine state for a session */
  getMarketing: (sessionId: string) =>
    fetch(`${API_BASE}/api/marketing/${sessionId}`, {
      headers: { ...getAuthHeaders() },
    }).then((r) => handleResponse<MarketingEngine | null>(r)),

  /** Save a user edit to one engine step (marks downstream steps stale) */
  putMarketingStep: (sessionId: string, name: string, data: Record<string, unknown>) =>
    fetch(`${API_BASE}/api/marketing/${sessionId}/step/${name}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ data }),
    }).then((r) => handleResponse<{ status: string; flags: Record<string, boolean> }>(r)),

  // --- Streaming step runners (Centrifuge SSE) ---

  /** Steps 1→2→3: brand identity + product blueprint + audience (multipart) */
  streamMarketingAnalyze: (form: FormData, onEvent: (e: SSEvent) => void) =>
    streamPost("/api/marketing/analyze", form, onEvent),

  /** Step 4: Visual DNA from moodboard images (multipart) */
  streamVisualDna: (form: FormData, onEvent: (e: SSEvent) => void) =>
    streamPost("/api/marketing/ideas/visual-dna", form, onEvent),

  /** Step 5: Social Media Plan */
  streamSocialPlan: (
    body: {
      session_id: string;
      reference_session_id?: string;
      timeframe?: string;
      platforms?: string;
      content_mix?: string;
    },
    onEvent: (e: SSEvent) => void,
  ) => streamPost("/api/marketing/ideas/social-plan", body, onEvent),

  /** Step 6: Hook Generator */
  streamHooks: (
    body: {
      session_id: string;
      reference_session_id?: string;
      platform?: string;
      hook_type?: string;
      quantity?: number;
    },
    onEvent: (e: SSEvent) => void,
  ) => streamPost("/api/marketing/ideas/hooks", body, onEvent),

  /** Step 7: Ad Copy A/B + creatives */
  streamAdCopy: (
    body: {
      session_id: string;
      reference_session_id?: string;
      selected_hook_ids?: string[];
      objective?: string;
      format?: string;
      language?: string;
      variants?: number;
    },
    onEvent: (e: SSEvent) => void,
  ) => streamPost("/api/marketing/ideas/ad-copy", body, onEvent),

  /** Generate logo concept */
  generateLogo: (data: {
    session_id: string;
    wordmark?: string;
    concept?: string;
    concepts?: { name: string; desc: string }[];
    palette_name?: string;
    font_name?: string;
    brand_context?: string;
    reference_images?: string[];
  }) =>
    fetch(`${API_BASE}/api/logo/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(data),
    }).then((r) => handleResponse<LogoResult>(r)),

  /** Generate brand mockups from the latest logo + brand references */
  generateMockups: (data: {
    session_id: string;
    logo_image?: string;
    mockup_types?: string[];
    brand_context?: string;
    reference_images?: string[];
  }) =>
    fetch(`${API_BASE}/api/mockup/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(data),
    }).then((r) => handleResponse<MockupResult>(r)),

  /** Get the latest mockup result for a session */
  getMockup: (sessionId: string) =>
    fetch(`${API_BASE}/api/mockup/${sessionId}`, {
      headers: { ...getAuthHeaders() },
    }).then((r) => handleResponse<MockupResult | null>(r)),

  /** Get all mockup generation results for a session (gallery history) */
  getAllMockups: (sessionId: string) =>
    fetch(`${API_BASE}/api/mockup/${sessionId}/all`, {
      headers: { ...getAuthHeaders() },
    }).then((r) => handleResponse<MockupHistoryItem[]>(r)),

  /** Get existing logo result for a session */
  getLogo: (sessionId: string) =>
    fetch(`${API_BASE}/api/logo/${sessionId}`, {
      headers: { ...getAuthHeaders() },
    }).then((r) => handleResponse<LogoResult | null>(r)),

  /** Get all logo generation results for a session (gallery history) */
  getAllLogos: (sessionId: string) =>
    fetch(`${API_BASE}/api/logo/${sessionId}/all`, {
      headers: { ...getAuthHeaders() },
    }).then((r) => handleResponse<LogoHistoryItem[]>(r)),

  /** Analyze a brief with text + multiple images (multipart upload) */
  analyzeBrief: (formData: FormData) =>
    fetch(`${API_BASE}/api/brief/analyze`, {
      method: "POST",
      headers: { ...getAuthHeaders() },
      body: formData,
    }).then((r) => handleResponse<BriefResult>(r)),

  /** Generate (or regenerate) moodboard reference images for a brief */
  generateMoodboard: (
    sessionId: string,
    opts?: { visualDirection?: string[]; count?: number; files?: File[] },
  ) => {
    const fd = new FormData();
    fd.append("session_id", sessionId);
    fd.append("count", String(opts?.count ?? 4));
    fd.append("visual_direction", JSON.stringify(opts?.visualDirection ?? []));
    (opts?.files ?? []).forEach((f) => fd.append("images", f));
    return fetch(`${API_BASE}/api/brief/moodboard`, {
      method: "POST",
      headers: { ...getAuthHeaders() },
      body: fd,
    }).then((r) => handleResponse<{ images: string[]; visual_direction: string[] }>(r));
  },

  /** Get full brief details and status */
  getBrief: (sessionId: string) =>
    fetch(`${API_BASE}/api/brief/${sessionId}`, {
      headers: { ...getAuthHeaders() },
    }).then((r) =>
      handleResponse<BriefResult & { approved: boolean; strategy_confirmed: boolean }>(r),
    ),

  /** Approve the brief to initialize the canvas */
  approveBrief: (sessionId: string) =>
    fetch(`${API_BASE}/api/brief/approve/${sessionId}`, {
      method: "POST",
      headers: { ...getAuthHeaders() },
    }).then((r) => handleResponse<{ status: string }>(r)),

  /** Confirm the canvas strategy to unlock next steps */
  confirmStrategy: (sessionId: string) =>
    fetch(`${API_BASE}/api/brief/confirm-strategy/${sessionId}`, {
      method: "POST",
      headers: { ...getAuthHeaders() },
    }).then((r) => handleResponse<{ status: string }>(r)),

  /** Get user's saved briefs */
  getMyBriefs: () =>
    fetch(`${API_BASE}/api/briefs`, {
      headers: { ...getAuthHeaders() },
    }).then((r) => handleResponse<BriefResult[]>(r)),

  /** Get minimal preview data for BrandIdentityGate (brand name, visual cues, node summaries) */
  identityPreview: (sessionId: string) =>
    fetch(`${API_BASE}/api/brief/identity-preview/${sessionId}`, {
      headers: { ...getAuthHeaders() },
    }).then((r) =>
      handleResponse<{
        brand_name: string;
        visual_cues: string[];
        visual_direction: string[];
        nodes_summary: { type: string; title: string; content: string }[];
        strategy_confirmed: boolean;
        visual_identity?: VisualIdentity;
      }>(r),
    ),

  /** Get historical chat messages for a session */
  getChatHistory: (sessionId: string) =>
    fetch(`${API_BASE}/api/chat/history/${sessionId}`, {
      headers: { ...getAuthHeaders() },
    }).then((r) => handleResponse<ChatHistoryItem[]>(r)),
};
