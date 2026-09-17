import { NextResponse } from "next/server";

// Proxy for Yr/met.no LocationForecast 2.0 (free, no key needed, requires User-Agent)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat") ?? "59.9139";  // Oslo default
  const lon = searchParams.get("lon") ?? "10.7522";

  const res = await fetch(
    `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`,
    {
      headers: {
        "User-Agent": "planlegger-webapp/1.0 haakonsole@gmail.com",
      },
      next: { revalidate: 1800 }, // cache 30 min
    }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Weather API unavailable" }, { status: 502 });
  }

  const data = await res.json();

  // Extract the next 12 time steps (hourly)
  const now = new Date();
  const timeseries: unknown[] = data?.properties?.timeseries ?? [];
  const upcoming = timeseries
    .filter((t: any) => new Date(t.time) >= now)
    .slice(0, 12)
    .map((t: any) => ({
      time: t.time,
      temp: t.data?.instant?.details?.air_temperature ?? null,
      windSpeed: t.data?.instant?.details?.wind_speed ?? null,
      precipitation: t.data?.next_1_hours?.details?.precipitation_amount ?? null,
      symbol: t.data?.next_1_hours?.summary?.symbol_code ?? null,
    }));

  return NextResponse.json(upcoming);
}
