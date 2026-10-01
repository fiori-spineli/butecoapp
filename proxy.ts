import { NextResponse, type NextRequest } from "next/server";
import { gerarNonce, montarCsp } from "@/lib/csp";

export async function proxy(request: NextRequest) {
  // Proteção contra caminhos malformados
  try {
    decodeURIComponent(request.nextUrl.pathname);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const nonce = gerarNonce();
  const policy = montarCsp(nonce, process.env.NODE_ENV === "development");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
