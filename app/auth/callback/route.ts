import { NextResponse } from "next/server";

/** Old OAuth callback: no credentials or tokens are accepted after the Neon cutover. */
export async function GET(request: Request) {
  const url = new URL("/login?erro=google", request.url);
  return NextResponse.redirect(url, { status: 303 });
}
