import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS withings_tokens (
      user_id       TEXT PRIMARY KEY,
      access_token  TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      expires_at    TEXT NOT NULL,
      created_at    TEXT NOT NULL
    )
  `;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? new URL(req.url).origin;

  if (error || !code) {
    return NextResponse.redirect(`${base}/settings?withings=error`);
  }

  const clientId = process.env.WITHINGS_CLIENT_ID!;
  const clientSecret = process.env.WITHINGS_CLIENT_SECRET!;
  const redirectUri = `${base}/api/withings/callback`;

  const tokenRes = await fetch("https://wbsapi.withings.net/v2/oauth2", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      action: "requesttoken",
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  const tokenData = await tokenRes.json() as {
    status: number;
    body: { access_token: string; refresh_token: string; expires_in: number; userid: number };
  };

  if (tokenData.status !== 0) {
    return NextResponse.redirect(`${base}/settings?withings=error`);
  }

  const { access_token, refresh_token, expires_in, userid } = tokenData.body;
  const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

  await ensureTable();
  await sql`
    INSERT INTO withings_tokens (user_id, access_token, refresh_token, expires_at, created_at)
    VALUES (${String(userid)}, ${access_token}, ${refresh_token}, ${expiresAt}, ${new Date().toISOString()})
    ON CONFLICT (user_id) DO UPDATE SET
      access_token  = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      expires_at    = EXCLUDED.expires_at
  `;

  // Subscribe webhook for body measurements (appli=1)
  const webhookUrl = `${base}/api/withings/webhook`;
  await fetch("https://wbsapi.withings.net/notify", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Bearer ${access_token}`,
    },
    body: new URLSearchParams({
      action: "subscribe",
      callbackurl: webhookUrl,
      appli: "1",
    }),
  });

  return NextResponse.redirect(`${base}/settings?withings=connected`);
}
