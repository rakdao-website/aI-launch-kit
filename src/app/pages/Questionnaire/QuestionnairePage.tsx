import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { ScaledPage } from "@/app/components/common/ScaledPage";
import { SubNav } from "@/app/components/common/SubNav";
import { TopHeader } from "@/app/components/common/TopHeader";
import { ValidationError } from "@/app/components/common/ValidationError";
import { snapshotFileInput } from "@/app/brand-file-input";
import { ProjectView } from "@/app/launchkit-api";
import {
  brandDocumentFileSchema,
  logoFileSchema,
  questionnaireSchema,
  QuestionnaireValues,
  websiteUrlSchema,
} from "@/app/wizard-validation";
import {
  AiSummaryDraft,
  buildAiSummaryDraft,
  isDocumentAsset,
  isLogoAsset,
  MAX_BRAND_DOCUMENTS,
  summaryCoverage,
} from "@/app/lib/ai-summary";
import { AiSummaryModal } from "./AiSummaryModal";
import { FileChip, UploadDropzone } from "./UploadDropzone";

export function QuestionnairePage({
  project,
  onSave,
  onUploadLogo,
  onUploadDocuments,
  onRemoveAsset,
  onApplySummary,
  onRunAiSummary,
  onBack,
  onStepClick,
  completedUpTo,
  busy,
  error = null,
}: {
  project: ProjectView;
  onSave: (form: QuestionnaireValues) => Promise<void>;
  onUploadLogo: (file: File) => Promise<void>;
  onUploadDocuments: (files: File[]) => Promise<void>;
  onRemoveAsset: (assetId: string) => Promise<void>;
  onApplySummary: (summary: AiSummaryDraft) => Promise<void>;
  onRunAiSummary: (websiteUrl?: string) => Promise<void>;
  onBack: () => void;
  onStepClick?: (step: number) => void;
  completedUpTo?: number;
  busy: boolean;
  error?: string | null;
}) {
  const [logoDrag, setLogoDrag] = useState(false);
  const [docDrag, setDocDrag] = useState(false);
  const [uploadError, setUploadError] = useState<string>();
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState<AiSummaryDraft | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [websiteError, setWebsiteError] = useState<string>();
  const [summaryError, setSummaryError] = useState<string>();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const logoAsset = project.uploadedAssets.find(isLogoAsset) ?? null;
  const documentAssets = project.uploadedAssets.filter(isDocumentAsset);
  const extracted = project.extractedProfileFields ?? {};
  // Apply / coverage must only reflect the latest AI extract, not manually entered form data.
  const hasExtracted = Object.values(extracted).some((value) => String(value ?? "").trim());

  const builtSummary = buildAiSummaryDraft(extracted, undefined, undefined, {
    preferSourcesOnly: true,
  });
  const pageCoverage = summaryCoverage(builtSummary);
  const canRunSummary = documentAssets.length > 0 || Boolean(websiteUrl.trim());

  const { register, reset, handleSubmit, formState: { errors } } = useForm<QuestionnaireValues>({
    resolver: zodResolver(questionnaireSchema),
    defaultValues: {
      companyName: project.business.companyName,
      industry: project.business.industry,
      customers: project.business.targetAudience,
      tagline: project.design.tagline,
    },
    mode: "onTouched",
  });

  useEffect(() => {
    reset({
      companyName: project.business.companyName,
      industry: project.business.industry,
      customers: project.business.targetAudience,
      tagline: project.design.tagline,
    });
  }, [project.id, project.updatedAt, project.business, project.design, reset]);

  const openSummaryModal = (source: AiSummaryDraft = builtSummary) => {
    setSummaryDraft(source);
    setSummaryOpen(true);
  };

  const closeSummaryModal = () => {
    setSummaryOpen(false);
    setSummaryDraft(null);
  };

  const continueQuestionnaire = () => {
    void handleSubmit(onSave)();
  };

  async function acceptLogo(file: File) {
    const validation = logoFileSchema.safeParse(file);
    if (!validation.success) {
      setUploadError(validation.error.issues[0]?.message ?? "Choose a valid logo file.");
      return;
    }
    setUploadError(undefined);
    await onUploadLogo(file);
  }

  async function acceptDocuments(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    const remaining = MAX_BRAND_DOCUMENTS - documentAssets.length;
    if (remaining <= 0) {
      setUploadError(`Upload at most ${MAX_BRAND_DOCUMENTS} brand documents.`);
      return;
    }
    const accepted: File[] = [];
    for (const file of list.slice(0, remaining)) {
      const validation = brandDocumentFileSchema.safeParse(file);
      if (!validation.success) {
        setUploadError(validation.error.issues[0]?.message ?? "Choose a valid document.");
        return;
      }
      accepted.push(file);
    }
    setUploadError(undefined);
    await onUploadDocuments(accepted);
  }

  const runAiSummary = () => {
    const trimmed = websiteUrl.trim();
    if (!trimmed && documentAssets.length === 0) {
      setSummaryError("Add a website address or brand documents to run AI Summary.");
      return;
    }
    if (trimmed) {
      const validation = websiteUrlSchema.safeParse(websiteUrl);
      if (!validation.success) {
        setWebsiteError(validation.error.issues[0]?.message ?? "Enter a valid website address.");
        return;
      }
      setWebsiteError(undefined);
      setSummaryError(undefined);
      openSummaryModal({
        companyOverview: "",
        targetAudience: "",
        services: "",
        brandTone: "",
        mainCta: "",
      });
      void onRunAiSummary(validation.data);
      return;
    }
    setWebsiteError(undefined);
    setSummaryError(undefined);
    openSummaryModal({
      companyOverview: "",
      targetAudience: "",
      services: "",
      brandTone: "",
      mainCta: "",
    });
    void onRunAiSummary();
  };

  // After extraction completes, load ONLY the latest extract into the open modal.
  // Never mix in project.business — that retained prior document runs after URL-only re-extract.
  useEffect(() => {
    if (!summaryOpen || busy) return;
    setSummaryDraft(
      buildAiSummaryDraft(project.extractedProfileFields ?? {}, undefined, undefined, {
        preferSourcesOnly: true,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryOpen, busy, project.updatedAt]);

  // Provider failures leave an empty modal that looks like a bad PDF — close it and surface the real error.
  useEffect(() => {
    if (!summaryOpen || busy || !error) return;
    setSummaryOpen(false);
    setSummaryDraft(null);
    setSummaryError(error);
  }, [summaryOpen, busy, error]);

  const fields: Array<{ key: keyof QuestionnaireValues; label: string; placeholder: string }> = [
    { key: "companyName", label: "Company / Brand Name", placeholder: "e.g. Innovation City" },
    { key: "industry", label: "Business category", placeholder: "One line description" },
    { key: "customers", label: "Who are the customers?", placeholder: "Target audience or market" },
    { key: "tagline", label: "Tagline or hero message", placeholder: "Leave blank if none" },
  ];

  return (
    <ScaledPage
      scrollable
      header={
        <>
          <TopHeader />
          <SubNav
            activeStep={0}
            completedUpTo={completedUpTo}
            onBack={onBack}
            onNext={busy ? undefined : continueQuestionnaire}
            onStepClick={onStepClick}
          />
        </>
      }
    >
      <div
        className="w-full min-h-full flex flex-col"
        style={{ background: "#0b0b0b", fontFamily: "'Montserrat', sans-serif" }}
      >
        <div className="flex-1 px-[clamp(16px,5vw,80px)] py-[clamp(24px,5vw,48px)] flex flex-col gap-[clamp(16px,3vw,28px)]">
          {/* Brand assets + optional website for AI Summary */}
          <div
            className="relative flex flex-col gap-[20px] p-[clamp(20px,4vw,40px)]"
            style={{
              background: "#0b0b0b",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 20,
              boxShadow: "0 18px 40px -12px rgba(0,0,0,0.4)",
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-[16px]">
              <div className="flex flex-col gap-[10px] max-w-[720px]">
                <div className="flex items-center gap-[10px]">
                  <h2 className="text-white font-semibold" style={{ fontSize: "clamp(19px, 5vw, 24px)" }}>
                    Start with your brand
                  </h2>
                  <div className="w-[8px] h-[8px] rounded-full shrink-0" style={{ background: "#6fccdd" }} />
                </div>
                <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, lineHeight: 1.55 }}>
                  Logo, documents, and website are all optional. AI Summary scrapes your site first
                  (when provided), then reads your documents, and builds one combined brief.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-[10px] shrink-0">
                <button
                  type="button"
                  disabled={busy || !hasExtracted}
                  onClick={() => openSummaryModal()}
                  className="font-semibold text-[12px] uppercase tracking-wide px-[18px] py-[11px]"
                  style={{
                    background: hasExtracted ? "#6FCCDD" : "rgba(111,204,221,0.25)",
                    color: "#0b0b0b",
                    border: "none",
                    borderRadius: 10,
                    cursor: hasExtracted && !busy ? "pointer" : "not-allowed",
                    opacity: busy ? 0.7 : 1,
                  }}
                >
                  Apply to form
                  {hasExtracted && pageCoverage > 0 ? ` · ${pageCoverage}%` : ""}
                </button>
                <button
                  type="button"
                  disabled={busy || !canRunSummary}
                  onClick={runAiSummary}
                  className="font-semibold text-[12px] uppercase tracking-wide px-[18px] py-[11px]"
                  style={{
                    background: "transparent",
                    color: "#6FCCDD",
                    border: "1px solid #6FCCDD",
                    borderRadius: 10,
                    cursor: canRunSummary && !busy ? "pointer" : "not-allowed",
                    opacity: canRunSummary && !busy ? 1 : 0.45,
                  }}
                >
                  {busy && summaryOpen ? "Extracting..." : "AI Summary"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
              <UploadDropzone
                title="Click or drag your logo here"
                hint="Optional · PNG, SVG, JPG · 1 file · Max 1.5 MB"
                dragOver={logoDrag}
                onDragOver={(e) => {
                  e.preventDefault();
                  setLogoDrag(true);
                }}
                onDragLeave={() => setLogoDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setLogoDrag(false);
                  const file = e.dataTransfer.files[0];
                  if (file) void acceptLogo(file);
                }}
                onBrowse={() => logoInputRef.current?.click()}
                inputRef={logoInputRef}
                accept=".png,.svg,.jpg,.jpeg,image/png,image/svg+xml,image/jpeg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void acceptLogo(file);
                }}
              >
                {logoAsset && (
                  <FileChip
                    name={logoAsset.filename}
                    size={logoAsset.size}
                    disabled={busy}
                    onRemove={() => void onRemoveAsset(logoAsset.id)}
                  />
                )}
              </UploadDropzone>

              <UploadDropzone
                title="Click or drag your documents here"
                hint="Optional · Up to 5 files · Max 1.5 MB each"
                dragOver={docDrag}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDocDrag(true);
                }}
                onDragLeave={() => setDocDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDocDrag(false);
                  void acceptDocuments(e.dataTransfer.files);
                }}
                onBrowse={() => docInputRef.current?.click()}
                inputRef={docInputRef}
                accept=".pdf,.docx,.pptx,.txt,.md,.png,.jpg,.jpeg"
                multiple
                onChange={(e) => {
                  const files = snapshotFileInput(e.target);
                  if (files.length) void acceptDocuments(files);
                }}
              >
                {documentAssets.length > 0 && (
                  <div className="flex flex-col gap-[8px]">
                    {documentAssets.map((asset) => (
                      <FileChip
                        key={asset.id}
                        name={asset.filename}
                        size={asset.size}
                        disabled={busy}
                        onRemove={() => void onRemoveAsset(asset.id)}
                      />
                    ))}
                  </div>
                )}
              </UploadDropzone>
            </div>

            <ValidationError message={uploadError} />

            {/* Existing website — used by AI Summary, no separate discovery button */}
            <div
              className="flex flex-col gap-[12px] pt-[20px]"
              style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="flex flex-col gap-[6px]">
                <label
                  htmlFor="website-url"
                  className="font-semibold uppercase"
                  style={{ fontSize: 12, color: "#6fccdd", letterSpacing: "0.08em" }}
                >
                  Already have a website? (optional)
                </label>
                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, lineHeight: 1.5 }}>
                  Paste the link if you have one. AI Summary will scrape it first, then combine it with
                  any uploaded documents into one reviewable brief.
                </p>
              </div>
              <div
                className="flex items-center w-full"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: websiteError
                    ? "1px solid rgba(248,113,113,0.8)"
                    : "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  height: 48,
                  padding: "0 16px",
                }}
              >
                <input
                  id="website-url"
                  type="url"
                  inputMode="url"
                  className="w-full bg-transparent outline-none font-medium text-[14px]"
                  style={{ color: "white", caretColor: "#6fccdd" }}
                  placeholder="https://your-website.com"
                  value={websiteUrl}
                  onChange={(e) => {
                    setWebsiteUrl(e.target.value);
                    setWebsiteError(undefined);
                    setSummaryError(undefined);
                  }}
                  disabled={busy}
                  aria-invalid={Boolean(websiteError)}
                  aria-describedby={websiteError ? "website-url-error" : undefined}
                />
              </div>
              <ValidationError id="website-url-error" message={websiteError || summaryError} />
            </div>
          </div>

          {/* Tell us about your brand */}
          <div
            className="relative flex flex-col gap-[clamp(20px,4vw,40px)] p-[clamp(20px,6vw,56px)]"
            style={{
              background: "#0b0b0b",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 20,
              boxShadow: "0 18px 40px -12px rgba(0,0,0,0.4)",
            }}
          >
            <svg
              className="absolute inset-0 w-full h-full"
              style={{ opacity: 0.04, pointerEvents: "none" }}
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern id="grid-brand" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid-brand)" />
            </svg>

            <div className="flex items-center gap-[10px] relative">
              <h2 className="text-white font-semibold" style={{ fontSize: "clamp(19px, 5vw, 24px)" }}>
                Tell us about your brand
              </h2>
              <div className="w-[8px] h-[8px] rounded-full" style={{ background: "#6fccdd" }} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[24px] relative">
              {fields.map(({ key, label, placeholder }) => (
                <div key={key} className="flex flex-col gap-[8px]">
                  <label
                    className="font-semibold uppercase"
                    style={{ fontSize: 12, color: "#6fccdd", letterSpacing: "0.08em" }}
                  >
                    {label}
                  </label>
                  <div
                    className="flex items-center"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: errors[key]
                        ? "1px solid rgba(248,113,113,0.8)"
                        : "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12,
                      height: 48,
                      padding: "0 16px",
                    }}
                  >
                    <input
                      className="w-full bg-transparent outline-none font-medium text-[14px]"
                      style={{ color: "white", caretColor: "#6fccdd" }}
                      placeholder={placeholder}
                      {...register(key)}
                      aria-invalid={Boolean(errors[key])}
                      aria-describedby={errors[key] ? `${key}-error` : undefined}
                    />
                  </div>
                  <ValidationError id={`${key}-error`} message={errors[key]?.message} />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={continueQuestionnaire}
              disabled={busy}
              className="w-full font-semibold text-[14px] uppercase relative"
              style={{
                background: "#6fccdd",
                color: "#0b0b0b",
                borderRadius: 12,
                padding: "16px 0",
              }}
            >
              {busy ? "Saving..." : "Save & Continue"}
            </button>
          </div>
        </div>
      </div>

      {summaryOpen && summaryDraft && (
        <AiSummaryModal
          draft={summaryDraft}
          busy={busy}
          onChange={setSummaryDraft}
          onCancel={closeSummaryModal}
          onApply={() => {
            void onApplySummary(summaryDraft).then(() => closeSummaryModal());
          }}
        />
      )}
    </ScaledPage>
  );
}
