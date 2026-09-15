import { Spinner } from "@/app/components/common/Spinner";
import { AI_SUMMARY_FIELDS, AiSummaryDraft, summaryCoverage } from "@/app/lib/ai-summary";

export function AiSummaryModal({
  draft,
  busy,
  onChange,
  onCancel,
  onApply,
}: {
  draft: AiSummaryDraft;
  busy: boolean;
  onChange: (next: AiSummaryDraft) => void;
  onCancel: () => void;
  onApply: () => void;
}) {
  const coverage = summaryCoverage(draft);
  const hasAny = coverage > 0;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)", zIndex: 9999 }}
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="flex flex-col w-full max-w-[760px] max-h-[min(90vh,880px)]"
        style={{
          background: "#111111",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 20,
          fontFamily: "'Montserrat', sans-serif",
          boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-summary-title"
      >
        <div className="flex items-start justify-between gap-4 px-6 sm:px-8 pt-7 pb-2">
          <div className="flex flex-col gap-2 min-w-0">
            <h2 id="ai-summary-title" className="text-white font-semibold text-[22px] sm:text-[26px] leading-tight">
              AI Summary
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, lineHeight: 1.5, maxWidth: 520 }}>
              Review the highlights below. Saving also applies the full extracted brief
              (products, contact, hours, testimonials, and more) so website generation
              can use those details — not only these five fields.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close AI Summary"
            style={{
              color: "rgba(255,255,255,0.55)",
              fontSize: 26,
              lineHeight: 1,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
            }}
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-4 flex flex-col gap-4">
          {busy && !hasAny ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Spinner size={36} borderWidth={3} />
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14 }}>
                Reading your documents and extracting brand details…
              </p>
            </div>
          ) : !hasAny ? (
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, padding: "24px 0" }}>
              No brand details could be extracted from the uploaded files. Try a clearer brand book,
              portfolio, or profile document, then run AI Summary again.
            </p>
          ) : (
            AI_SUMMARY_FIELDS.map(({ key, label, hint }) => (
              <div
                key={key}
                className="grid grid-cols-1 sm:grid-cols-[minmax(140px,180px)_1fr] gap-3 sm:gap-5 items-start"
              >
                <div className="pt-1">
                  <div className="text-white font-semibold text-[13px]">{label}</div>
                  <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 11, marginTop: 4, lineHeight: 1.4 }}>
                    {hint}
                  </div>
                </div>
                <div
                  className="relative"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 12,
                    minHeight: 56,
                  }}
                >
                  <textarea
                    value={draft[key]}
                    onChange={(e) => onChange({ ...draft, [key]: e.target.value })}
                    rows={key === "mainCta" ? 2 : 3}
                    className="w-full bg-transparent outline-none resize-y text-[13px] leading-relaxed font-medium"
                    style={{
                      color: "white",
                      caretColor: "#6fccdd",
                      padding: "14px 40px 14px 16px",
                      minHeight: key === "mainCta" ? 52 : 72,
                    }}
                    placeholder="Not found in documents — add or leave blank"
                    disabled={busy}
                  />
                  <span
                    aria-hidden
                    className="absolute top-[14px] right-[14px] pointer-events-none"
                    style={{ color: "rgba(255,255,255,0.35)" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M11.5 2.5l2 2L5.5 12.5H3.5v-2L11.5 2.5z"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div
          className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-6 sm:px-8 py-5"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center gap-3">
            <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: 500 }}>
              Auto-fill Coverage
            </span>
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5"
              style={{
                background: "rgba(111,204,221,0.08)",
                border: "1px solid rgba(111,204,221,0.35)",
                borderRadius: 999,
              }}
            >
              <span className="font-semibold text-[13px]" style={{ color: "#6FCCDD" }}>
                {coverage}%
              </span>
              <div
                style={{
                  width: 48,
                  height: 4,
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.12)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${coverage}%`,
                    height: "100%",
                    background: "#6FCCDD",
                    borderRadius: 999,
                  }}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="font-semibold text-[12px] uppercase tracking-wide px-[20px] py-[12px]"
              style={{
                background: "transparent",
                color: "rgba(255,255,255,0.75)",
                border: "1px solid rgba(255,255,255,0.25)",
                borderRadius: 10,
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onApply}
              disabled={busy || !hasAny}
              className="font-semibold text-[12px] uppercase tracking-wide px-[20px] py-[12px]"
              style={{
                background: hasAny ? "#6FCCDD" : "rgba(111,204,221,0.25)",
                color: "#0b0b0b",
                border: "none",
                borderRadius: 10,
                cursor: hasAny && !busy ? "pointer" : "not-allowed",
                opacity: busy ? 0.75 : 1,
              }}
            >
              {busy ? "Applying..." : "Save & Apply to Form"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
