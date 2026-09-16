import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DownloadPage } from "./DownloadPage";
import { makeBuild, makeDeployment } from "@/app/test/fixtures";

const getBuildPreviewUrl = vi.fn();

vi.mock("@/app/launchkit-api", async () => {
  const actual = await vi.importActual<typeof import("@/app/launchkit-api")>(
    "@/app/launchkit-api",
  );
  return {
    ...actual,
    launchKitApi: {
      ...actual.launchKitApi,
      getBuildPreviewUrl: (...args: unknown[]) => getBuildPreviewUrl(...args),
      downloadBuild: vi.fn(),
    },
  };
});

describe("DownloadPage", () => {
  beforeEach(() => {
    getBuildPreviewUrl.mockReset();
    getBuildPreviewUrl.mockResolvedValue("https://demo-fresh.vusercontent.net/");
  });

  it("renders the success state with download and a deferred deploy action", async () => {
    render(
      <DownloadPage
        build={makeBuild()}
        deployment={null}
        onDeploy={vi.fn()}
        onBack={vi.fn()}
        busy={false}
      />,
    );

    expect(screen.getByText("Your website is ready!")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download" })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Open Vercel Claim/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTitle("Generated website preview")).toHaveAttribute(
        "src",
        "https://demo-fresh.vusercontent.net/",
      );
    });
  });

  it("disables download when the build has no archive", () => {
    render(
      <DownloadPage
        build={makeBuild({ downloadUrl: null })}
        deployment={null}
        onDeploy={vi.fn()}
        onBack={vi.fn()}
        busy={false}
      />,
    );

    expect(screen.getByRole("button", { name: "Download" })).toBeDisabled();
  });

  it("shows a Phase 2 message when claim is clicked and does not deploy", () => {
    const onDeploy = vi.fn();

    render(
      <DownloadPage
        build={makeBuild()}
        deployment={makeDeployment({ status: "ready_to_claim", claimUrl: "https://vercel.com/claim" })}
        onDeploy={onDeploy}
        onBack={vi.fn()}
        busy={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Open Vercel Claim/i }));

    expect(
      screen.getByText("This feature will be available in Phase 2 soon."),
    ).toBeInTheDocument();
    expect(onDeploy).not.toHaveBeenCalled();
  });

  it("embeds a Vercel live URL when the deployment is ready", async () => {
    render(
      <DownloadPage
        build={makeBuild({
          previewUrl: "https://demo.vusercontent.net/site",
          webUrl: "https://v0.app/chat/h721WuMRdWt",
        })}
        deployment={makeDeployment({
          status: "ready_to_claim",
          liveUrl: "https://northstar.vercel.app",
        })}
        onDeploy={vi.fn()}
        onBack={vi.fn()}
        busy={false}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTitle("Generated website preview")).toHaveAttribute(
        "src",
        "https://northstar.vercel.app",
      );
    });
  });
});
