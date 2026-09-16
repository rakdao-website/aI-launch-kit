import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { ScaledPage } from "@/app/components/common/ScaledPage";
import { TopHeader } from "@/app/components/common/TopHeader";
import { ValidationError } from "@/app/components/common/ValidationError";
import { launchKitApi, MockupView } from "@/app/launchkit-api";
import { mockupSelectionSchema, MockupSelectionValues } from "@/app/wizard-validation";
import { ScaledMockupPreview } from "./ScaledMockupPreview";

export function PreviewPage({ mockups, selectedMockupId, onConfirm, onBack, busy, onSignOut, onHome }: {
  mockups: MockupView[];
  selectedMockupId: string | null;
  onConfirm: (mockupId: string) => Promise<void>;
  onBack: () => void;
  busy: boolean;
  onSignOut?: () => void;
  onHome?: () => void;
}) {
  const [selected, setSelected] = useState(
    selectedMockupId ?? mockups[0]?.id ?? "",
  );
  const [previewHtml, setPreviewHtml] = useState<Record<string, string>>({});
  const { setValue, handleSubmit, formState: { errors } } = useForm<MockupSelectionValues>({
    resolver: zodResolver(mockupSelectionSchema),
    defaultValues: { mockupId: selectedMockupId ?? mockups[0]?.id ?? "" },
    mode: "onChange",
  });

  useEffect(() => {
    const nextSelection = selectedMockupId
      ?? (mockups.some((mockup) => mockup.id === selected) ? selected : mockups[0]?.id ?? "");
    setSelected(nextSelection);
    setValue("mockupId", nextSelection, { shouldValidate: true });
  }, [mockups, selectedMockupId, selected, setValue]);

  useEffect(() => {
    const controller = new AbortController();
    setPreviewHtml({});

    for (const mockup of mockups) {
      void launchKitApi.getAssetContent(mockup.previewUrl, controller.signal)
        .then((content) => {
          if (controller.signal.aborted) return;
          setPreviewHtml((current) => ({ ...current, [mockup.id]: content }));
        })
        .catch((cause) => {
          if (!controller.signal.aborted) {
            console.error("Mockup preview could not be loaded", cause);
          }
        });
    }

    return () => {
      controller.abort();
    };
  }, [mockups]);

  return (
    <ScaledPage
      scrollable
      header={
        <>
          <TopHeader onSignOut={onSignOut} onLogoClick={onHome} />
          {/* Completed steps bar — full-bleed border, stepper content stays centered with its own padding */}
          <div
            className="w-full flex flex-wrap items-center justify-center gap-x-[clamp(8px,2vw,16px)] gap-y-2 px-[clamp(12px,4vw,32px)] py-2"
            style={{
              minHeight: 52,
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              background: "#0b0b0b",
            }}
          >
            {["Business", "Design Category", "Colors & Fonts", "Pick Pages"].map((step) => (
              <div key={step} className="flex items-center gap-[8px]">
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{ width: 18, height: 18, background: "#6fccdd" }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path
                      d="M2 5L4 7L8 3"
                      stroke="#0b0b0b"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="font-semibold text-[12px]" style={{ color: "#6fccdd" }}>
                  {step}
                </span>
                {step !== "Pick Pages" && (
                  <ChevronRight size={12} color="rgba(255,255,255,0.3)" strokeWidth={1.5} aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        </>
      }
    >
      <div
        className="w-full min-h-full flex flex-col"
        style={{ background: "#0b0b0b", fontFamily: "'Montserrat', sans-serif" }}
      >
        <div className="flex-1 px-[clamp(16px,5vw,80px)] py-[clamp(24px,5vw,48px)] flex flex-col gap-[clamp(16px,4vw,32px)]">
          <div className="flex flex-col items-center gap-[8px] text-center">
            <h2 className="text-white font-semibold" style={{ fontSize: "clamp(20px, 5.5vw, 28px)" }}>Choose Your Design</h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, fontWeight: 500 }}>
              Select the version that best fits your vision
            </p>
          </div>

          {/* Version cards — 1 column on mobile (full width, scroll to reach all), 3 on tablet/desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[20px] w-full">
            {mockups.map((v, i) => (
              <button
                key={v.id}
                onClick={() => {
                  setSelected(v.id);
                  setValue("mockupId", v.id, { shouldDirty: true, shouldValidate: true });
                }}
                className="flex flex-col gap-[16px] p-[20px] text-left"
                style={{
                  backdropFilter: "blur(12px)",
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: 8,
                  border:
                    selected === v.id ? "1.5px solid #6fccdd" : "1px solid white",
                  minHeight: "clamp(360px, 55vh, 520px)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-semibold text-[13px] sm:text-[15px]">{v.label}</div>
                    <div className="font-medium text-[11px] mt-[4px]" style={{ color: "rgba(255,255,255,0.45)" }}>{v.direction}</div>

                  </div>
                  <div
                    className="rounded-full flex items-center justify-center"
                    style={{
                      width: 20,
                      height: 20,
                      border: selected === v.id ? "none" : "1.5px solid rgba(255,255,255,0.3)",
                      background: selected === v.id ? "#6fccdd" : "transparent",
                    }}
                  >
                    {selected === v.id && (
                      <div
                        className="rounded-full"
                        style={{ width: 8, height: 8, background: "#0b0b0b" }}
                      />
                    )}
                  </div>
                </div>

                {/* Preview wireframe */}
                <div
                  className="flex-1 rounded-[8px] overflow-hidden flex flex-col"
                  style={{
                    background: i === 1 ? "#0a1a1a" : "#111",
                    border: i === 1 ? "1.5px solid #6fccdd" : "1px solid rgba(255,255,255,0.1)",
                    position: "relative",
                  }}
                >
                  {previewHtml[v.id] && (
                    <ScaledMockupPreview
                      html={previewHtml[v.id]}
                      title={`${v.label} preview`}
                    />
                  )}
                  {/* Nav bar */}
                  <div
                    className="flex items-center gap-[8px] px-[12px]"
                    style={{ height: 28, background: "rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <div style={{ width: 32, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.3)" }} />
                    <div className="flex-1" />
                    {[1, 2, 3].map((j) => (
                      <div key={j} style={{ width: 20, height: 5, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
                    ))}
                  </div>
                  {/* Content */}
                  <div className="flex flex-1">
                    {/* Sidebar */}
                    <div
                      style={{ width: 60, background: "rgba(255,255,255,0.03)", borderRight: "1px solid rgba(255,255,255,0.06)" }}
                      className="flex flex-col gap-[6px] p-[8px]"
                    >
                      {[1, 2, 3, 4].map((k) => (
                        <div key={k} style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.08)" }} />
                      ))}
                    </div>
                    {/* Main area */}
                    <div className="flex-1 p-[12px] flex flex-col gap-[10px]">
                      <div
                        className="w-full rounded-[6px] flex flex-col items-center justify-center gap-[6px]"
                        style={{ height: 100, background: i === 1 ? "rgba(111,204,221,0.08)" : "rgba(255,255,255,0.04)" }}
                      >
                        <div style={{ width: 80, height: 10, borderRadius: 5, background: "rgba(255,255,255,0.2)" }} />
                        <div style={{ width: 60, height: 7, borderRadius: 3, background: "rgba(255,255,255,0.1)" }} />
                      </div>
                      <div className="grid grid-cols-3 gap-[6px]">
                        {[1, 2, 3].map((k) => (
                          <div
                            key={k}
                            style={{
                              height: 48,
                              borderRadius: 4,
                              background: i === 1 ? "rgba(111,204,221,0.05)" : "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.06)",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Confirm button */}
          <div className="flex justify-center w-full">
            <button
              onClick={() => void handleSubmit(({ mockupId }) => onConfirm(mockupId))()}
              disabled={busy}
              className="font-semibold text-[18px] w-full sm:w-auto sm:min-w-[360px]"
              style={{
                background: "#6fccdd",
                color: "#090909",
                borderRadius: 8,
                padding: "16px 24px",
              }}
            >
              {busy ? "Starting Build..." : "Confirm Selection"}
            </button>
          </div>
          <ValidationError message={errors.mockupId?.message} />
        </div>
      </div>
    </ScaledPage>
  );
}
