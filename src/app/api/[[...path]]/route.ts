import { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  return proxy(request, await params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  return proxy(request, await params);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  return proxy(request, await params);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  return proxy(request, await params);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  return proxy(request, await params);
}

async function proxy(request: NextRequest, params: { path?: string[] }) {
  const path = params.path?.join("/") || "";
  const search = request.nextUrl.search || "";
  const url = `${BACKEND_URL}/api/${path}${search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (error) {
    return Response.json(
      {
        error: "backend_unavailable",
        message: error instanceof Error ? error.message : "upstream fetch failed",
      },
      { status: 502 }
    );
  }

  // Ver v1 CLAUDE.md: stripar content-length/encoding do upstream Express pra
  // evitar CURLE_HTTP2_STREAM quando o body ultrapassa ~1.8KB no Next 16.
  const outHeaders = new Headers(res.headers);
  outHeaders.delete("content-length");
  outHeaders.delete("content-encoding");
  outHeaders.delete("transfer-encoding");
  outHeaders.delete("connection");

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: outHeaders,
  });
}
