import { useEffect, useState } from "react";
import { Building2, CircleCheck, Sparkles } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { ScaledPage } from "@/app/components/common/ScaledPage";
import { SubNav } from "@/app/components/common/SubNav";
import { TopHeader } from "@/app/components/common/TopHeader";
import { firstValidationError, ValidationError } from "@/app/components/common/ValidationError";
import { ProjectView, WizardCatalog } from "@/app/launchkit-api";
import { designSelectionSchema, DesignSelectionValues } from "@/app/wizard-validation";
import { CategoryPickerModal } from "./components/CategoryPickerModal";
import { MoodPickerModal } from "./components/MoodPickerModal";

export function CategoryMoodPage({ project, catalog, onSave, onBack, onStepClick, completedUpTo, busy, onSignOut, onHome }: {
  project: ProjectView;
  catalog: WizardCatalog;
  onSave: (categoryId: string, moodId: string, animationId: string) => Promise<void>;
  onBack: () => void;
  onStepClick?: (step: number) => void;
  completedUpTo?: number;
  busy: boolean;
  onSignOut?: () => void;
  onHome?: () => void;
}) {
  const categories = catalog.businessCategories;
  const moods = catalog.designMoods;
  const animationLevels = catalog.animationLevels;
  const [category, setCategory] = useState(
    categories.find((item) => item.id === project.business.categoryId)?.label ?? categories[0]?.label ?? "",
  );
  const [mood, setMood] = useState(
    moods.find((item) => item.id === project.design.moodId)?.label ?? moods[0]?.label ?? "",
  );
  const [animLevel, setAnimLevel] = useState(
    Math.max(0, animationLevels.findIndex((item) => item.id === project.design.animationId)),
  );
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const { reset, setValue, handleSubmit, formState: { errors } } = useForm<DesignSelectionValues>({
    resolver: zodResolver(designSelectionSchema),
    defaultValues: {
      categoryId: categories.find((item) => item.id === project.business.categoryId)?.id ?? categories[0]?.id ?? "",
      moodId: moods.find((item) => item.id === project.design.moodId)?.id ?? moods[0]?.id ?? "",
      animationId: animationLevels.find((item) => item.id === project.design.animationId)?.id ?? animationLevels[0]?.id ?? "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    const categoryChoice = categories.find((item) => item.id === project.business.categoryId) ?? categories[0];
    const moodChoice = moods.find((item) => item.id === project.design.moodId) ?? moods[0];
    const animationIndex = Math.max(0, animationLevels.findIndex((item) => item.id === project.design.animationId));
    setCategory(categoryChoice?.label ?? "");
    setMood(moodChoice?.label ?? "");
    setAnimLevel(animationIndex);
    reset({
      categoryId: categoryChoice?.id ?? "",
      moodId: moodChoice?.id ?? "",
      animationId: animationLevels[animationIndex]?.id ?? "",
    });
  }, [project.updatedAt, catalog, categories, moods, animationLevels, reset]);

  const continueDesign = () => {
    void handleSubmit(({ categoryId, moodId, animationId }) => onSave(categoryId, moodId, animationId))();
  };

  return (
    <ScaledPage
      scrollable
      header={<><TopHeader onSignOut={onSignOut} onLogoClick={onHome} /><SubNav activeStep={1} completedUpTo={completedUpTo} onBack={onBack} onNext={busy ? undefined : continueDesign} onStepClick={onStepClick} /></>}
    >
      <div
        className="w-full min-h-full flex flex-col"
        style={{ background: "#0b0b0b", fontFamily: "'Montserrat', sans-serif" }}
      >
        <div className="px-[clamp(16px,7vw,120px)] py-[clamp(24px,5vw,48px)] flex flex-col gap-[clamp(24px,5vw,48px)]">

          {/* ── Cards row ─────────────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            {/* Business Category card */}
            <div
              className="flex-1 flex flex-col gap-[20px] p-[26px]"
              style={{ backdropFilter: "blur(12px)", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 16 }}
            >
              <div className="flex items-start justify-between gap-[16px]">
                {/* Text */}
                <div className="flex flex-col gap-[12px]">
                  <p className="font-semibold uppercase text-[12px]" style={{ color: "#6fccdd", letterSpacing: "0.1em" }}>
                    Business Category
                  </p>
                  <div className="flex flex-col gap-[6px]">
                    <h3 className="text-white font-semibold text-[16px] sm:text-[18px] leading-[24px] sm:leading-[28px]">{category}</h3>
                    <p className="font-medium text-[13px] sm:text-[14px] leading-[18px] sm:leading-[20px]" style={{ color: "rgba(255,255,255,0.6)", maxWidth: 360 }}>
                      {categories.find((c) => c.label === category)?.description ?? ""}
                    </p>
                  </div>
                </div>
                {/* Icon chip — notched bottom-left corner */}
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{ width: 56, height: 56, background: "rgba(255,255,255,0.06)", borderRadius: "16px 16px 0 16px" }}
                >
                  <Building2 size={24} color="#85D2DB" strokeWidth={1.75} aria-hidden="true" />
                </div>
              </div>
              {/* Divider + link */}
              <div className="flex flex-col gap-[0px]">
                <div style={{ height: 1, background: "rgba(255,255,255,0.1)", marginBottom: 12 }} />
                <button
                  onClick={() => setShowCategoryModal(true)}
                  className="flex items-center gap-[8px] font-medium text-[13px] sm:text-[14px] leading-[18px] sm:leading-[20px] w-fit"
                  style={{ color: "#6fccdd" }}
                >
                  Choose a different category
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3.33 8H12.67M9.33 5L12.67 8L9.33 11" stroke="#6fccdd" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Design Mood card */}
            <div
              className="flex-1 flex flex-col gap-[20px] p-[26px]"
              style={{ backdropFilter: "blur(12px)", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 16 }}
            >
              <div className="flex items-start justify-between gap-[16px]">
                <div className="flex flex-col gap-[12px]">
                  <p className="font-semibold uppercase text-[12px]" style={{ color: "#6fccdd", letterSpacing: "0.1em" }}>
                    Design Mood
                  </p>
                  <div className="flex flex-col gap-[6px]">
                    <h3 className="text-white font-semibold text-[16px] sm:text-[18px] leading-[24px] sm:leading-[28px]">{mood}</h3>
                    <p className="font-medium text-[13px] sm:text-[14px] leading-[18px] sm:leading-[20px]" style={{ color: "rgba(255,255,255,0.6)", maxWidth: 360 }}>
                      {moods.find((m) => m.label === mood)?.description ?? ""}
                    </p>
                  </div>
                </div>
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{ width: 56, height: 56, background: "rgba(255,255,255,0.06)", borderRadius: "16px 16px 0 16px" }}
                >
                  <Sparkles size={24} color="#6FCCDD" strokeWidth={1.75} aria-hidden="true" />
                </div>
              </div>
              <div className="flex flex-col">
                <div style={{ height: 1, background: "rgba(255,255,255,0.1)", marginBottom: 12 }} />
                <button
                  onClick={() => setShowMoodModal(true)}
                  className="flex items-center gap-[8px] font-medium text-[13px] sm:text-[14px] leading-[18px] sm:leading-[20px] w-fit"
                  style={{ color: "#6fccdd" }}
                >
                  Choose a different category
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3.33 8H12.67M9.33 5L12.67 8L9.33 11" stroke="#6fccdd" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* ── Animation Level ───────────────────────────────────────────────── */}
          <div className="flex flex-col gap-[32px] w-full">
            <p className="font-semibold uppercase text-[12px]" style={{ color: "rgba(255,255,255,0.5)", letterSpacing: "0.12em" }}>
              Animation Level
            </p>
            <div className="relative flex items-end w-full overflow-x-hidden">
              {/* Track line — vertically centered on dots, spans the full row */}
              <div
                className="absolute left-0 right-0 w-full"
                style={{ bottom: "clamp(8px, 2vw, 11px)", height: 2, background: "rgba(255,255,255,0.1)" }}
              />
                {animationLevels.map((lvl, i) => {
                const isActive = i === animLevel;
                const dotSize = "clamp(18px, 4vw, 24px)";
                return (
                  <button
                    key={lvl.label}
                    onClick={() => {
                      setAnimLevel(i);
                      setValue("animationId", lvl.id, { shouldDirty: true, shouldValidate: true });
                    }}
                    className="flex-1 flex flex-col items-center relative z-10"
                    style={{ gap: "clamp(5px, 2vw, 12px)", minWidth: 0, padding: "0 2px" }}
                  >
                    {/* Label + sub-label above — clamp() sizing + wrapping so text never gets clipped */}
                    <div className="flex flex-col gap-[2px] items-center text-center" style={{ width: "100%" }}>
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: "clamp(10px, 3vw, 16px)",
                          lineHeight: 1.3,
                          color: isActive ? "#6fccdd" : "white",
                          whiteSpace: "normal",
                          overflowWrap: "break-word",
                          maxWidth: "100%",
                          display: "block",
                        }}
                      >
                        {lvl.label}
                      </span>
                      <span
                        style={{
                          fontWeight: 500,
                          fontSize: "clamp(8px, 2.4vw, 14px)",
                          lineHeight: 1.3,
                          color: "rgba(255,255,255,0.6)",
                          whiteSpace: "normal",
                          overflowWrap: "break-word",
                          maxWidth: "100%",
                          display: "block",
                        }}
                      >
                        {lvl.description}
                      </span>
                    </div>
                    {/* Circle on the track */}
                    {isActive ? (
                      <CircleCheck size={dotSize} color="#6FCCDD" aria-hidden="true" />
                    ) : (
                      <svg width={dotSize} height={dotSize} viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="8" fill="rgba(255,255,255,0.2)" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <ValidationError message={firstValidationError(errors)} />
        </div>

        {/* Category Popup */}
        {showCategoryModal && (
          <CategoryPickerModal
            choices={categories}
            selectedLabel={category}
            onSelect={(choice) => {
              setCategory(choice.label);
              setValue("categoryId", choice.id, { shouldDirty: true, shouldValidate: true });
              setShowCategoryModal(false);
            }}
            onClose={() => setShowCategoryModal(false)}
          />
        )}

        {/* Mood Popup */}
        {showMoodModal && (
          <MoodPickerModal
            choices={moods}
            selectedLabel={mood}
            onSelect={(choice) => {
              setMood(choice.label);
              setValue("moodId", choice.id, { shouldDirty: true, shouldValidate: true });
              setShowMoodModal(false);
            }}
            onClose={() => setShowMoodModal(false)}
          />
        )}
      </div>
    </ScaledPage>
  );
}
