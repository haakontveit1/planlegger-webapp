"use client";
import { useState, useEffect } from "react";
import { todayISO } from "@/lib/utils";

interface WeatherPeriod { temp: number | null; symbol: string | null; precipitation: number }
interface WeatherData {
  current: { temp: number | null; windSpeed: number | null; symbol: string | null };
  dayRange: { tempMin: number | null; tempMax: number | null; precipitation: number };
  periods: { morning: WeatherPeriod; afternoon: WeatherPeriod; evening: WeatherPeriod; night: WeatherPeriod };
}

interface WeightLog { date: string; weightKg: number }

const SYMBOL_EMOJI: Record<string, string> = {
  clearsky_day: "☀️", clearsky_night: "🌙", clearsky_polartwilight: "🌅",
  fair_day: "🌤", fair_night: "🌤", fair_polartwilight: "🌤",
  partlycloudy_day: "⛅", partlycloudy_night: "⛅", partlycloudy_polartwilight: "⛅",
  cloudy: "☁️", fog: "🌫",
  lightrainshowers_day: "🌦", lightrainshowers_night: "🌧", lightrainshowers_polartwilight: "🌧",
  rainshowers_day: "🌧", rainshowers_night: "🌧",
  heavyrainshowers_day: "⛈", heavyrainshowers_night: "⛈",
  lightrain: "🌦", rain: "🌧", heavyrain: "⛈",
  lightsnowshowers_day: "🌨", snowshowers_day: "❄️",
  lightsnow: "🌨", snow: "❄️", heavysnow: "❄️",
  sleet: "🌧", lightsleet: "🌧",
  thunder: "⛈", heavyrainandthunder: "⛈",
};

function symbolEmoji(code: string | null) {
  if (!code) return "🌡";
  const base = code.replace(/_day|_night|_polartwilight/, "");
  return SYMBOL_EMOJI[code] ?? SYMBOL_EMOJI[base] ?? "🌡";
}

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("no-NO", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function getLastResetTime() {
  const now = new Date();
  const reset = new Date(now);
  reset.setHours(5, 0, 0, 0);
  if (now < reset) reset.setDate(reset.getDate() - 1);
  return reset;
}

const PERIODS = [
  { key: "morning",   label: "Morgen",       sub: "06–12" },
  { key: "afternoon", label: "Ettermiddag",  sub: "12–18" },
  { key: "evening",   label: "Kveld",        sub: "18–22" },
  { key: "night",     label: "Natt",         sub: "22–06" },
] as const;

export default function MorningPage() {
  const today = todayISO();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState(false);

  const [weightInput, setWeightInput] = useState("");
  const [loggedWeight, setLoggedWeight] = useState<string | null>(null);

  useEffect(() => {
    function fetchWeather(lat: number, lon: number) {
      fetch(`/api/weather?lat=${lat}&lon=${lon}`)
        .then(r => r.json())
        .then((d: WeatherData) => { setWeather(d); setWeatherLoading(false); })
        .catch(() => { setWeatherError(true); setWeatherLoading(false); });
    }

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        ()  => fetchWeather(59.9139, 10.7522),
        { timeout: 5000 }
      );
    } else {
      fetchWeather(59.9139, 10.7522);
    }
  }, []);

  // Load today's weight from DB first, fall back to localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("weight_log");
      if (stored) {
        const { weight: w, savedAt } = JSON.parse(stored);
        if (new Date(savedAt) >= getLastResetTime()) setLoggedWeight(w);
        else localStorage.removeItem("weight_log");
      }
    } catch {}

    fetch("/api/weight-logs")
      .then(r => r.json())
      .then((logs: WeightLog[]) => {
        const todayLog = logs.find(l => l.date === today);
        if (todayLog) {
          const w = String(todayLog.weightKg);
          setLoggedWeight(w);
          try { localStorage.setItem("weight_log", JSON.stringify({ weight: w, savedAt: new Date().toISOString() })); } catch {}
        }
      })
      .catch(() => {});
  }, [today]);

  function handleLogWeight(e: React.FormEvent) {
    e.preventDefault();
    if (!weightInput.trim()) return;
    const val = weightInput.trim();
    try { localStorage.setItem("weight_log", JSON.stringify({ weight: val, savedAt: new Date().toISOString() })); } catch {}
    fetch("/api/weight-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today, weightKg: parseFloat(val) }),
    }).catch(() => {});
    setLoggedWeight(val);
    setWeightInput("");
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-textPrimary">Morgen</h1>
        <p className="text-sm text-textMuted mt-1 capitalize">{formatDate(today)}</p>
      </div>

      {/* ── Weight ── */}
      <section className="bg-surface rounded-xl border border-border p-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-textMuted mb-4">Vekt</h2>
        <div className="flex items-center gap-6">
          <form onSubmit={handleLogWeight} className="flex items-center gap-2">
            <input
              type="number"
              step="0.1"
              min={0}
              value={weightInput}
              onChange={e => setWeightInput(e.target.value)}
              placeholder="0.0"
              className="input-base text-lg font-semibold text-center w-28"
              autoFocus
            />
            <span className="text-sm text-textMuted">kg</span>
            <button
              type="submit"
              disabled={!weightInput.trim()}
              className="px-4 py-2 rounded-lg bg-accent/15 text-accent hover:bg-accent/25 transition-colors text-sm font-semibold disabled:opacity-40"
            >
              Logg
            </button>
          </form>
          <div className="w-px bg-border self-stretch" />
          <div>
            <p className="text-xs text-textMuted mb-1">Dagens vekt</p>
            {loggedWeight
              ? <p className="text-2xl font-bold text-textPrimary">{loggedWeight} <span className="text-sm font-normal text-textMuted">kg</span></p>
              : <p className="text-textMuted text-sm">Ikke registrert i dag</p>
            }
          </div>
        </div>
      </section>

      {/* ── Weather ── */}
      <section className="bg-surface rounded-xl border border-border p-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-textMuted mb-4">Vær i dag</h2>

        {weatherLoading && <p className="text-sm text-textMuted">Henter værdata…</p>}
        {weatherError && <p className="text-sm text-textMuted">Kunne ikke hente værvarselet.</p>}

        {weather && !weatherLoading && (
          <>
            {/* Hero */}
            <div className="flex items-center gap-5 mb-5">
              <span className="text-6xl leading-none">{symbolEmoji(weather.current.symbol)}</span>
              <div>
                <p className="text-5xl font-bold text-textPrimary leading-none">
                  {weather.current.temp != null ? `${weather.current.temp}°` : "–"}
                </p>
                <div className="flex items-center gap-3 mt-2 text-sm text-textMuted flex-wrap">
                  {weather.dayRange.tempMin != null && weather.dayRange.tempMax != null && (
                    <span>↓ {weather.dayRange.tempMin}° / ↑ {weather.dayRange.tempMax}°</span>
                  )}
                  {weather.current.windSpeed != null && (
                    <span>💨 {weather.current.windSpeed} m/s</span>
                  )}
                  {weather.dayRange.precipitation > 0
                    ? <span>🌧 {weather.dayRange.precipitation} mm i dag</span>
                    : <span>☂️ Ingen nedbør i dag</span>
                  }
                </div>
              </div>
            </div>

            {/* Period cards */}
            <div className="grid grid-cols-4 gap-3">
              {PERIODS.map(({ key, label, sub }) => {
                const p = weather.periods[key];
                return (
                  <div key={key} className="flex flex-col items-center gap-1.5 bg-background rounded-xl border border-border px-2 py-3">
                    <p className="text-xs font-semibold text-textSecondary">{label}</p>
                    <p className="text-xs text-textMuted">{sub}</p>
                    <span className="text-2xl leading-none mt-1">{symbolEmoji(p.symbol)}</span>
                    <p className="text-base font-bold text-textPrimary">
                      {p.temp != null ? `${p.temp}°` : "–"}
                    </p>
                    {p.precipitation > 0
                      ? <p className="text-xs text-blue-400">{p.precipitation} mm</p>
                      : <p className="text-xs text-textMuted/40">–</p>
                    }
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
