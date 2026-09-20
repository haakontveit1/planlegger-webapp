import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const clientId = process.env.WITHINGS_CLIENT_ID;
  if (!clientId) {
    return new NextResponse("WITHINGS_CLIENT_ID not set", { status: 500 });
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? new URL(req.url).origin;
  const redirectUri = `${base}/api/withings/callback`;

  const url = new URL("https://account.withings.com/oauth2_user/authorize2");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", "user.metrics");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", crypto.randomUUID());

  return NextResponse.redirect(url.toString());
}
