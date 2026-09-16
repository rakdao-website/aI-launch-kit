import { ScaledPage } from "@/app/components/common/ScaledPage";
import { Spinner } from "@/app/components/common/Spinner";
import { TopHeader } from "@/app/components/common/TopHeader";
import { BuildView } from "@/app/launchkit-api";

export function BuildingPage({ build, error, onBack, onProjects, onSignOut }: {
  build: BuildView | null;
  error: string | null;
  onBack: () => void;
  onProjects: () => void;
  onSignOut?: () => void;
}) {
  const terminalError = build && ["failed", "cancelled", "timed_out"].includes(build.status);
  return (
    <ScaledPage header={<TopHeader onSignOut={onSignOut} onLogoClick={onProjects} />}>
      <div className="w-full flex flex-col flex-1" style={{ background: "#0b0b0b", fontFamily: "'Montserrat', sans-serif" }}>
        <div className="flex-1 flex flex-col items-center justify-center gap-[28px] px-4 text-center">
          {!terminalError && !error && (
            <Spinner size={72} borderWidth={4} />
          )}
          <div className="flex flex-col items-center gap-[10px] max-w-[560px]">
            <h2 className="text-white font-semibold" style={{ fontSize: "clamp(19px, 5vw, 24px)" }}>
              {terminalError || error ? "Build needs attention" : "Building your website"}
            </h2>
            <p className="font-medium text-[14px]" style={{ color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
              {error ?? build?.message ?? "Queuing the final build..."}
            </p>
            {build?.warnings.map((warning) => (
              <p key={warning} className="font-medium text-[12px]" style={{ color: "rgba(248,180,113,0.9)", lineHeight: 1.5 }}>{warning}</p>
            ))}
          </div>
          {(terminalError || error) ? (
            <button onClick={onBack} className="font-semibold text-[14px] px-[24px] py-[12px] rounded-[8px]" style={{ background: "#6fccdd", color: "#0b0b0b" }}>
              Return to Designs
            </button>
          ) : (
            <div className="flex flex-col items-center gap-[10px]">
              <button
                onClick={onProjects}
                className="font-semibold text-[13px] px-[20px] py-[11px] rounded-[8px]"
                style={{ background: "transparent", color: "#6fccdd", border: "1px solid rgba(111,204,221,0.5)" }}
              >
                Continue in background
              </button>
              <p className="font-medium text-[12px]" style={{ color: "rgba(255,255,255,0.35)", maxWidth: 420, lineHeight: 1.5 }}>
                The build keeps running on the server. You can close this tab or browse your
                websites — the status is saved and you can reopen the project anytime.
              </p>
            </div>
          )}
        </div>
      </div>
    </ScaledPage>
  );
}
