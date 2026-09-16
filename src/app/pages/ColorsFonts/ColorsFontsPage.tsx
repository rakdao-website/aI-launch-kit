import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { ScaledPage } from "@/app/components/common/ScaledPage";
import { SubNav } from "@/app/components/common/SubNav";
import { TopHeader } from "@/app/components/common/TopHeader";
import { firstValidationError, ValidationError } from "@/app/components/common/ValidationError";
import { ProjectView, WizardCatalog } from "@/app/launchkit-api";
import { colorFontSchema, ColorFontValues, CustomPaletteValues } from "@/app/wizard-validation";
import { CustomFontModal } from "./CustomFontModal";
import { CustomPaletteModal } from "./CustomPaletteModal";
import { FontCard } from "./FontCard";
import { FontPair, PaletteEntry } from "./types";

export function ColorsFontsPage({ project, catalog, onSave, onBack, onStepClick, completedUpTo, busy, onSignOut, onHome }: {
  project: ProjectView;
  catalog: WizardCatalog;
  onSave: (paletteId: string, customPalette: CustomPaletteValues | null, fontId: string, customFonts: { heading: string; body: string } | null) => Promise<void>;
  onBack: () => void;
  onStepClick?: (step: number) => void;
  completedUpTo?: number;
  busy: boolean;
  onSignOut?: () => void;
  onHome?: () => void;
}) {
  const palettes: PaletteEntry[] = catalog.palettes
    .filter((item) => item.colors)
    .map((item) => ({ id: item.id, name: item.label, ...item.colors! }));
  const fontPairs: FontPair[] = catalog.fontPairings
    .filter((item) => item.fonts)
    .map((item) => ({ id: item.id, name: item.label, ...item.fonts! }));
  const [selectedPalette, setSelectedPalette] = useState(
    project.design.paletteId === "custom"
      ? palettes.length
      : Math.max(0, palettes.findIndex((item) => item.id === project.design.paletteId)),
  );
  const [selectedFont, setSelectedFont] = useState(
    project.design.fontPairingId === "custom"
      ? fontPairs.length
      : Math.max(0, fontPairs.findIndex((item) => item.id === project.design.fontPairingId)),
  );
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customPaletteError, setCustomPaletteError] = useState<string>();
  const [specificColors, setSpecificColors] = useState(false);
  const [customPalette, setCustomPalette] = useState<CustomPaletteValues | null>(project.design.customPalette);
  const [customDraft, setCustomDraft] = useState<CustomPaletteValues>({ primary: "", secondary: "", background: "", text: "" });
  const [fontModalOpen, setFontModalOpen] = useState(false);
  const [customFontError, setCustomFontError] = useState<string>();
  const [customFont, setCustomFont] = useState<FontPair | null>(
    project.design.customFonts
      ? { name: "Custom", ...project.design.customFonts }
      : null,
  );
  const [fontDraft, setFontDraft] = useState<{ heading: string; body: string }>({ heading: "", body: "" });
  const [headingSearch, setHeadingSearch] = useState("");
  const [bodySearch, setBodySearch] = useState("");
  const { setValue, handleSubmit, formState: { errors } } = useForm<ColorFontValues>({
    resolver: zodResolver(colorFontSchema),
    defaultValues: {
      paletteId: project.design.paletteId || palettes[0]?.id || "",
      customPalette: project.design.customPalette,
      fontPairingId: project.design.fontPairingId || fontPairs[0]?.id || "",
      customFonts: project.design.customFonts,
    },
    mode: "onChange",
  });

  const continueColors = () => {
    const paletteId = selectedPalette === palettes.length ? "custom" : palettes[selectedPalette]?.id;
    const fontId = selectedFont === fontPairs.length ? "custom" : fontPairs[selectedFont]?.id;
    const customFonts = fontId === "custom" && customFont
      ? { heading: customFont.heading, body: customFont.body }
      : null;
    setValue("paletteId", paletteId ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("customPalette", paletteId === "custom" ? customPalette : null, { shouldDirty: true, shouldValidate: true });
    setValue("fontPairingId", fontId ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("customFonts", customFonts, { shouldDirty: true, shouldValidate: true });
    void handleSubmit((values) => onSave(
      values.paletteId,
      values.customPalette,
      values.fontPairingId,
      values.customFonts,
    ))();
  };

  return (
    <ScaledPage
      scrollable
      header={<><TopHeader onSignOut={onSignOut} onLogoClick={onHome} /><SubNav activeStep={2} completedUpTo={completedUpTo} onBack={onBack} onNext={busy ? undefined : continueColors} onStepClick={onStepClick} /></>}
    >
      <div
        className="w-full min-h-full flex flex-col"
        style={{ background: "#0b0b0b", fontFamily: "'Montserrat', sans-serif" }}
      >
        <div className="px-[clamp(16px,5vw,80px)] py-[clamp(24px,5vw,48px)] flex flex-col gap-[clamp(20px,4vw,40px)]">
          {/* Palettes section */}
          <div className="flex flex-col gap-[20px]">
            <span
              className="font-semibold uppercase text-[13px]"
              style={{ color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em" }}
            >
              Theme Mode
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* 7 preset palette cards */}
              {palettes.map((palette, i) => {
                const colors = [palette.primary, palette.secondary, palette.background, palette.text];
                const selected = selectedPalette === i;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedPalette(i)}
                    className="relative flex flex-col rounded-[8px] overflow-hidden"
                    style={{
                      height: 80,
                      outline: selected ? "2px solid #6fccdd" : "1px solid rgba(255,255,255,0.1)",
                      outlineOffset: selected ? 2 : 0,
                    }}
                  >
                    <div className="flex w-full" style={{ height: 58 }}>
                      {colors.map((color, j) => (
                        <div key={j} className="flex-1 h-full" style={{ background: color }} />
                      ))}
                    </div>
                    <div
                      className="flex items-center justify-center w-full"
                      style={{ height: 22, background: "#1a1a1a", fontSize: 10, color: "rgba(255,255,255,0.6)", fontFamily: "'Montserrat',sans-serif", fontWeight: 600, letterSpacing: "0.03em" }}
                    >
                      {palette.name}
                    </div>
                    <div
                      className="absolute top-[6px] right-[6px] flex items-center justify-center rounded-full"
                      style={{
                        width: 18,
                        height: 18,
                        background: selected ? "#6fccdd" : "rgba(0,0,0,0.3)",
                        border: selected ? "none" : "1px solid rgba(255,255,255,0.3)",
                      }}
                    >
                      {selected && (
                        <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5L4 7L8 3" stroke="#0b0b0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Custom palette card */}
              {(() => {
                const CUSTOM_IDX = palettes.length;
                const selected = selectedPalette === CUSTOM_IDX;
                return (
                  <button
                    onClick={() => {
                      setCustomPaletteError(undefined);
                      if (customPalette) setCustomDraft({ ...customPalette });
                      setCustomModalOpen(true);
                    }}
                    className="relative flex flex-col rounded-[8px] overflow-hidden"
                    style={{
                      height: 80,
                      outline: selected ? "2px solid #6fccdd" : "1px solid rgba(255,255,255,0.1)",
                      outlineOffset: selected ? 2 : 0,
                      background: customPalette
                        ? undefined
                        : "rgba(255,255,255,0.03)",
                    }}
                  >
                    {customPalette ? (
                      <div className="flex w-full" style={{ height: 58 }}>
                        {[customPalette.primary, customPalette.secondary, customPalette.background, customPalette.text].map((c, j) => (
                          <div key={j} className="flex-1 h-full" style={{ background: c }} />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center w-full" style={{ height: 58, gap: 4 }}>
                        {/* Paint palette icon */}
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                          <circle cx="8.5" cy="9" r="1.5" fill="#6FCCDD" />
                          <circle cx="12" cy="6.5" r="1.5" fill="#EC4899" />
                          <circle cx="15.5" cy="9" r="1.5" fill="#F5D76E" />
                          <path d="M12 2C6.477 2 2 6.477 2 12c0 5.522 4.477 10 10 10 1.104 0 2-.896 2-2a1.99 1.99 0 00-.512-1.342c-.13-.149-.247-.31-.347-.48a2 2 0 011.73-3.178h1.943C19.379 15 22 12.379 22 9.129 22 5.195 17.522 2 12 2z" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </div>
                    )}
                    <div
                      className="flex items-center justify-center w-full"
                      style={{ height: 22, background: "#1a1a1a", fontSize: 10, color: "rgba(255,255,255,0.6)", fontFamily: "'Montserrat',sans-serif", fontWeight: 600, letterSpacing: "0.03em" }}
                    >
                      Custom
                    </div>
                    <div
                      className="absolute top-[6px] right-[6px] flex items-center justify-center rounded-full"
                      style={{
                        width: 18,
                        height: 18,
                        background: selected ? "#6fccdd" : "rgba(0,0,0,0.3)",
                        border: selected ? "none" : "1px solid rgba(255,255,255,0.3)",
                      }}
                    >
                      {selected && (
                        <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5L4 7L8 3" stroke="#0b0b0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })()}
            </div>

            {/* Custom palette modal */}
            {customModalOpen && (
              <CustomPaletteModal
                draft={customDraft}
                onDraftChange={setCustomDraft}
                specificColors={specificColors}
                onSpecificColorsChange={setSpecificColors}
                error={customPaletteError}
                onError={setCustomPaletteError}
                onCancel={() => setCustomModalOpen(false)}
                onApply={(palette) => {
                  setCustomPaletteError(undefined);
                  setCustomPalette(palette);
                  setSelectedPalette(palettes.length);
                  setCustomModalOpen(false);
                }}
              />
            )}
          </div>

          {/* Font Pairings section */}
          <div className="flex flex-col gap-[20px]">
            <span
              className="font-semibold uppercase text-[13px]"
              style={{ color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em" }}
            >
              Font Pairings
            </span>

            {/* Unified responsive grid — 2 cols mobile, 3 tablet, 4 desktop. CSS decides the
                column count (Tailwind breakpoints), not JS device detection. */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {fontPairs.map((pair, i) => (
                <FontCard key={i} pair={pair} selected={selectedFont === i} onClick={() => setSelectedFont(i)} />
              ))}
              {/* Custom font card */}
              {(() => {
                const CUSTOM_FONT_IDX = fontPairs.length;
                const selected = selectedFont === CUSTOM_FONT_IDX;
                return (
                  <button
                    onClick={() => {
                      setCustomFontError(undefined);
                      if (customFont) { setFontDraft({ heading: customFont.heading, body: customFont.body }); setHeadingSearch(customFont.heading); setBodySearch(customFont.body); }
                      else { setFontDraft({ heading: "", body: "" }); setHeadingSearch(""); setBodySearch(""); }
                      setFontModalOpen(true);
                    }}
                    className="flex flex-col gap-[10px] p-[16px] text-left"
                    style={{
                      backdropFilter: "blur(12px)",
                      borderRadius: 16,
                      border: selected ? "1px solid #6fccdd" : "1px solid white",
                      background: selected ? "rgba(111,204,221,0.05)" : "rgba(255,255,255,0.02)",
                    }}
                  >
                    <span className="font-semibold uppercase text-[9px] sm:text-[10px]" style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em" }}>Custom</span>
                    {customFont ? (
                      <>
                        <p className="text-white font-bold text-[14px] sm:text-[16px] leading-tight" style={{ fontFamily: `'${customFont.heading}', serif` }}>{customFont.heading}</p>
                        <p className="text-[11px] sm:text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.5)", fontFamily: `'${customFont.body}', sans-serif` }}>{customFont.body} — body text</p>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center flex-1 gap-[8px]" style={{ minHeight: 60 }}>
                        {/* Typography icon */}
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                          <path d="M4 7V4h16v3" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M12 4v16M9 20h6" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Choose fonts</span>
                      </div>
                    )}
                  </button>
                );
              })()}
            </div>

            {/* Custom font modal */}
            {fontModalOpen && (
              <CustomFontModal
                draft={fontDraft}
                onDraftChange={setFontDraft}
                headingSearch={headingSearch}
                onHeadingSearchChange={setHeadingSearch}
                bodySearch={bodySearch}
                onBodySearchChange={setBodySearch}
                error={customFontError}
                onError={setCustomFontError}
                onCancel={() => setFontModalOpen(false)}
                onApply={(fonts) => {
                  setCustomFontError(undefined);
                  setCustomFont({ name: "Custom", ...fonts });
                  setSelectedFont(fontPairs.length);
                  setFontModalOpen(false);
                }}
              />
            )}
          </div>
          <ValidationError message={firstValidationError(errors)} />
        </div>
      </div>
    </ScaledPage>
  );
}
