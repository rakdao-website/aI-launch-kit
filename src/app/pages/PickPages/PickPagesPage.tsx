import { useState } from "react";
import { CircleCheck } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { ScaledPage } from "@/app/components/common/ScaledPage";
import { SubNav } from "@/app/components/common/SubNav";
import { TopHeader } from "@/app/components/common/TopHeader";
import { firstValidationError, ValidationError } from "@/app/components/common/ValidationError";
import { PageLayout, ProjectView, WizardCatalog } from "@/app/launchkit-api";
import { pageLayoutSchema, PageLayoutValues } from "@/app/wizard-validation";
import {
  addSection,
  contentSections,
  deleteSection,
  editorPages,
  layoutTotals,
  MAX_PAGES,
  moveSection,
  togglePage,
  toPageLayout,
  type PageTemplate,
} from "./page-layout";
import { SectionRow } from "./SectionRow";

export function PickPagesPage({ project, catalog, onGenerate, onBack, onStepClick, completedUpTo, busy, onSignOut, onHome }: {
  project: ProjectView;
  catalog: WizardCatalog;
  onGenerate: (layout: PageLayout) => Promise<void>;
  onBack: () => void;
  onStepClick?: (step: number) => void;
  completedUpTo?: number;
  busy: boolean;
  onSignOut?: () => void;
  onHome?: () => void;
}) {
  const [pages, setPages] = useState<PageTemplate[]>(() => editorPages(project, catalog));
  const [openMenu, setOpenMenu] = useState<{ pageId: string; sectionId: string } | null>(null);
  const [addModal, setAddModal] = useState<string | null>(null); // pageId
  const [drag, setDrag] = useState<{ pageId: string; sectionId: string } | null>(null);
  const [dragOver, setDragOver] = useState<{ pageId: string; sectionId: string } | null>(null);
  const { setValue, handleSubmit, formState: { errors } } = useForm<PageLayoutValues>({
    resolver: zodResolver(pageLayoutSchema),
    defaultValues: project.pageLayout,
    mode: "onChange",
  });

  const unlockedSections = catalog.sectionTemplates.filter((section) => !section.locked);
  const {
    selectedPageCount,
    totalContentSections,
    atPageLimit,
    atSectionLimit,
    atLimit,
    hasInvalidPage,
    selectedNames,
    canGenerate,
  } = layoutTotals(pages);

  const continueGeneration = () => {
    const layout = toPageLayout(pages, unlockedSections);
    setValue("pages", layout.pages, { shouldDirty: true, shouldValidate: true });
    void handleSubmit((values) => onGenerate(values))();
  };

  const handleAddSection = (pageId: string, item: { id: string; label: string }) => {
    setPages((prev) => addSection(prev, pageId, item.label, item.id));
    setAddModal(null);
  };

  const handleDrop = (targetPageId: string, targetSectionId: string) => {
    if (drag) {
      setPages((prev) => moveSection(prev, drag, { pageId: targetPageId, sectionId: targetSectionId }));
    }
    setDrag(null);
    setDragOver(null);
  };

  return (
    <ScaledPage
      scrollable
      header={
        <>
          <TopHeader onSignOut={onSignOut} onLogoClick={onHome} />
          <SubNav
            activeStep={3}
            completedUpTo={completedUpTo}
            onBack={onBack}
            onNext={busy ? undefined : continueGeneration}
            onStepClick={onStepClick}
            nextLabel="Review & Generate"
          />
        </>
      }
    >
      <div
        className="w-full min-h-full flex flex-col"
        style={{ background: "#0b0b0b", fontFamily: "'Montserrat', sans-serif" }}
      >
        {/* Close menus on outside click */}
        <div
          className="flex-1 overflow-y-auto"
          onClick={() => { setOpenMenu(null); }}
        >
          <div className="px-[clamp(16px,5vw,80px)] py-[clamp(24px,5vw,48px)] flex flex-col gap-[clamp(16px,4vw,32px)]">
            {/* Header */}
            <div className="flex flex-col gap-[16px]">
              {atLimit && (
                <div style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: "14px 18px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                    <path d="M8 2L1.5 13.5h13L8 2z" stroke="#f87171" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
                    <path d="M8 6.5v3" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="8" cy="11.5" r="0.75" fill="#f87171"/>
                  </svg>
                  <div>
                    <p style={{ color: "#f87171", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Maximum selection reached</p>
                    <p style={{ color: "rgba(248,113,113,0.7)", fontSize: 12, lineHeight: 1.6 }}>
                      You have reached the maximum of 6 pages and 24 content sections. Remove existing pages or sections before adding more.
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-white font-semibold mb-[8px]" style={{ fontSize: "clamp(19px, 5vw, 24px)" }}>Pick your pages</h2>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: 500 }}>
                    Select pages and drag sections to reorder them
                  </p>
                </div>
                <span className="font-semibold text-[13px]" style={{ color: "#6fccdd" }}>
                  {selectedPageCount} of {MAX_PAGES} pages selected
                </span>
              </div>
            </div>

            {/* Page cards grid — 1 col mobile, 2 tablet, 3 desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {pages.map((page) => (
                <div
                  key={page.id}
                  className="flex flex-col gap-[16px] p-[20px]"
                  onClick={() => {
                    const hasContent = contentSections(page.sections).length > 0;
                    if (!hasContent || (!page.selected && atPageLimit)) return;
                    setPages((prev) => togglePage(prev, page.id));
                  }}
                  style={{
                    backdropFilter: "blur(12px)",
                    background: page.selected ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.01)",
                    borderRadius: 16,
                    border: page.selected ? "1px solid white" : "1px solid rgba(255,255,255,0.15)",
                    opacity: page.selected ? 1 : (
                      contentSections(page.sections).length === 0 ? 0.4
                      : atPageLimit ? 0.25
                      : 0.5
                    ),
                    transition: "opacity 0.2s, border 0.2s",
                    cursor: (contentSections(page.sections).length === 0 || (!page.selected && atPageLimit)) ? "not-allowed" : "pointer",
                  }}
                >
                  {/* Card header */}
                  <div
                    className="flex items-center justify-between pb-[16px]"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    <span className="text-white font-semibold text-[18px] leading-[28px]">{page.name}</span>
                    <button onClick={(e) => e.stopPropagation()} className="shrink-0">
                      {page.selected ? (
                        <CircleCheck size={22} color="#6FCCDD" aria-hidden="true" />
                      ) : (
                        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                          <circle cx="11" cy="11" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* No-content warning */}
                  {contentSections(page.sections).length === 0 && (
                    <p style={{ color: "rgba(248,113,113,0.85)", fontSize: 12, lineHeight: 1.55, marginTop: -4 }}>
                      A page requires at least one content section.
                    </p>
                  )}

                  {/* Sections list — drag-and-drop */}
                  <div className="flex flex-col gap-[4px]">
                    {page.sections.map((section) => (
                      <SectionRow
                        key={section.id}
                        section={section}
                        isMenuOpen={openMenu?.pageId === page.id && openMenu?.sectionId === section.id}
                        isDragging={drag?.pageId === page.id && drag?.sectionId === section.id}
                        isOver={dragOver?.pageId === page.id && dragOver?.sectionId === section.id}
                        isLastContent={!section.locked && contentSections(page.sections).length <= 1}
                        onToggleMenu={() =>
                          setOpenMenu((current) =>
                            current?.pageId === page.id && current?.sectionId === section.id
                              ? null
                              : { pageId: page.id, sectionId: section.id },
                          )
                        }
                        onDelete={() => {
                          setPages((prev) => deleteSection(prev, page.id, section.id));
                          setOpenMenu(null);
                        }}
                        onDragStart={() => setDrag({ pageId: page.id, sectionId: section.id })}
                        onDragEnter={() => setDragOver({ pageId: page.id, sectionId: section.id })}
                        onDrop={() => handleDrop(page.id, section.id)}
                        onDragEnd={() => { setDrag(null); setDragOver(null); }}
                      />
                    ))}
                  </div>

                  {/* Add section button — 24 content-section global limit */}
                  {(() => {
                    const atContentLimit = atSectionLimit;
                    return (
                      <div className="relative">
                        <button
                          disabled={atContentLimit}
                          onClick={(e) => { e.stopPropagation(); if (!atContentLimit) setAddModal(addModal === page.id ? null : page.id); }}
                          className="flex items-center justify-center gap-[8px] py-[10px] rounded-[8px] font-semibold text-[13px] w-full transition-colors"
                          style={{
                            border: atContentLimit ? "1px dashed rgba(255,255,255,0.08)" : "1px dashed rgba(255,255,255,0.2)",
                            color: atContentLimit ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.4)",
                            cursor: atContentLimit ? "not-allowed" : "pointer",
                          }}
                          onMouseEnter={(e) => { if (!atContentLimit) { (e.currentTarget as HTMLElement).style.color = "#6fccdd"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(111,204,221,0.4)"; } }}
                          onMouseLeave={(e) => { if (!atContentLimit) { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.2)"; } }}
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                          Add section
                        </button>

                        {/* Add section dropdown */}
                        {!atContentLimit && addModal === page.id && (
                          <div
                            className="absolute left-0 right-0 z-50 overflow-hidden"
                            style={{
                              bottom: "calc(100% + 8px)",
                              background: "#1a1a1a",
                              border: "1px solid rgba(255,255,255,0.12)",
                              borderRadius: 12,
                              boxShadow: "0 -8px 24px rgba(0,0,0,0.5)",
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="px-[14px] py-[10px]" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                              <p className="font-semibold text-[11px] uppercase" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}>
                                Add section
                              </p>
                            </div>
                            <div className="flex flex-col max-h-[200px] overflow-y-auto">
                              {unlockedSections.filter((item) => !page.sections.some((s) => s.templateId === item.id)).map((item) => (
                                <button
                                  key={item.id}
                                  onClick={() => handleAddSection(page.id, item)}
                                  className="flex items-center gap-[10px] px-[14px] py-[9px] font-medium text-[13px] text-left w-full"
                                  style={{ color: "rgba(255,255,255,0.8)", background: "transparent" }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(111,204,221,0.08)")}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                >
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                    <path d="M6 2v8M2 6h8" stroke="#6fccdd" strokeWidth="1.5" strokeLinecap="round" />
                                  </svg>
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Section limit tooltip */}
                        {atContentLimit && addModal === page.id && (
                          <div
                            className="absolute left-0 right-0 z-50"
                            style={{
                              bottom: "calc(100% + 8px)",
                              background: "#1a1a1a",
                              border: "1px solid rgba(248,113,113,0.25)",
                              borderRadius: 10,
                              padding: "12px 14px",
                              boxShadow: "0 -8px 24px rgba(0,0,0,0.5)",
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <p style={{ color: "rgba(248,113,113,0.85)", fontSize: 12, lineHeight: 1.55 }}>
                              Section limit reached. Remove a section from another page before adding a new one.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>

            {/* JSON summary strip */}
            <div
              className="flex flex-col sm:flex-row sm:items-center items-stretch justify-between gap-3 px-[20px] py-[14px] rounded-[12px]"
              style={{ background: "rgba(111,204,221,0.05)", border: "1px solid rgba(111,204,221,0.15)" }}
            >
              <div>
                <p className="text-white font-semibold text-[14px]">
                  {selectedPageCount} pages · {totalContentSections} content sections
                </p>
                <p className="font-medium text-[12px] mt-[2px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {selectedNames.join(", ")}
                </p>
              </div>
              <div className="flex flex-col items-stretch sm:items-end gap-[6px]">
                {(() => {
                  return (
                    <>
                      <button
                        onClick={!busy ? continueGeneration : undefined}
                        disabled={busy}
                        className="font-semibold text-[14px] uppercase px-[24px] py-[12px] rounded-[8px] w-full sm:w-auto"
                        style={{
                          background: busy ? "rgba(255,255,255,0.08)" : "#6fccdd",
                          color: busy ? "rgba(255,255,255,0.25)" : "#0b0b0b",
                          cursor: busy ? "not-allowed" : "pointer",
                          transition: "background 0.2s, color 0.2s",
                        }}
                      >
                         {busy ? "Saving..." : "Review & Generate"}
                      </button>
                      {!canGenerate && (
                        <p style={{ color: "rgba(248,113,113,0.8)", fontSize: 11, textAlign: "right", maxWidth: 240 }}>
                          {selectedPageCount === 0
                            ? "Select at least one page to continue."
                            : hasInvalidPage
                            ? "Fix page configuration issues before continuing."
                            : "Remove sections to stay within the 24-section limit."}
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
            <ValidationError message={firstValidationError(errors)} />
          </div>
        </div>
      </div>
    </ScaledPage>
  );
}
