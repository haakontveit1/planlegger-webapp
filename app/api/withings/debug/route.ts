import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

export const dynamic = "force-dynamic";

export async function GET() {
  const result: Record<string, unknown> = {};

  // 1. Check token row
  try {
    const rows = await sql`SELECT user_id, expires_at, created_at FROM withings_tokens LIMIT 1`;
    if (rows.length === 0) {
      result.token = { status: "no_row" };
    } else {
      const row = rows[0];
      const expiresAt = new Date(row.expires_at as string);
      const msUntilExpiry = expiresAt.getTime() - Date.now();
      result.token = {
        status: "found",
        user_id: row.user_id,
        expires_at: row.expires_at,
        expired: msUntilExpiry < 0,
        expires_in_minutes: Math.round(msUntilExpiry / 60000),
      };
    }
  } catch (e) {
    result.token = { status: "db_error", error: String(e) };
  }

  // 2. Try token refresh if expired
  if ((result.token as { status: string }).status === "found") {
    try {
      const rows = await sql`SELECT * FROM withings_tokens LIMIT 1`;
      const row = rows[0];
      const expiresAt = new Date(row.expires_at as string);
      let accessToken: string = row.access_token as string;

      if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
        const refreshRes = await fetch("https://wbsapi.withings.net/v2/oauth2", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            action: "requesttoken",
            client_id: process.env.WITHINGS_CLIENT_ID!,
            client_secret: process.env.WITHINGS_CLIENT_SECRET!,
            grant_type: "refresh_token",
            refresh_token: row.refresh_token as string,
          }),
        });
        const refreshData = await refreshRes.json() as { status: number; body?: { access_token: string; refresh_token: string; expires_in: number } };
        result.token_refresh = { status: refreshData.status, ok: refreshData.status === 0 };
        if (refreshData.status === 0 && refreshData.body) {
          accessToken = refreshData.body.access_token;
          const newExpiresAt = new Date(Date.now() + refreshData.body.expires_in * 1000).toISOString();
          await sql`
            UPDATE withings_tokens
            SET access_token = ${accessToken}, refresh_token = ${refreshData.body.refresh_token}, expires_at = ${newExpiresAt}
            WHERE user_id = ${row.user_id as string}
          `;
        }
      } else {
        result.token_refresh = { status: "not_needed" };
      }

      // 3. Test a small Withings API call (last 7 days, first page only)
      const enddate = Math.floor(Date.now() / 1000);
      const startdate = enddate - 7 * 86400;
      const testRes = await fetch("https://wbsapi.withings.net/measure", {
        method: "POST",
        headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ action: "getmeas", startdate: String(startdate), enddate: String(enddate) }),
      });
      const testData = await testRes.json() as {
        status: number;
        body?: {
          measuregrps?: Array<{ date: number; measures: Array<{ type: number; value: number; unit: number }> }>;
          more?: number;
          offset?: number;
        };
      };

      result.withings_api = {
        http_status: testRes.status,
        api_status: testData.status,
        groups_returned: testData.body?.measuregrps?.length ?? 0,
        more: testData.body?.more ?? 0,
        offset: testData.body?.offset,
        types_seen: [...new Set(testData.body?.measuregrps?.flatMap(g => g.measures.map(m => m.type)) ?? [])].sort(),
        date_range_requested: { startdate, enddate, days: 7 },
        dates_in_response: testData.body?.measuregrps?.map(g => new Date(g.date * 1000).toISOString().split("T")[0]).sort() ?? [],
        raw_first_group: testData.body?.measuregrps?.[0] ?? null,
        error_if_any: testData.status !== 0 ? testData : undefined,
      };
    } catch (e) {
      result.withings_api = { status: "error", error: String(e) };
    }
  }

  // 4. Check what's in the DB
  try {
    const counts = await sql`
      SELECT type, COUNT(*) as count, MIN(date) as earliest, MAX(date) as latest
      FROM withings_measurements
      GROUP BY type
      ORDER BY type
    `;
    result.db_measurements = counts.map(r => ({
      type: r.type,
      count: Number(r.count),
      earliest: r.earliest,
      latest: r.latest,
    }));
  } catch (e) {
    result.db_measurements = { error: String(e) };
  }

  return NextResponse.json(result, { status: 200 });
}
