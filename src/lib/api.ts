/**
 * SCOPE Studio — API Client
 * Centralized fetch layer for communicating with the FastAPI backend.
 */

const API_BASE = "http://localhost:8000";

export type BrandNode = {
  type: string;
  title: string;
  content: string;
};

export type ChatResponse = {
  response: string;
  nodes: BrandNode[];
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
};

export type MarketingResult = {
  blueprint: MarketingBlueprint;
  personas: MarketingPersona[];
  hooks: MarketingHook[];
};

export type LogoResult = {
  concept_description: string;
  tagline: string;
  variations: { name: string; description: string }[];
};

export type HistoryVersion = {
  version: number;
  is_active: boolean;
  timestamp: string | null;
  brand_name: string;
  nodes: BrandNode[];
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
  /** Health check */
  health: () =>
    fetch(`${API_BASE}/api/health`).then((r) => handleResponse<{ status: string }>(r)),

  /** Send a chat message and get AI response + updated nodes */
  chat: (messages: { role: string; content: string }[], sessionId: string) =>
    fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, session_id: sessionId }),
    }).then((r) => handleResponse<ChatResponse>(r)),

  /** Get active brand nodes for a session */
  getNodes: (sessionId: string) =>
    fetch(`${API_BASE}/api/nodes/${sessionId}`).then((r) =>
      handleResponse<BrandNode[]>(r),
    ),

  /** Get version history for a session */
  getHistory: (sessionId: string) =>
    fetch(`${API_BASE}/api/history/${sessionId}`).then((r) =>
      handleResponse<HistoryVersion[]>(r),
    ),

  /** Restore a specific version */
  restoreVersion: (sessionId: string, version: number) =>
    fetch(`${API_BASE}/api/restore/${sessionId}/${version}`, {
      method: "POST",
    }).then((r) => handleResponse<BrandNode[]>(r)),

  /** Run marketing analysis */
  analyzeMarketing: (data: {
    session_id: string;
    materials?: string;
    pricing_tier?: string;
    region?: string;
    channels?: string;
    category?: string;
    stage?: string;
  }) =>
    fetch(`${API_BASE}/api/marketing/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => handleResponse<MarketingResult>(r)),

  /** Get existing marketing result for a session */
  getMarketing: (sessionId: string) =>
    fetch(`${API_BASE}/api/marketing/${sessionId}`).then((r) =>
      handleResponse<MarketingResult | null>(r),
    ),

  /** Generate logo concept */
  generateLogo: (data: {
    session_id: string;
    wordmark?: string;
    concept?: string;
    palette_name?: string;
    font_name?: string;
    brand_context?: string;
  }) =>
    fetch(`${API_BASE}/api/logo/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => handleResponse<LogoResult>(r)),

  /** Get existing logo result for a session */
  getLogo: (sessionId: string) =>
    fetch(`${API_BASE}/api/logo/${sessionId}`).then((r) =>
      handleResponse<LogoResult | null>(r),
    ),
};
