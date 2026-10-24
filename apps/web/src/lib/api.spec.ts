import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getWorkspace, NotFoundApiError } from "./api";

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
