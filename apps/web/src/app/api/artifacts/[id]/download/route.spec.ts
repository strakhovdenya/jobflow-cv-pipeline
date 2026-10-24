import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const fetchMock = vi.fn();

const callGet = () =>
  GET(new NextRequest("http://localhost/api/artifacts/a-1/download"), {
    params: Promise.resolve({ id: "a-1" }),
  });

describe("artifact download proxy", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("passes the backend JSON message through", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ message: "Artifact is not ready" }, { status: 422 }),
    );

    const response = await callGet();

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ message: "Artifact is not ready" });
  });

  it("falls back to the generic message", async () => {
    const fallback = { message: "Fetching artifact failed with status 404" };

    fetchMock.mockResolvedValueOnce(
      new Response("<html>nope</html>", { status: 404 }),
    );
    const notJson = await callGet();
    expect(notJson.status).toBe(404);
    expect(await notJson.json()).toEqual(fallback);

    fetchMock.mockResolvedValueOnce(
      Response.json({ message: 42 }, { status: 404 }),
    );
    const nonStringMessage = await callGet();
    expect(nonStringMessage.status).toBe(404);
    expect(await nonStringMessage.json()).toEqual(fallback);
  });

  it("responds 502 when the backend is unreachable", async () => {
    fetchMock.mockRejectedValue(new Error("connect ECONNREFUSED"));

    const response = await callGet();

    expect(response.status).toBe(502);
    const body = (await response.json()) as { message: string };
    expect(body.message.startsWith("Backend unreachable")).toBe(true);
  });

  it("forwards content headers on success", async () => {
    fetchMock.mockResolvedValue(
      new Response("pdf-bytes", {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-disposition": 'attachment; filename="cv.pdf"',
        },
      }),
    );

    const response = await callGet();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="cv.pdf"',
    );
  });
});
