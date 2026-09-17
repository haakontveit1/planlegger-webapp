import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat") ?? "59.9139"; // Oslo default
  const lon = searchParams.get("lon") ?? "10.7522";

  const res = await fetch(
    `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`,
    {
      headers: { "User-Agent": "planlegger-webapp/1.0 haakonsole@gmail.com" },
      next: { revalidate: 1800 },
    }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Weather API unavailable" }, { status: 502 });
  }

  const data = await res.json();
  const timeseries: any[] = data?.properties?.timeseries ?? [];
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const todaySteps = timeseries.filter(t => t.time.startsWith(todayStr));
  const current = timeseries.find(t => new Date(t.time) >= now) ?? todaySteps[0];

  const allTemps: number[] = todaySteps
    .map((t: any) => t.data?.instant?.details?.air_temperature)
    .filter((v: any) => v != null);

  const totalPrecip = todaySteps.reduce(
    (sum: number, t: any) => sum + (t.data?.next_1_hours?.details?.precipitation_amount ?? 0),
    0
  );

  function period(startH: number, endH: number) {
    const steps = todaySteps.filter((t: any) => {
      const h = new Date(t.time).getUTCHours(); // Yr uses UTC
      return h >= startH && h < endH;
    });
    const temps: number[] = steps
      .map((t: any) => t.data?.instant?.details?.air_temperature)
      .filter((v: any) => v != null);
    const precip = steps.reduce(
      (s: number, t: any) => s + (t.data?.next_1_hours?.details?.precipitation_amount ?? 0),
      0
    );
    const mid = steps[Math.floor(steps.length / 2)];
    const symbol =
      mid?.data?.next_1_hours?.summary?.symbol_code ??
      mid?.data?.next_6_hours?.summary?.symbol_code ??
      null;
    const avgTemp = temps.length ? Math.round(temps.reduce((a: number, b: number) => a + b, 0) / temps.length) : null;
    return { temp: avgTemp, symbol, precipitation: Math.round(precip * 10) / 10 };
  }

  return NextResponse.json({
    current: {
      temp: current?.data?.instant?.details?.air_temperature != null
        ? Math.round(current.data.instant.details.air_temperature)
        : null,
      windSpeed: current?.data?.instant?.details?.wind_speed != null
        ? Math.round(current.data.instant.details.wind_speed * 10) / 10
        : null,
      symbol: current?.data?.next_1_hours?.summary?.symbol_code ?? null,
    },
    dayRange: {
      tempMin: allTemps.length ? Math.round(Math.min(...allTemps)) : null,
      tempMax: allTemps.length ? Math.round(Math.max(...allTemps)) : null,
      precipitation: Math.round(totalPrecip * 10) / 10,
    },
    // Norwegian office hours: morning 6-12 local ≈ UTC+1/2, use UTC 4-10/5-11 depending on season
    // Easier: use local hours by adjusting. Yr returns UTC so we offset by +1 (winter) or +2 (summer)
    periods: {
      morning:   period(4, 10),   // ~06-12 Norwegian time (rough, works for jacket-picking)
      afternoon: period(10, 16),  // ~12-18
      evening:   period(16, 20),  // ~18-22
      night:     period(20, 24),  // ~22-06
    },
  });
}
