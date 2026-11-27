import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiValidationError,
  forkWorkspace,
  getComparison,
  getWorkspace,
  NotFoundApiError,
  runAnalysis,
} from "./api";

const fetchMock = vi.fn();

describe("getWorkspace", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getWorkspace maps 404 to NotFoundApiError", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));

    await expect(getWorkspace("ws-1")).rejects.toBeInstanceOf(NotFoundApiError);
  });

  it("getWorkspace maps 400 to NotFoundApiError", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 400 }));

    await expect(getWorkspace("garbage")).rejects.toBeInstanceOf(
      NotFoundApiError,
    );
  });

  it("getWorkspace rethrows other statuses as a generic error", async () => {
    for (const status of [500, 401, 503]) {
      fetchMock.mockResolvedValueOnce(new Response(null, { status }));

      const error = await getWorkspace("ws-1").catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(Error);
      expect(error).not.toBeInstanceOf(NotFoundApiError);
      expect((error as Error).message).toBe(
        `Fetching workspace failed with status ${status}`,
      );
    }
  });

  it("returns the parsed workspace on success", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "ws-1" }), { status: 200 }),
    );

    await expect(getWorkspace("ws-1")).resolves.toEqual({ id: "ws-1" });
  });
});

describe("compare-strategies endpoints (ISSUE-717)", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

  it("calls the fork, start and comparison endpoints", async () => {
    const input = {
      analysisStrategy: "c",
      contextLayout: "single",
      contextSourceSet: "full",
      carryOverRequirements: true,
      requestKey: "7d3c2f4e-1b2a-4c5d-8e9f-0a1b2c3d4e5f",
    } as const;
    fetchMock
      .mockResolvedValueOnce(json({ id: "fork-1", isNew: true, status: "source_saved" }, 201))
      .mockResolvedValueOnce(json({ jobId: "job-1" }, 202))
      .mockResolvedValueOnce(json({ workspaceId: "ws/1", members: [] }));

    await expect(forkWorkspace("ws/1", input)).resolves.toMatchObject({ id: "fork-1", isNew: true });
    await expect(runAnalysis("fork-1")).resolves.toEqual({ jobId: "job-1" });
    await expect(getComparison("ws/1")).resolves.toMatchObject({ workspaceId: "ws/1" });

    const [forkUrl, forkInit] = fetchMock.mock.calls[0];
    expect(String(forkUrl).endsWith("/workspaces/ws%2F1/fork")).toBe(true);
    expect(forkInit.method).toBe("POST");
    expect(forkInit.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(forkInit.body)).toEqual(input);

    const [startUrl, startInit] = fetchMock.mock.calls[1];
    expect(String(startUrl).endsWith("/workspaces/fork-1/run-analysis")).toBe(true);
    expect(startInit.method).toBe("POST");

    const [comparisonUrl, comparisonInit] = fetchMock.mock.calls[2];
    expect(String(comparisonUrl).endsWith("/workspaces/ws%2F1/comparison")).toBe(true);
    expect(comparisonInit.method).toBeUndefined();
  });

  it("maps a refused fork and a failed comparison to ApiValidationError messages", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ statusCode: 409, message: "key used with other options", error: "Conflict" }, 409))
      .mockResolvedValueOnce(new Response(null, { status: 503 }));

    const forkError = await forkWorkspace("ws-1", {
      analysisStrategy: "b",
      contextLayout: "single",
      contextSourceSet: "full",
      carryOverRequirements: false,
      requestKey: "7d3c2f4e-1b2a-4c5d-8e9f-0a1b2c3d4e5f",
    }).catch((caught: unknown) => caught);
    expect(forkError).toBeInstanceOf(ApiValidationError);
    expect((forkError as ApiValidationError).messages).toEqual(["key used with other options"]);

    const comparisonError = await getComparison("ws-1").catch((caught: unknown) => caught);
    expect((comparisonError as ApiValidationError).messages).toEqual([
      "Fetching the comparison failed with status 503",
    ]);
  });
});
