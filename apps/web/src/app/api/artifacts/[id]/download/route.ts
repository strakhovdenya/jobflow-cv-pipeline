import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

/**
 * Same-origin proxy for the backend's GET /artifacts/:id/download.
 * Required because that endpoint sits behind the global ApiKeyGuard (X-API-Key), which must
 * never reach the browser bundle — every backend call stays server-side.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const response = await fetch(
    `${API_BASE_URL}/artifacts/${encodeURIComponent(id)}/download`,
    {
      headers: { "X-API-Key": process.env.API_KEY ?? "" },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return NextResponse.json(
      { message: `Fetching artifact failed with status ${response.status}` },
      { status: response.status },
    );
  }

  const body = await response.arrayBuffer();
  const headers = new Headers();
  const contentType = response.headers.get("content-type");
  const contentDisposition = response.headers.get("content-disposition");
  if (contentType) headers.set("content-type", contentType);
  if (contentDisposition) headers.set("content-disposition", contentDisposition);

  return new NextResponse(body, { status: 200, headers });
}
