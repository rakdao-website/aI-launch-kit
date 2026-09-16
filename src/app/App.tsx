import { ErrorToast } from "./components/common/ErrorToast";
import { Spinner } from "./components/common/Spinner";
import { useProjectSession } from "./hooks/useProjectSession";
import { BuildingPage } from "./pages/Building/BuildingPage";
import { CategoryMoodPage } from "./pages/CategoryMood/CategoryMoodPage";
import { ColorsFontsPage } from "./pages/ColorsFonts/ColorsFontsPage";
import { DownloadPage } from "./pages/Download/DownloadPage";
import { GeneratingPage } from "./pages/Generating/GeneratingPage";
import { LoginPage } from "./pages/Login/LoginPage";
import { PickPagesPage } from "./pages/PickPages/PickPagesPage";
import { PreviewPage } from "./pages/Preview/PreviewPage";
import { ProjectsPage } from "./pages/Projects/ProjectsPage";
import { QuestionnairePage } from "./pages/Questionnaire/QuestionnairePage";

export default function App() {
  const {
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
  } = useProjectSession();
  const isAuthPage = page === "login";
  const isHubPage = page === "projects";
  const needsProject = !isAuthPage && !isHubPage;
  const needsCatalog = needsProject;

  // Always hold the spinner through auth bootstrap. Otherwise SSO return
  // (?auth=success, no localStorage token yet) briefly paints the login page.
  if (booting) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: "#0b0b0b" }}>
        <Spinner size={48} borderWidth={3} />
      </div>
    );
  }

  if (!isAuthPage && !isHubPage && ((needsCatalog && !catalog) || (needsProject && !project))) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: "#0b0b0b" }}>
        <Spinner size={48} borderWidth={3} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", width: "100%", background: "#0b0b0b" }}>
      {/* Login is full-bleed. Wizard pages use ScaledPage for the 1440 content cap so
          the page scrollbar stays on the viewport edge instead of the centered column. */}
      {page === "login" && <LoginPage onNext={signIn} busy={busy} />}
      <ErrorToast message={error} onDismiss={() => setError(null)} />
      {page === "projects" && (
        <ProjectsPage
          projects={projects}
          loading={projectsLoading || booting}
          busy={busy}
          onCreate={createWebsite}
          onOpen={openProject}
          onRefresh={refreshProjects}
          onSignOut={signOut}
          onHome={() => {
            void returnToProjects();
          }}
        />
      )}
      {page === "questionnaire" && project && (
        <QuestionnairePage
          project={project}
          onSave={saveBusiness}
          onUploadLogo={uploadLogo}
          onUploadDocuments={uploadDocuments}
          onRemoveAsset={removeAsset}
          onApplySummary={applySummary}
          onRunAiSummary={runAiSummary}
          busy={busy}
          error={error}
          onBack={goBack}
          onStepClick={goToStep}
          completedUpTo={completedSteps}
          onSignOut={signOut}
          onHome={() => {
            void returnToProjects();
          }}
        />
      )}
      {page === "category-mood" && project && catalog && (
        <CategoryMoodPage
          project={project}
          catalog={catalog}
          onSave={saveDesign}
          busy={busy}
          onBack={goBack}
          onStepClick={goToStep}
          completedUpTo={completedSteps}
          onSignOut={signOut}
          onHome={() => {
            void returnToProjects();
          }}
        />
      )}
      {page === "colors" && project && catalog && (
        <ColorsFontsPage
          project={project}
          catalog={catalog}
          onSave={saveColors}
          busy={busy}
          onBack={goBack}
          onStepClick={goToStep}
          completedUpTo={completedSteps}
          onSignOut={signOut}
          onHome={() => {
            void returnToProjects();
          }}
        />
      )}
      {page === "pick-pages" && project && catalog && (
        <PickPagesPage
          project={project}
          catalog={catalog}
          onGenerate={generateMockups}
          busy={busy}
          onBack={goBack}
          onStepClick={goToStep}
          completedUpTo={completedSteps}
          onSignOut={signOut}
          onHome={() => {
            void returnToProjects();
          }}
        />
      )}
      {page === "generating" && (
        <GeneratingPage
          operation={operation}
          error={error}
          onRetry={() => project && void generateMockups(project.pageLayout)}
          onSignOut={signOut}
          onHome={() => {
            void returnToProjects();
          }}
        />
      )}
      {page === "preview" && project && (
        <PreviewPage
          mockups={mockups}
          selectedMockupId={project.selectedMockupId}
          onConfirm={startBuild}
          busy={busy}
          onBack={() => go("pick-pages")}
          onSignOut={signOut}
          onHome={() => {
            void returnToProjects();
          }}
        />
      )}
      {page === "building" && (
        <BuildingPage
          build={build}
          error={error}
          onBack={() => go("preview")}
          onProjects={() => {
            void returnToProjects();
          }}
          onSignOut={signOut}
        />
      )}
      {page === "download" && build?.status === "completed" && (
        <DownloadPage
          build={build}
          deployment={deployment}
          onDeploy={deploy}
          busy={busy}
          onBack={() => {
            void returnToProjects();
          }}
          onSignOut={signOut}
          onHome={() => {
            void returnToProjects();
          }}
        />
      )}
    </div>
  );
}
