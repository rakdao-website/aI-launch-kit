import { ScaledPage } from "@/app/components/common/ScaledPage";
import { Spinner } from "@/app/components/common/Spinner";
import { TopHeader } from "@/app/components/common/TopHeader";
import { OperationView } from "@/app/launchkit-api";

export function GeneratingPage({ operation, error, onRetry, onSignOut, onHome }: {
  operation: OperationView | null;
  error: string | null;
  onRetry: () => void;
  onSignOut?: () => void;
  onHome?: () => void;
}) {
  const message = operation?.status === "running"
    ? "Creating three design directions..."
    : "Preparing your persisted project...";

  return (
    <ScaledPage header={<TopHeader onSignOut={onSignOut} onLogoClick={onHome} />}>
      <div
        className="w-full flex flex-col flex-1"
        style={{ background: "#0b0b0b", fontFamily: "'Montserrat', sans-serif", minHeight: "100%" }}
      >
        <div className="flex-1 flex flex-col items-center justify-center gap-[32px]">
          {/* Spinner */}
          <Spinner size={72} borderWidth={4} />

          <div className="flex flex-col items-center gap-[12px]">
            <h2 className="text-white font-semibold" style={{ fontSize: "clamp(19px, 5vw, 24px)" }}>Building your website</h2>
            <p
              className="font-medium text-[14px]"
              style={{ color: "rgba(255,255,255,0.5)", minHeight: 20 }}
            >
              {error ?? message}
            </p>
          </div>

          {error && (
            <button
              onClick={onRetry}
              className="font-semibold text-[14px] px-[24px] py-[12px] rounded-[8px]"
              style={{ background: "#6fccdd", color: "#0b0b0b" }}
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </ScaledPage>
  );
}
