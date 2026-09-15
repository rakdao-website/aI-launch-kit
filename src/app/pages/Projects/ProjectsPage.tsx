import { useState } from "react";
import { ScaledPage } from "@/app/components/common/ScaledPage";
import { Spinner } from "@/app/components/common/Spinner";
import { TopHeader } from "@/app/components/common/TopHeader";
import { launchKitApi, ProjectSummaryView } from "@/app/launchkit-api";

function formatProjectUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ProjectsPage({
  projects,
  loading,
  busy,
  onCreate,
  onOpen,
  onRefresh,
  onSignOut,
}: {
  projects: ProjectSummaryView[];
  loading: boolean;
  busy: boolean;
  onCreate: () => Promise<void>;
  onOpen: (projectId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  onSignOut: () => void;
}) {
  const [previewBusyId, setPreviewBusyId] = useState<string | null>(null);

  const openFreshPreview = async (item: ProjectSummaryView) => {
    if (!item.latestBuildId) {
      if (item.previewUrl) window.open(item.previewUrl, "_blank", "noopener,noreferrer");
      return;
    }
    setPreviewBusyId(item.id);
    try {
      const { url } = await launchKitApi.getBuildPreviewUrl(item.latestBuildId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      if (item.previewUrl) window.open(item.previewUrl, "_blank", "noopener,noreferrer");
    } finally {
      setPreviewBusyId(null);
    }
  };

  return (
    <ScaledPage scrollable header={<TopHeader onSignOut={onSignOut} />}>
      <div
        className="w-full min-h-full flex flex-col"
        style={{ background: "#0b0b0b", fontFamily: "'Montserrat', sans-serif" }}
      >
        <div className="flex-1 flex flex-col px-[clamp(16px,5vw,80px)] py-[clamp(24px,5vw,48px)] gap-[24px] max-w-[880px] mx-auto w-full">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-[16px]">
            <div className="flex flex-col gap-[8px]">
              <h1 className="text-white font-semibold" style={{ fontSize: "clamp(22px, 5vw, 28px)" }}>
                Your websites
              </h1>
              <p className="font-medium text-[14px]" style={{ color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
                Open a previous generation or create a new website.
              </p>
            </div>
            <div className="flex flex-wrap gap-[10px]">
              <button
                type="button"
                onClick={() => { void onRefresh(); }}
                disabled={busy || loading}
                className="font-semibold text-[13px] px-[14px] py-[10px] rounded-[8px] disabled:opacity-50"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.8)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={() => { void onCreate(); }}
                disabled={busy || loading}
                className="font-semibold text-[13px] px-[16px] py-[10px] rounded-[8px] disabled:opacity-50"
                style={{ background: "#6fccdd", color: "#0b0b0b" }}
              >
                {busy ? "Working…" : "Create new website"}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-[64px]">
              <Spinner size={40} borderWidth={3} />
            </div>
          ) : projects.length === 0 ? (
            <div
              className="rounded-[16px] px-[24px] py-[40px] text-center"
              style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}
            >
              <p className="text-white font-semibold text-[15px]">No websites yet</p>
              <p className="font-medium text-[13px] mt-[8px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                Create your first site to start the wizard.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-[12px]">
              {projects.map((item) => {
                const title = item.companyName.trim() || "Untitled website";
                const buildLabel = item.latestBuildStatus
                  ? `Build: ${item.latestBuildStatus}`
                  : "No build yet";
                return (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-[16px] p-[20px] rounded-[16px]"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <div className="flex-1 min-w-0 flex flex-col gap-[6px]">
                      <div className="text-white font-semibold text-[15px] truncate">{title}</div>
                      <div className="font-medium text-[12px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                        Project: {item.status} · {buildLabel} · Updated {formatProjectUpdatedAt(item.updatedAt)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-[8px] shrink-0">
                      {(item.previewUrl || item.latestBuildId) && item.latestBuildStatus === "completed" && (
                        <button
                          type="button"
                          onClick={() => { void openFreshPreview(item); }}
                          disabled={previewBusyId === item.id}
                          className="font-semibold text-[12px] px-[12px] py-[8px] rounded-[8px] disabled:opacity-50"
                          style={{
                            background: "rgba(111,204,221,0.12)",
                            color: "#6fccdd",
                            border: "1px solid rgba(111,204,221,0.25)",
                          }}
                        >
                          {previewBusyId === item.id ? "Opening…" : "Preview"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => { void onOpen(item.id); }}
                        disabled={busy}
                        className="font-semibold text-[12px] px-[14px] py-[8px] rounded-[8px] disabled:opacity-50"
                        style={{ background: "#6fccdd", color: "#0b0b0b" }}
                      >
                        Open
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </ScaledPage>
  );
}
