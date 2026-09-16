import { useEffect, useState } from "react";
import { ExternalLink, RotateCw } from "lucide-react";

import { LaunchKitApiError, launchKitApi, normalizePreviewUrl } from "@/app/launchkit-api";

/**
 * Fake browser chrome around the generated site.
 *
 * v0 demo hosts rotate; token query params often 404 in iframes. Always refresh
 * through the API before embedding or opening, then use the bare demo host.
 */
export function BrowserFramePreview({
  buildId,
  liveUrl,
}: {
  buildId: string;
  liveUrl?: string | null;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void launchKitApi
      .getBuildPreviewUrl(buildId)
      .then((url) => {
        if (controller.signal.aborted) return;
        setPreviewUrl(url);
      })
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setPreviewUrl(null);
        setError(
          cause instanceof LaunchKitApiError
            ? cause.message
            : "The live preview could not be loaded.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [buildId]);

  const openUrl = pickOpenUrl(liveUrl, previewUrl);
  const embedUrl = pickEmbedUrl(liveUrl, previewUrl);

  return (
    <div
      className="flex flex-col overflow-hidden w-full"
      style={{
        height: "clamp(220px, 34vw, 240px)",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <div
        className="flex items-center gap-[10px] px-[12px]"
        style={{
          height: 36,
          background: "#1a1a1a",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
        }}
      >
        {["#6fccdd", "#6fccdd", "#6fccdd"].map((c, i) => (
          <div
            key={i}
            className="rounded-full"
            style={{ width: 10, height: 10, background: c, opacity: 0.7 }}
          />
        ))}
        <div
          className="flex-1 flex items-center gap-[6px] px-[10px] rounded-[6px]"
          style={{ height: 22, background: "rgba(255,255,255,0.06)", marginLeft: 8 }}
        >
          <svg width="10" height="10" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M7 1L7 13M1 7h12"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <span
            className="text-[11px] font-medium truncate"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            {loading ? "Refreshing preview…" : openUrl ?? "Generated website"}
          </span>
        </div>
        <RotateCw size={14} color="rgba(255,255,255,0.3)" strokeWidth={1.3} aria-hidden="true" />
      </div>

      <div className="flex-1 flex flex-col relative" style={{ background: "#111" }}>
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title="Generated website preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            className="absolute inset-0 w-full h-full border-0"
            style={{ background: "white", zIndex: 2 }}
          />
        ) : (
          <div
            className="absolute inset-0 z-[2] flex flex-col items-center justify-center gap-[12px] px-[20px] text-center"
            style={{ background: "#0d0d0d" }}
          >
            {loading ? (
              <p className="font-medium text-[12px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                Loading live preview…
              </p>
            ) : (
              <>
                <p className="text-white font-semibold text-[14px]">
                  {error ? "Preview unavailable" : "Open live preview"}
                </p>
                <p
                  className="font-medium text-[12px]"
                  style={{ color: "rgba(255,255,255,0.45)", maxWidth: 280 }}
                >
                  {error ??
                    "Open the refreshed demo in a new tab to review the generated site."}
                </p>
                {openUrl && (
                  <button
                    type="button"
                    onClick={() => window.open(openUrl, "_blank", "noopener,noreferrer")}
                    className="inline-flex items-center gap-[8px] font-semibold text-[12px] uppercase px-[14px] py-[8px] rounded-[8px]"
                    style={{ background: "#6fccdd", color: "#0b0b0b" }}
                  >
                    <ExternalLink size={14} strokeWidth={2} aria-hidden="true" />
                    Open preview
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function pickOpenUrl(...candidates: Array<string | null | undefined>): string | null {
  for (const value of candidates) {
    const normalized = normalizePreviewUrl(value);
    if (normalized && isHttpsUrl(normalized) && !isV0ChatUrl(normalized)) return normalized;
  }
  return null;
}

function pickEmbedUrl(
  liveUrl: string | null | undefined,
  previewUrl: string | null | undefined,
): string | null {
  for (const value of [liveUrl, previewUrl]) {
    const normalized = normalizePreviewUrl(value);
    if (!normalized || !isHttpsUrl(normalized) || isV0ChatUrl(normalized)) continue;
    try {
      const host = new URL(normalized).hostname.toLowerCase();
      if (
        host.endsWith(".vercel.app") ||
        host === "vercel.app" ||
        host.endsWith(".vusercontent.net") ||
        host === "vusercontent.net"
      ) {
        return normalized;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isV0ChatUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.hostname === "v0.app" || url.hostname === "v0.dev") &&
      url.pathname.startsWith("/chat/")
    );
  } catch {
    return false;
  }
}
