import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearAccessToken,
  hasAccessToken,
  launchKitApi,
  setAccessToken,
  watchBuild,
} from "./launchkit-api";

describe("Launch Kit API authentication", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores and clears the staging access token", () => {
    expect(hasAccessToken()).toBe(false);
    setAccessToken("signed-token");
    expect(hasAccessToken()).toBe(true);
    clearAccessToken();
    expect(hasAccessToken()).toBe(false);
  });

  it("adds the bearer token to protected requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "prj_test" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    setAccessToken("signed-token");

    await launchKitApi.getProject("prj_test");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer signed-token");
  });

  it("lists projects for the authenticated user", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: "prj_one",
            status: "draft",
            companyName: "Northstar",
            latestBuildId: null,
            latestBuildStatus: null,
            previewUrl: null,
            downloadUrl: null,
            createdAt: "2026-07-15T00:00:00Z",
            updatedAt: "2026-07-15T00:00:00Z",
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    setAccessToken("signed-token");

    const projects = await launchKitApi.listProjects();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/projects$/);
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer signed-token");
    expect(projects[0]?.companyName).toBe("Northstar");
  });

  it("verifies the fixed account through the backend auth endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: "signed-token",
          tokenType: "bearer",
          expiresInSeconds: 28800,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const session = await launchKitApi.verifyAccessCode(
      "test@innovationcity.com",
      "847291",
    );

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/auth\/verify$/);
    expect(JSON.parse(String(init.body))).toEqual({
      email: "test@innovationcity.com",
      code: "847291",
    });
    expect(session.accessToken).toBe("signed-token");
  });

  it("watches build status through the authenticated SSE stream", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(
          'id: 4\nevent: status\ndata: {"id":4,"status":"completed","stage":"completed","message":"Build completed","createdAt":"2026-07-15T00:00:00Z"}\n\n',
        ));
        controller.close();
      },
    });
    const completedBuild = {
      id: "bld_test",
      projectId: "prj_test",
      provider: "v0",
      status: "completed" as const,
      stage: "completed",
      message: "Build completed",
      warnings: [],
      previewUrl: "https://example.com",
      webUrl: "https://example.com",
      downloadUrl: "/api/v1/builds/bld_test/download",
      retryAfterSeconds: null,
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(stream, { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(completedBuild), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));
    vi.stubGlobal("fetch", fetchMock);
    setAccessToken("signed-token");
    const updates: string[] = [];

    const result = await watchBuild(
      { ...completedBuild, status: "running", stage: "generating", message: "Generating" },
      (build) => updates.push(build.status),
      new AbortController().signal,
    );

    expect(result.status).toBe("completed");
    expect(updates).toEqual(["completed", "completed"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [streamUrl, streamInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(streamUrl).toMatch(/\/api\/v1\/builds\/bld_test\/events$/);
    expect(new Headers(streamInit.headers).get("Authorization")).toBe("Bearer signed-token");
  });

  it("loads protected preview assets with the bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("<html>preview</html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    setAccessToken("signed-token");

    const content = await launchKitApi.getAssetContent(
      "/api/v1/assets/ast_test/content",
    );

    expect(content).toBe("<html>preview</html>");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/assets\/ast_test\/content$/);
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer signed-token");
  });

  it("uploads brand documents with kind=document", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "ast_doc",
          kind: "profile_source",
          filename: "brief.pdf",
          label: "Brand document",
          contentType: "application/pdf",
          size: 12,
          previewUrl: "/api/v1/assets/ast_doc/content",
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    setAccessToken("signed-token");

    const file = new File(["hello world!"], "brief.pdf", { type: "application/pdf" });
    const asset = await launchKitApi.uploadAsset("prj_test", file, "document");

    expect(asset.kind).toBe("profile_source");
    expect(asset.filename).toBe("brief.pdf");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/projects\/prj_test\/assets$/);
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
    const body = init.body as FormData;
    expect(body.get("kind")).toBe("document");
    expect(body.get("file")).toBeInstanceOf(File);
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer signed-token");
  });
});
