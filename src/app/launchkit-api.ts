export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000")
  .replace(/\/$/, "");

const API_ROOT = `${API_BASE_URL}/api/v1`;
const AUTH_TOKEN_KEY = "ailk_accessToken";

/** v0 token query params often 404 in browsers/iframes; bare demo hosts are stable. */
export function normalizePreviewUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    if (host === "vusercontent.net" || host.endsWith(".vusercontent.net")) {
      return `${url.protocol}//${url.host}/`;
    }
    return value;
  } catch {
    return null;
  }
}

export type AuthTokenView = {
  accessToken: string;
  tokenType: "bearer";
  expiresInSeconds: number;
};

export type AuthUserView = {
  cognitoUserId?: string | null;
  email?: string | null;
  phone?: string | null;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  role?: string | null;
  pool?: string | null;
  emailVerified?: boolean | null;
  phoneVerified?: boolean | null;
  createdAt?: string | null;
};

export type AuthMeView = {
  authenticated: boolean;
  user: AuthUserView | null;
  ownerId?: string | null;
  licenseNumber?: string | null;
  profile?: Record<string, unknown> | null;
};

export type Choice = { id: string; label: string; description: string };
export type PaletteChoice = {
  id: string;
  label: string;
  colors: { primary: string; secondary: string; background: string; text: string } | null;
};
export type FontChoice = {
  id: string;
  label: string;
  fonts: { heading: string; body: string } | null;
};
export type SectionCatalogItem = { id: string; label: string; locked: boolean };
export type PageCatalogItem = {
  id: string;
  label: string;
  slug: string;
  sectionTemplateIds: string[];
  selectedByDefault: boolean;
};
export type WizardCatalog = {
  businessCategories: Choice[];
  designMoods: Choice[];
  animationLevels: Choice[];
  themeModes: Choice[];
  palettes: PaletteChoice[];
  fontPairings: FontChoice[];
  pageTemplates: PageCatalogItem[];
  sectionTemplates: SectionCatalogItem[];
};

export type BusinessDraft = {
  companyName: string;
  industry: string;
  services: string[];
  uvp: string;
  targetAudience: string;
  notes: string;
  categoryId: string;
  /** Rich grounding fields (from PDF / AI Summary apply). */
  businessActivity?: string;
  activityCode?: string;
  description?: string;
  purpose?: string;
  competitors?: string;
  products?: string;
  locationHours?: string;
  serviceArea?: string;
  contact?: string;
  socials?: string;
  tone?: string;
  aesthetic?: string;
  stats?: string;
  testimonials?: string;
  teamBios?: string;
  certifications?: string;
};
export type DesignDraft = {
  tagline: string;
  cta: string;
  moodId: string;
  animationId: string;
  themeId: string;
  imageSource: string;
  paletteId: string;
  customPalette: { primary: string; secondary: string; background: string; text: string } | null;
  fontPairingId: string;
  customFonts: { heading: string; body: string } | null;
};
export type SectionDraft = {
  id: string;
  templateId: string;
  name: string;
  locked: boolean;
};
export type PageDraft = {
  id: string;
  templateId: string;
  name: string;
  slug: string;
  sections: SectionDraft[];
};
export type PageLayout = { pages: PageDraft[] };
export type AssetView = {
  id: string;
  kind: string;
  filename: string;
  label: string;
  contentType: string;
  size: number;
  previewUrl: string;
};
export type MockupView = {
  id: string;
  generation: number;
  ordinal: number;
  label: string;
  direction: string;
  previewUrl: string;
  createdAt: string;
};
export type ProjectView = {
  id: string;
  status: string;
  business: BusinessDraft;
  design: DesignDraft;
  pageLayout: PageLayout;
  extractedProfileFields: Record<string, string>;
  uploadedAssets: AssetView[];
  mockups: MockupView[];
  selectedMockupId: string | null;
  latestBuildId: string | null;
  latestDeploymentId: string | null;
  createdAt: string;
  updatedAt: string;
};
export type OperationView = {
  id: string;
  projectId: string | null;
  kind: string;
  status: "queued" | "running" | "completed" | "failed";
  result: Record<string, unknown>;
  errorCode: string | null;
  errorMessage: string | null;
};
export type BuildView = {
  id: string;
  projectId: string;
  provider: string;
  status: "queued" | "submitting" | "running" | "processing_result" | "completed" | "failed" | "cancelled" | "timed_out";
  stage: string;
  message: string;
  warnings: string[];
  previewUrl: string | null;
  webUrl: string | null;
  downloadUrl: string | null;
  retryAfterSeconds: number | null;
};
export type BuildPreviewView = {
  url: string;
};
export type ProjectSummaryView = {
  id: string;
  status: string;
  companyName: string;
  latestBuildId: string | null;
  latestBuildStatus: BuildView["status"] | null;
  previewUrl: string | null;
  downloadUrl: string | null;
  createdAt: string;
  updatedAt: string;
};
export type BuildEventView = {
  id: number;
  status: BuildView["status"];
  stage: string;
  message: string;
  createdAt: string;
};
export type DeploymentView = {
  id: string;
  buildId: string;
  status: "queued" | "creating" | "building" | "ready_to_claim" | "completed" | "failed" | "cancelled";
  liveUrl: string | null;
  claimUrl: string | null;
  claimExpiresAt: string | null;
  message: string;
  retryAfterSeconds: number | null;
};

type ApiErrorEnvelope = {
  error?: { code?: string; message?: string; requestId?: string };
};

export class LaunchKitApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code = "request_failed",
    readonly requestId?: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const accessToken = localStorage.getItem(AUTH_TOKEN_KEY);
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${API_ROOT}${path}`, {
    ...init,
    headers,
    // Send the httpOnly lk_api_token cookie as a fallback to Bearer localStorage.
    credentials: "include",
  });
  if (!response.ok) {
    let envelope: ApiErrorEnvelope = {};
    try {
      envelope = await response.json() as ApiErrorEnvelope;
    } catch {
      // The public fallback deliberately omits raw response content.
    }
    throw new LaunchKitApiError(
      envelope.error?.message ?? "The request could not be completed.",
      response.status,
      envelope.error?.code,
      envelope.error?.requestId,
    );
  }
  return await response.json() as T;
}

async function requestText(path: string, signal?: AbortSignal): Promise<string> {
  const url = absoluteApiUrl(path);
  if (!url) {
    throw new LaunchKitApiError("The requested asset URL is missing.", 400, "asset_url_missing");
  }
  const headers = new Headers();
  const accessToken = localStorage.getItem(AUTH_TOKEN_KEY);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(url, { headers, signal, cache: "no-store" });
  if (!response.ok) {
    throw new LaunchKitApiError(
      "The protected preview could not be loaded.",
      response.status,
      "asset_load_failed",
    );
  }
  return await response.text();
}

export function absoluteApiUrl(path: string | null): string | null {
  if (!path) return null;
  return /^https?:\/\//.test(path) ? path : `${API_BASE_URL}${path}`;
}

export function createIdempotencyKey(scope: string): string {
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return `${scope}-${id}`;
}

export function hasAccessToken(): boolean {
  return Boolean(localStorage.getItem(AUTH_TOKEN_KEY));
}

export function setAccessToken(accessToken: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
}

export function clearAccessToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

// ─── InnovationCity OAuth (PKCE handled server-side) ─────────────────────────
// The backend redirects to the IC-hosted login, exchanges the code, and returns
// to the frontend with ?auth=success plus an httpOnly API-token cookie.

export function beginInnovationCityLogin(): void {
  window.location.href = `${API_BASE_URL}/auth/login`;
}

export async function fetchInnovationCityApiToken(): Promise<AuthTokenView> {
  const response = await fetch(`${API_BASE_URL}/auth/token`, { credentials: "include" });
  if (!response.ok) {
    throw new LaunchKitApiError(
      "The Innovation City session could not be confirmed. Sign in again.",
      response.status,
      "ic_session_missing",
    );
  }
  return await response.json() as AuthTokenView;
}

/** IC /auth/me profile (cookie session). Useful for debugging owner/license matching. */
export async function fetchInnovationCityMe(): Promise<AuthMeView> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, { credentials: "include" });
  if (!response.ok) {
    throw new LaunchKitApiError(
      "The Innovation City profile could not be loaded.",
      response.status,
      "ic_profile_missing",
    );
  }
  return await response.json() as AuthMeView;
}

/** Decode Launch Kit API JWT claims without verifying (client-side debug only). */
export function readAccessTokenClaims(
  accessToken: string | null = localStorage.getItem(AUTH_TOKEN_KEY),
): Record<string, unknown> | null {
  if (!accessToken) return null;
  try {
    const payload = accessToken.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function innovationCityLogout(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, { method: "POST", credentials: "include" });
  } catch {
    // Local sign-out proceeds even if the backend session is already gone.
  }
}

export const launchKitApi = {
  requestAccessCode: (email: string) =>
    request<{ status: string }>("/auth/request-code", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  verifyAccessCode: (email: string, code: string) =>
    request<AuthTokenView>("/auth/verify", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    }),
  getCatalog: () => request<WizardCatalog>("/catalogs/wizard"),
  createProject: () => request<ProjectView>("/projects", { method: "POST", body: "{}" }),
  listProjects: () => request<ProjectSummaryView[]>("/projects"),
  getProject: (projectId: string) => request<ProjectView>(`/projects/${projectId}`),
  patchProject: (projectId: string, patch: Record<string, unknown>) =>
    request<ProjectView>(`/projects/${projectId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  uploadProfile: (projectId: string, file: File) => {
    const body = new FormData();
    body.append("profile", file);
    return request<OperationView>(`/projects/${projectId}/profile-extractions`, {
      method: "POST",
      body,
    });
  },
  extractFromAsset: (projectId: string, assetId: string) =>
    request<OperationView>(`/projects/${projectId}/profile-extractions/from-asset`, {
      method: "POST",
      body: JSON.stringify({ assetId }),
    }),
  extractFromWebsite: (projectId: string, url?: string | null) =>
    request<OperationView>(`/projects/${projectId}/website-extractions`, {
      method: "POST",
      body: JSON.stringify({ url: url?.trim() ? url.trim() : null }),
    }),
  uploadAsset: (projectId: string, file: File, kind: "logo" | "document") => {
    const body = new FormData();
    body.append("file", file);
    body.append("kind", kind);
    return request<AssetView>(`/projects/${projectId}/assets`, {
      method: "POST",
      body,
    });
  },
  deleteAsset: async (projectId: string, assetId: string): Promise<void> => {
    const headers = new Headers();
    const accessToken = localStorage.getItem(AUTH_TOKEN_KEY);
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    const response = await fetch(`${API_ROOT}/projects/${projectId}/assets/${assetId}`, {
      method: "DELETE",
      headers,
      credentials: "include",
    });
    if (!response.ok) {
      let envelope: ApiErrorEnvelope = {};
      try {
        envelope = await response.json() as ApiErrorEnvelope;
      } catch {
        // Status-based message below.
      }
      throw new LaunchKitApiError(
        envelope.error?.message ?? "The asset could not be removed.",
        response.status,
        envelope.error?.code,
        envelope.error?.requestId,
      );
    }
  },
  getOperation: (operationId: string) => request<OperationView>(`/operations/${operationId}`),
  createMockups: (projectId: string, idempotencyKey: string) =>
    request<OperationView>(`/projects/${projectId}/mockups`, {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: "{}",
    }),
  getMockups: (projectId: string) =>
    request<MockupView[]>(`/projects/${projectId}/mockups`),
  getAssetContent: (path: string, signal?: AbortSignal) => requestText(path, signal),
  selectMockup: (projectId: string, mockupId: string) =>
    request<MockupView>(`/projects/${projectId}/selected-mockup`, {
      method: "PUT",
      body: JSON.stringify({ mockupId }),
    }),
  createBuild: (projectId: string, idempotencyKey: string) =>
    request<BuildView>(`/projects/${projectId}/builds`, {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: "{}",
    }),
  getBuild: (buildId: string) => request<BuildView>(`/builds/${buildId}`),
  getBuildPreviewUrl: async (buildId: string): Promise<string> => {
    const preview = await request<BuildPreviewView>(`/builds/${buildId}/preview`);
    if (!preview.url) {
      throw new LaunchKitApiError(
        "The website preview URL is missing.",
        502,
        "preview_url_missing",
      );
    }
    return normalizePreviewUrl(preview.url) ?? preview.url;
  },
  downloadBuild: async (downloadPath: string): Promise<void> => {
    const url = absoluteApiUrl(downloadPath);
    if (!url) {
      throw new LaunchKitApiError("The download URL is missing.", 400, "download_url_missing");
    }
    const headers = new Headers();
    const accessToken = localStorage.getItem(AUTH_TOKEN_KEY);
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    const response = await fetch(url, { headers, cache: "no-store" });
    if (!response.ok) {
      let envelope: ApiErrorEnvelope = {};
      try {
        envelope = await response.json() as ApiErrorEnvelope;
      } catch {
        // Fall through to the status-based message.
      }
      throw new LaunchKitApiError(
        envelope.error?.message ?? "The build archive could not be downloaded.",
        response.status,
        envelope.error?.code,
        envelope.error?.requestId,
      );
    }
    const disposition = response.headers.get("Content-Disposition") ?? "";
    const filenameMatch = /filename="?([^";]+)"?/i.exec(disposition);
    const filename = filenameMatch?.[1]?.trim() || "website.zip";
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  },
  createDeployment: (buildId: string, idempotencyKey: string) =>
    request<DeploymentView>(`/builds/${buildId}/deployments`, {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: "{}",
    }),
  getDeployment: (deploymentId: string) =>
    request<DeploymentView>(`/deployments/${deploymentId}`),
};

/** Statuses that mean a build is still in flight. Also drives the UI's resume logic. */
export const ACTIVE_BUILD_STATUSES = new Set<BuildView["status"]>([
  "queued",
  "submitting",
  "running",
  "processing_result",
]);

async function streamBuildEvents(
  buildId: string,
  afterEventId: number,
  onEvent: (event: BuildEventView) => void,
  signal: AbortSignal,
): Promise<number> {
  const headers = new Headers({ Accept: "text/event-stream" });
  const accessToken = localStorage.getItem(AUTH_TOKEN_KEY);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (afterEventId > 0) headers.set("Last-Event-ID", String(afterEventId));

  const response = await fetch(`${API_ROOT}/builds/${buildId}/events`, {
    headers,
    signal,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new LaunchKitApiError(
      "The build event stream could not be opened.",
      response.status,
      "event_stream_failed",
    );
  }
  if (!response.body) {
    throw new LaunchKitApiError(
      "The build event stream is unavailable.",
      503,
      "event_stream_unavailable",
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let lastEventId = afterEventId;

  const consumeBlock = (block: string) => {
    let eventType = "message";
    let eventId = lastEventId;
    const data: string[] = [];
    for (const line of block.split(/\r?\n/)) {
      if (!line || line.startsWith(":")) continue;
      const separator = line.indexOf(":");
      const field = separator === -1 ? line : line.slice(0, separator);
      const value = separator === -1 ? "" : line.slice(separator + 1).replace(/^ /, "");
      if (field === "event") eventType = value;
      if (field === "id") eventId = Number.parseInt(value, 10) || eventId;
      if (field === "data") data.push(value);
    }
    if (eventType !== "status" || data.length === 0) return;
    const event = JSON.parse(data.join("\n")) as BuildEventView;
    lastEventId = Math.max(eventId, event.id);
    onEvent(event);
  };

  while (!signal.aborted) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() ?? "";
    for (const block of blocks) consumeBlock(block);
    if (done) break;
  }
  if (buffer.trim()) consumeBlock(buffer);
  return lastEventId;
}

function waitForReconnect(delayMilliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(resolve, delayMilliseconds);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

export async function watchBuild(
  initialBuild: BuildView,
  onUpdate: (build: BuildView) => void,
  signal: AbortSignal,
): Promise<BuildView> {
  let current = initialBuild;
  let lastEventId = 0;

  while (!signal.aborted && ACTIVE_BUILD_STATUSES.has(current.status)) {
    try {
      lastEventId = await streamBuildEvents(
        current.id,
        lastEventId,
        (event) => {
          current = {
            ...current,
            status: event.status,
            stage: event.stage,
            message: event.message,
          };
          onUpdate(current);
        },
        signal,
      );
    } catch (cause) {
      if (signal.aborted) return current;
      if (cause instanceof LaunchKitApiError && cause.status === 401) throw cause;
    }
    if (signal.aborted) return current;

    try {
      current = await launchKitApi.getBuild(current.id);
      onUpdate(current);
    } catch (cause) {
      if (cause instanceof LaunchKitApiError && cause.status === 401) throw cause;
    }
    if (ACTIVE_BUILD_STATUSES.has(current.status)) {
      await waitForReconnect((current.retryAfterSeconds ?? 5) * 1000, signal);
    }
  }
  return current;
}

export async function waitForOperation(
  operationId: string,
  onUpdate: (operation: OperationView) => void,
): Promise<OperationView> {
  for (;;) {
    const operation = await launchKitApi.getOperation(operationId);
    onUpdate(operation);
    if (operation.status === "completed") return operation;
    if (operation.status === "failed") {
      throw new LaunchKitApiError(
        operation.errorMessage ?? "The background operation failed.",
        409,
        operation.errorCode ?? "operation_failed",
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

export async function waitForDeployment(
  deploymentId: string,
  onUpdate: (deployment: DeploymentView) => void,
): Promise<DeploymentView> {
  for (;;) {
    const deployment = await launchKitApi.getDeployment(deploymentId);
    onUpdate(deployment);
    if (["ready_to_claim", "completed"].includes(deployment.status)) return deployment;
    if (["failed", "cancelled"].includes(deployment.status)) {
      throw new LaunchKitApiError(deployment.message, 409, "deployment_failed");
    }
    await new Promise((resolve) =>
      setTimeout(resolve, (deployment.retryAfterSeconds ?? 2) * 1000),
    );
  }
}
