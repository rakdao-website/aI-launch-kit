// Owns the wizard's server-backed session: auth bootstrap, the active project,
// and every API command the pages trigger. Lifted out of App.tsx so the root is
// just routing, and so these handlers stop being redefined on every render.
import { useCallback, useEffect, useState } from "react";

import {
  ACTIVE_BUILD_STATUSES,
  beginInnovationCityLogin,
  BuildView,
  clearAccessToken,
  createIdempotencyKey,
  DeploymentView,
  fetchInnovationCityApiToken,
  fetchInnovationCityMe,
  hasAccessToken,
  innovationCityLogout,
  launchKitApi,
  LaunchKitApiError,
  MockupView,
  OperationView,
  PageLayout,
  ProjectSummaryView,
  ProjectView,
  readAccessTokenClaims,
  setAccessToken,
  waitForDeployment,
  waitForOperation,
  watchBuild,
  WizardCatalog,
} from "../launchkit-api";
import { completedUpTo, Page, previousPage, resumePageForProject, stepTarget } from "../lib/navigation";
import { clearProjectSession, readSession, removeSession, SESSION_KEYS, writeSession } from "../lib/storage";
import { AiSummaryDraft, pickExtracted } from "../lib/ai-summary";
import type { CustomPaletteValues, QuestionnaireValues } from "../wizard-validation";

function initialPage(): Page {
  // Returning from SSO: treat as signed-in immediately so we never paint login.
  if (typeof window !== "undefined") {
    const auth = new URLSearchParams(window.location.search).get("auth");
    if (auth === "success") return "projects";
  }
  return hasAccessToken() ? "projects" : "login";
}

async function logAuthDebug(accessToken: string | null) {
  const claims = readAccessTokenClaims(accessToken);
  console.log("[launchkit] API JWT claims (owner_id = sub)", claims);
  try {
    const me = await fetchInnovationCityMe();
    console.log("[launchkit] IC /auth/me", {
      authenticated: me.authenticated,
      ownerId: me.ownerId,
      licenseNumber: me.licenseNumber,
      user: me.user,
      profile: me.profile,
    });
  } catch (cause) {
    console.warn("[launchkit] IC /auth/me profile unavailable", cause);
  }
}

export function useProjectSession() {
  const [page, setPage] = useState<Page>(initialPage);
  const [maxReachedStep, setMaxReachedStep] = useState(() => {
    const saved = readSession(SESSION_KEYS.maxReachedStep);
    return saved === null ? -1 : Number.parseInt(saved, 10);
  });
  const [catalog, setCatalog] = useState<WizardCatalog | null>(null);
  const [project, setProject] = useState<ProjectView | null>(null);
  const [projects, setProjects] = useState<ProjectSummaryView[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [operation, setOperation] = useState<OperationView | null>(null);
  const [mockups, setMockups] = useState<MockupView[]>([]);
  const [build, setBuild] = useState<BuildView | null>(null);
  const [deployment, setDeployment] = useState<DeploymentView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);

  const go = useCallback((next: Page) => {
    setPage(next);
  }, []);

  useEffect(() => {
    writeSession(SESSION_KEYS.maxReachedStep, String(maxReachedStep));
  }, [maxReachedStep]);

  const refreshProject = async (projectId: string) => {
    const refreshed = await launchKitApi.getProject(projectId);
    setProject(refreshed);
    return refreshed;
  };

  const refreshProjects = async () => {
    setProjectsLoading(true);
    try {
      setProjects(await launchKitApi.listProjects());
    } finally {
      setProjectsLoading(false);
    }
  };

  const clearActiveProject = () => {
    clearProjectSession();
    setProject(null);
    setOperation(null);
    setMockups([]);
    setBuild(null);
    setDeployment(null);
    setMaxReachedStep(-1);
  };

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      // Returning from the Innovation City OAuth redirect (?auth=success/error).
      const params = new URLSearchParams(window.location.search);
      const authStatus = params.get("auth");
      if (authStatus) {
        const reason = params.get("reason");
        params.delete("auth");
        params.delete("reason");
        const query = params.toString();
        window.history.replaceState(
          {},
          "",
          `${window.location.pathname}${query ? `?${query}` : ""}`,
        );
        if (authStatus === "success") {
          try {
            const session = await fetchInnovationCityApiToken();
            setAccessToken(session.accessToken);
            await logAuthDebug(session.accessToken);
          } catch {
            if (!cancelled) setError("Sign-in could not be completed. Please try again.");
          }
        } else if (authStatus === "error") {
          if (!cancelled) {
            setError(reason ? `Sign-in failed: ${reason}` : "Sign-in failed. Please try again.");
          }
        }
      }

      if (!hasAccessToken()) {
        // Cookie-only IC session: mint/store Bearer so /api/v1 works after refresh.
        try {
          const session = await fetchInnovationCityApiToken();
          if (cancelled) return;
          setAccessToken(session.accessToken);
          await logAuthDebug(session.accessToken);
        } catch {
          setPage("login");
          if (!cancelled) setBooting(false);
          try {
            const loadedCatalog = await launchKitApi.getCatalog();
            if (!cancelled) setCatalog(loadedCatalog);
          } catch {
            // Catalog is only required after sign-in; login still works without it.
          }
          return;
        }
      } else {
        await logAuthDebug(null);
      }

      try {
        const loadedCatalog = await launchKitApi.getCatalog();
        if (cancelled) return;
        setCatalog(loadedCatalog);
        go("projects");
        setProjects(await launchKitApi.listProjects());
      } catch (cause) {
        if (cause instanceof LaunchKitApiError && cause.status === 401) {
          clearAccessToken();
          setPage("login");
          setError("Your staging session expired. Sign in again to continue.");
          return;
        }
        setError(cause instanceof Error ? cause.message : "Could not load your projects.");
        go("projects");
      } finally {
        if (!cancelled) setBooting(false);
      }
    };
    void boot();
    return () => { cancelled = true; };
  }, [go]);

  useEffect(() => {
    if (build?.status === "completed" && page === "building") go("download");
  }, [build?.status, page, go]);

  // While a build is running in the background, keep the projects list statuses live
  // (quiet refresh, no loading spinner) so a returning user sees current progress.
  useEffect(() => {
    if (page !== "projects") return;
    const hasActiveBuild = projects.some(
      (item) =>
        item.latestBuildStatus &&
        ACTIVE_BUILD_STATUSES.has(item.latestBuildStatus as BuildView["status"]),
    );
    if (!hasActiveBuild) return;
    const timer = setInterval(() => {
      launchKitApi.listProjects().then(setProjects).catch(() => {
        // Keep the last known statuses when a poll fails; the next tick retries.
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [page, projects]);

  useEffect(() => {
    if (!build || !ACTIVE_BUILD_STATUSES.has(build.status)) return;

    const controller = new AbortController();
    void watchBuild(
      build,
      (next) => {
        if (controller.signal.aborted) return;
        setBuild(next);
        setError(null);
      },
      controller.signal,
    ).catch((cause) => {
      if (controller.signal.aborted) return;
      if (cause instanceof LaunchKitApiError && cause.status === 401) {
        clearAccessToken();
        setPage("login");
      }
      setError(cause instanceof Error ? cause.message : "Build status could not be refreshed.");
    });
    return () => controller.abort();
  }, [build?.id]);

  const perform = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (cause) {
      if (cause instanceof LaunchKitApiError && cause.status === 401) {
        clearAccessToken();
        setPage("login");
      }
      setError(cause instanceof Error ? cause.message : "The request could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  const ensureProject = async () => {
    if (project) return project;
    const savedProjectId = readSession(SESSION_KEYS.projectId);
    if (savedProjectId) {
      try {
        const savedProject = await launchKitApi.getProject(savedProjectId);
        setProject(savedProject);
        return savedProject;
      } catch (cause) {
        if (!(cause instanceof LaunchKitApiError) || cause.status !== 404) throw cause;
        removeSession(SESSION_KEYS.projectId);
      }
    }
    throw new LaunchKitApiError(
      "Create or open a website from your projects list first.",
      400,
      "project_required",
    );
  };

  const signIn = () => {
    beginInnovationCityLogin();
  };

  const createWebsite = () => perform(async () => {
    clearActiveProject();
    try {
      const created = await launchKitApi.createProject();
      writeSession(SESSION_KEYS.projectId, created.id);
      setProject(created);
      setMaxReachedStep(-1);
      go("questionnaire");
    } catch (cause) {
      if (cause instanceof LaunchKitApiError && cause.code === "generation_quota_exceeded") {
        setError(cause.message);
        await refreshProjects();
        go("projects");
        return;
      }
      throw cause;
    }
  });

  const openProject = (projectId: string) => perform(async () => {
    const loadedProject = await launchKitApi.getProject(projectId);
    writeSession(SESSION_KEYS.projectId, loadedProject.id);
    removeSession(SESSION_KEYS.operationId);
    setProject(loadedProject);
    setOperation(null);
    const loadedMockups = await launchKitApi.getMockups(projectId);
    setMockups(loadedMockups);
    let loadedBuild: BuildView | null = null;
    if (loadedProject.latestBuildId) {
      loadedBuild = await launchKitApi.getBuild(loadedProject.latestBuildId);
      setBuild(loadedBuild);
    } else {
      setBuild(null);
    }
    if (loadedProject.latestDeploymentId) {
      setDeployment(await launchKitApi.getDeployment(loadedProject.latestDeploymentId));
    } else {
      setDeployment(null);
    }
    const resume = resumePageForProject(loadedProject, loadedBuild, loadedMockups);
    setMaxReachedStep(resume.maxReachedStep);
    go(resume.page);
  });

  const returnToProjects = () => perform(async () => {
    clearActiveProject();
    await refreshProjects();
    go("projects");
  });

  const signOut = () => {
    void innovationCityLogout();
    clearAccessToken();
    clearActiveProject();
    setProjects([]);
    setError(null);
    go("login");
  };

  const saveBusiness = (form: QuestionnaireValues) => perform(async () => {
    const current = await ensureProject();
    const updated = await launchKitApi.patchProject(current.id, {
      business: {
        companyName: form.companyName,
        industry: form.industry,
        targetAudience: form.customers,
      },
      design: {
        tagline: form.tagline,
        cta: current.design.cta?.trim() || "Get Started",
      },
    });
    setProject(updated);
    setMaxReachedStep(Math.max(1, maxReachedStep));
    go("category-mood");
  });

  const uploadLogo = (file: File) => perform(async () => {
    const current = await ensureProject();
    await launchKitApi.uploadAsset(current.id, file, "logo");
    await refreshProject(current.id);
  });

  const uploadDocuments = (files: File[]) => perform(async () => {
    const current = await ensureProject();
    for (const file of files) {
      await launchKitApi.uploadAsset(current.id, file, "document");
    }
    await refreshProject(current.id);
  });

  const removeAsset = (assetId: string) => perform(async () => {
    const current = await ensureProject();
    await launchKitApi.deleteAsset(current.id, assetId);
    await refreshProject(current.id);
  });

  const applySummary = (summary: AiSummaryDraft) => perform(async () => {
    const current = await ensureProject();
    const extracted = current.extractedProfileFields ?? {};
    const overview = summary.companyOverview.trim();
    const services = summary.services.trim();
    const tone = summary.brandTone.trim();

    // Persist the full extract into business so mockups / v0 briefs get products,
    // contact, hours, testimonials, etc. — not only the five summary fields.
    const business: Record<string, string> = {
      companyName:
        pickExtracted(extracted.companyName, current.business.companyName) ||
        current.business.companyName,
      industry:
        pickExtracted(extracted.industry, current.business.industry) ||
        current.business.industry,
      targetAudience:
        summary.targetAudience.trim() ||
        pickExtracted(extracted.targetAudience, current.business.targetAudience),
      uvp: overview || pickExtracted(extracted.uvp, current.business.uvp),
      description: pickExtracted(extracted.description, overview),
      businessActivity: pickExtracted(extracted.businessActivity),
      activityCode: pickExtracted(extracted.activityCode),
      purpose: pickExtracted(extracted.purpose),
      competitors: pickExtracted(extracted.competitors),
      products: services || pickExtracted(extracted.products, extracted.businessActivity),
      locationHours: pickExtracted(extracted.locationHours),
      serviceArea: pickExtracted(extracted.serviceArea),
      contact: pickExtracted(extracted.contact),
      socials: pickExtracted(extracted.socials),
      tone: tone || pickExtracted(extracted.tone),
      aesthetic: pickExtracted(extracted.aesthetic),
      stats: pickExtracted(extracted.stats),
      testimonials: pickExtracted(extracted.testimonials),
      teamBios: pickExtracted(extracted.teamBios),
      certifications: pickExtracted(extracted.certifications),
      notes: pickExtracted(extracted.notes, current.business.notes),
    };
    const compactBusiness = Object.fromEntries(
      Object.entries(business).filter(([, value]) => value.trim().length > 0),
    );

    const updated = await launchKitApi.patchProject(current.id, {
      business: compactBusiness,
      design: {
        tagline:
          pickExtracted(extracted.tagline, current.design.tagline) ||
          current.design.tagline,
        cta: summary.mainCta.trim() || current.design.cta || "Get Started",
      },
    });
    setProject(updated);
  });

  const runAiSummary = (websiteUrl?: string) => perform(async () => {
    const current = await ensureProject();
    const documents = current.uploadedAssets.filter((asset) => asset.kind === "profile_source");
    const trimmed = (websiteUrl ?? "").trim();
    // Combined discovery: scrape URL first (optional), then every brand document (optional).
    if (!trimmed && !documents.length) return;
    const queued = await launchKitApi.extractFromWebsite(current.id, trimmed || null);
    setOperation(queued);
    await waitForOperation(queued.id, setOperation);
    await refreshProject(current.id);
  });

  const saveDesign = (categoryId: string, moodId: string, animationId: string) => perform(async () => {
    const current = await ensureProject();
    const updated = await launchKitApi.patchProject(current.id, {
      business: { categoryId },
      design: { moodId, animationId },
    });
    setProject(updated);
    setMaxReachedStep(Math.max(2, maxReachedStep));
    go("colors");
  });

  const saveColors = (
    paletteId: string,
    customPalette: CustomPaletteValues | null,
    fontPairingId: string,
    customFonts: { heading: string; body: string } | null,
  ) => perform(async () => {
    const current = await ensureProject();
    const updated = await launchKitApi.patchProject(current.id, {
      design: { paletteId, customPalette, fontPairingId, customFonts },
    });
    setProject(updated);
    setMaxReachedStep(Math.max(3, maxReachedStep));
    go("pick-pages");
  });

  const generateMockups = (layout: PageLayout) => perform(async () => {
    const current = await ensureProject();
    const updated = await launchKitApi.patchProject(current.id, { pageLayout: layout });
    setProject(updated);
    go("generating");
    const queued = await launchKitApi.createMockups(current.id, createIdempotencyKey("mockups"));
    writeSession(SESSION_KEYS.operationId, queued.id);
    setOperation(queued);
    await waitForOperation(queued.id, setOperation);
    removeSession(SESSION_KEYS.operationId);
    setMockups(await launchKitApi.getMockups(current.id));
    await refreshProject(current.id);
    go("preview");
  });

  const startBuild = (mockupId: string) => perform(async () => {
    const current = await ensureProject();
    await launchKitApi.selectMockup(current.id, mockupId);
    const queued = await launchKitApi.createBuild(current.id, createIdempotencyKey("build"));
    setProject({ ...current, selectedMockupId: mockupId, latestBuildId: queued.id });
    setBuild(queued);
    go("building");
  });

  const deploy = async () => {
    if (!build) return;
    if (deployment?.status === "ready_to_claim" && deployment.claimUrl) {
      window.open(deployment.claimUrl, "_blank", "noopener,noreferrer");
      return;
    }
    await perform(async () => {
      const queued = await launchKitApi.createDeployment(build.id, createIdempotencyKey("deployment"));
      setDeployment(queued);
      await waitForDeployment(queued.id, setDeployment);
    });
  };

  const goBack = () => {
    if (page === "questionnaire") {
      void returnToProjects();
      return;
    }
    const previous = previousPage(page);
    if (previous) go(previous);
  };

  const goToStep = (step: number) => {
    const target = stepTarget(page, step);
    if (target) go(target);
  };

  const completedSteps = completedUpTo(page, maxReachedStep);

  return {
    page,
    catalog,
    project,
    projects,
    projectsLoading,
    operation,
    mockups,
    build,
    deployment,
    busy,
    error,
    booting,
    completedSteps,
    setError,
    go,
    goBack,
    goToStep,
    signIn,
    signOut,
    createWebsite,
    openProject,
    refreshProjects,
    returnToProjects,
    saveBusiness,
    uploadLogo,
    uploadDocuments,
    removeAsset,
    applySummary,
    runAiSummary,
    saveDesign,
    saveColors,
    generateMockups,
    startBuild,
    deploy,
  };
}
