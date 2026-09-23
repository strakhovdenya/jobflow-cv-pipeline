import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useArtifactJson } from "./use-artifact-json";

interface Payload {
  value: string;
}

const okResponse = (body: Payload) =>
  ({ ok: true, status: 200, json: async () => body }) as Response;

const failResponse = (status: number) =>
  ({ ok: false, status, json: async () => ({}) }) as Response;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useArtifactJson", () => {
  it("stays idle and does not fetch when the artifact id is null", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useArtifactJson<Payload>(null));

    expect(result.current).toEqual({ data: null, error: null, isLoading: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stays idle and does not fetch when disabled", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useArtifactJson<Payload>("a1", { enabled: false }),
    );

    expect(result.current).toEqual({ data: null, error: null, isLoading: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("loads data for the artifact", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okResponse({ value: "x" })));

    const { result } = renderHook(() => useArtifactJson<Payload>("a1"));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.data).toEqual({ value: "x" }));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("reports a non-OK response with the error label", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(failResponse(500)));

    const { result } = renderHook(() =>
      useArtifactJson<Payload>("a1", { errorLabel: "CV content" }),
    );

    await waitFor(() =>
      expect(result.current.error).toBe("Failed to load CV content (status 500)"),
    );
    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("reports a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const { result } = renderHook(() => useArtifactJson<Payload>("a1"));

    await waitFor(() => expect(result.current.error).toBe("network down"));
    expect(result.current.data).toBeNull();
  });

  it("discards the old response when the artifact id changes", async () => {
    let resolveFirst: (response: Response) => void = () => {};
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        () => new Promise<Response>((resolve) => (resolveFirst = resolve)),
      )
      .mockResolvedValueOnce(okResponse({ value: "second" }));
    vi.stubGlobal("fetch", fetchMock);

    const { result, rerender } = renderHook(
      ({ id }) => useArtifactJson<Payload>(id),
      { initialProps: { id: "a1" } },
    );

    rerender({ id: "a2" });
    resolveFirst(okResponse({ value: "first" }));

    await waitFor(() => expect(result.current.data).toEqual({ value: "second" }));
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  });

  it("aborts the request on unmount", () => {
    const fetchMock = vi.fn().mockReturnValue(new Promise(() => {}));
    vi.stubGlobal("fetch", fetchMock);

    const { unmount } = renderHook(() => useArtifactJson<Payload>("a1"));
    unmount();

    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  });

  it("never shows the previous artifact's data while the new one loads", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(okResponse({ value: "first" }))
        .mockReturnValueOnce(new Promise(() => {})),
    );

    const { result, rerender } = renderHook(
      ({ id }) => useArtifactJson<Payload>(id),
      { initialProps: { id: "a1" } },
    );
    await waitFor(() => expect(result.current.data).toEqual({ value: "first" }));

    rerender({ id: "a2" });

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });
});
