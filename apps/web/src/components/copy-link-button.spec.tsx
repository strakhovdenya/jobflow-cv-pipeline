import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CopyLinkButton } from "./copy-link-button";

const URL_VALUE = "https://example.com/jobs/backend-dev";

function mockClipboard(writeText: ReturnType<typeof vi.fn> | undefined) {
  Object.defineProperty(navigator, "clipboard", {
    value: writeText === undefined ? undefined : { writeText },
    configurable: true,
  });
}

async function clickCopy() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Copy vacancy link" }));
  });
}

describe("CopyLinkButton", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    mockClipboard(undefined);
  });

  it("copies the url to the clipboard on click", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockClipboard(writeText);
    render(<CopyLinkButton url={URL_VALUE} />);

    await clickCopy();

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(URL_VALUE);
  });

  it("shows copy failed when the clipboard write is rejected", async () => {
    mockClipboard(vi.fn().mockRejectedValue(new Error("denied")));
    render(<CopyLinkButton url={URL_VALUE} />);

    await clickCopy();

    expect(screen.getByText("Copy failed")).toBeInTheDocument();
    expect(screen.queryByText("Link copied")).not.toBeInTheDocument();
  });

  it("shows copy failed when the clipboard api is unavailable", async () => {
    mockClipboard(undefined);
    render(<CopyLinkButton url={URL_VALUE} />);

    await clickCopy();

    expect(screen.getByText("Copy failed")).toBeInTheDocument();
  });

  it("keeps the confirmation visible before the timeout", async () => {
    mockClipboard(vi.fn().mockResolvedValue(undefined));
    render(<CopyLinkButton url={URL_VALUE} />);

    await clickCopy();
    act(() => {
      vi.advanceTimersByTime(1999);
    });

    expect(screen.getByText("Link copied")).toBeInTheDocument();
  });

  it("hides the confirmation after 2000 ms", async () => {
    mockClipboard(vi.fn().mockResolvedValue(undefined));
    render(<CopyLinkButton url={URL_VALUE} />);

    await clickCopy();
    expect(screen.getByText("Link copied")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByText("Link copied")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(screen.getByRole("button", { name: "Copy vacancy link" })).toBeInTheDocument();
  });

  it("exposes an accessible name and a status live region", async () => {
    mockClipboard(vi.fn().mockResolvedValue(undefined));
    render(<CopyLinkButton url={URL_VALUE} />);

    expect(screen.getByRole("button", { name: "Copy vacancy link" })).toBeInTheDocument();
    const status = screen.getByRole("status");
    expect(status).toBeEmptyDOMElement();

    await clickCopy();

    expect(status).toHaveTextContent("Link copied");
  });

  it("renders nothing for a whitespace-only url", () => {
    const { container } = render(<CopyLinkButton url="   " />);

    expect(container).toBeEmptyDOMElement();
  });
});
