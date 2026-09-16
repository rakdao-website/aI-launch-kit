import { useState } from "react";
import { Check, Download, ExternalLink, Globe } from "lucide-react";

import { ScaledPage } from "@/app/components/common/ScaledPage";
import { TopHeader } from "@/app/components/common/TopHeader";
import { absoluteApiUrl, BuildView, DeploymentView, launchKitApi, LaunchKitApiError } from "@/app/launchkit-api";
import { BrowserFramePreview } from "./components/BrowserFramePreview";
import { DeployTooltip } from "./components/DeployTooltip";

export function DownloadPage({
  build,
  deployment,
  onDeploy: _onDeploy,
  onBack: _onBack,
  busy,
  onSignOut,
  onHome,
}: {
  build: BuildView;
  deployment: DeploymentView | null;
  onDeploy: () => Promise<void>;
  onBack: () => void;
  busy: boolean;
  onSignOut?: () => void;
  onHome?: () => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [deployPhaseMessage, setDeployPhaseMessage] = useState<string | null>(null);
  const [openingPreview, setOpeningPreview] = useState(false);

  const handleOpenPreview = async () => {
    if (openingPreview) return;
    setOpeningPreview(true);
    try {
      const live = absoluteApiUrl(deployment?.liveUrl ?? null);
      const url = live ?? (await launchKitApi.getBuildPreviewUrl(build.id));
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setDownloadError(
        error instanceof LaunchKitApiError
          ? error.message
          : "The live preview could not be opened.",
      );
    } finally {
      setOpeningPreview(false);
    }
  };

  const handleDownload = async () => {
    if (!build.downloadUrl || downloading) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      await launchKitApi.downloadBuild(build.downloadUrl);
    } catch (error) {
      setDownloadError(
        error instanceof LaunchKitApiError
          ? error.message
          : "The build archive could not be downloaded.",
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <ScaledPage scrollable header={<TopHeader onSignOut={onSignOut} onLogoClick={onHome} />}>
      <div
        className="w-full min-h-full flex flex-col"
        style={{ background: "#0b0b0b", fontFamily: "'Montserrat', sans-serif" }}
      >
        <div className="flex-1 flex flex-col items-center px-[clamp(16px,5vw,80px)] py-[clamp(24px,5vw,48px)] gap-[clamp(16px,4vw,32px)]">
          {/* Success state */}
          <div className="flex flex-col items-center gap-[16px] w-full text-center">
            <div
              className="flex items-center justify-center rounded-full"
              style={{ width: 56, height: 56, background: "#6fccdd" }}
            >
              <Check size={24} color="white" strokeWidth={2.5} aria-hidden="true" />
            </div>
            <h2 className="text-white font-semibold px-2" style={{ fontSize: "clamp(19px, 5vw, 24px)" }}>Your website is ready!</h2>
            <p className="px-2 max-w-[420px]" style={{ color: "rgba(255,255,255,0.5)", fontSize: "clamp(13px, 3.5vw, 14px)", fontWeight: 500, lineHeight: 1.6 }}>
              Your AI-generated website is complete and ready to deploy.
            </p>
          </div>

          {/* Website Preview */}
          <div className="flex flex-col gap-[16px] w-full max-w-[680px] mx-auto items-center sm:items-stretch">
            <div className="flex items-center justify-between w-full">
              <span
                className="font-semibold uppercase text-[12px] text-left"
                style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}
              >
                Website Preview
              </span>
              <button
                type="button"
                onClick={() => { void handleOpenPreview(); }}
                disabled={openingPreview}
                aria-label="Open website preview in a new tab"
                title="Open website preview in a new tab"
                className="flex items-center justify-center rounded-[6px] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  width: 28,
                  height: 28,
                  color: "#6fccdd",
                  background: "rgba(111,204,221,0.1)",
                  border: "1px solid rgba(111,204,221,0.25)",
                }}
              >
                <ExternalLink size={15} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>
            <BrowserFramePreview
              buildId={build.id}
              liveUrl={absoluteApiUrl(deployment?.liveUrl ?? null)}
            />
          </div>

          {/* Next Actions */}
          <div className="flex flex-col gap-[16px] w-full max-w-[680px] mx-auto items-center">
            <span
              className="font-semibold uppercase text-[12px] text-center"
              style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}
            >
              Next Actions
            </span>
            <div className="flex flex-col sm:flex-row gap-4 justify-center w-full items-stretch">
              {/* Download */}
              <div
                className="flex flex-col gap-[16px] p-[24px] rounded-[16px] w-full sm:w-[280px] mx-auto"
                style={{ background: "rgba(111,204,221,0.13)", border: "1px solid rgba(111,204,221,0.2)", minHeight: "100%" }}
              >
                <Download size={24} color="#6fccdd" strokeWidth={1.5} aria-hidden="true" />
                <div>
                  <div className="text-white font-semibold text-[14px]">Download</div>
                  <div className="font-medium text-[12px] mt-[4px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Get your complete HTML files
                  </div>
                </div>
                <button
                  onClick={() => { void handleDownload(); }}
                  disabled={!build.downloadUrl || downloading || busy}
                  className="w-full font-semibold text-[13px] py-[10px] rounded-[8px] disabled:opacity-50"
                  style={{ background: "#6fccdd", color: "#0b0b0b" }}
                >
                  {downloading ? "Downloading…" : "Download"}
                </button>
                {downloadError && (
                  <div className="font-medium text-[12px]" style={{ color: "#f87171" }}>
                    {downloadError}
                  </div>
                )}
              </div>

              {/* Deploy — Vercel claim deferred to phase 2 */}
              <div
                className="flex flex-col gap-[16px] p-[24px] rounded-[16px] w-full sm:w-[280px] mx-auto"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", minHeight: "100%" }}
              >
                <Globe size={24} color="#6fccdd" strokeWidth={1.5} aria-hidden="true" />
                <div>
                  <div className="flex items-center gap-[6px]">
                    <span className="text-white font-semibold text-[14px]">Deploy to Domain</span>

                    <DeployTooltip />

                  </div>
                  <div className="font-medium text-[12px] mt-[4px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Requires a connected domain
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDeployPhaseMessage(
                      "This feature will be available in Phase 2 soon.",
                    );
                  }}
                  aria-disabled="true"
                  title="Coming in Phase 2"
                  className="w-full font-semibold text-[13px] py-[10px] rounded-[8px] uppercase cursor-not-allowed"
                  style={{
                    border: "1.5px solid rgba(111,204,221,0.35)",
                    color: "rgba(111,204,221,0.45)",
                    background: "transparent",
                    opacity: 0.65,
                  }}
                >
                  Open Vercel Claim
                </button>
                {deployPhaseMessage && (
                  <div className="font-medium text-[12px]" style={{ color: "#6fccdd" }}>
                    {deployPhaseMessage}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScaledPage>
  );
}
