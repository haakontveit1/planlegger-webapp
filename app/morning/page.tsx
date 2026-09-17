"use client";
import { useState, useEffect } from "react";
import { todayISO } from "@/lib/utils";

interface WeatherSlot {
  time: string;
  temp: number | null;
  windSpeed: number | null;
  precipitation: number | null;
  symbol: string | null;
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

function fmtHour(iso: string) {
  return new Date(iso).toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });
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

export default function MorningPage() {
  const today = todayISO();
  const [weather, setWeather] = useState<WeatherSlot[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState(false);

  const [weightInput, setWeightInput] = useState("");
  const [loggedWeight, setLoggedWeight] = useState<string | null>(null);

  // Load weather using browser geolocation, fallback to Oslo
  useEffect(() => {
    function fetchWeather(lat: number, lon: number) {
      fetch(`/api/weather?lat=${lat}&lon=${lon}`)
        .then(r => r.json())
        .then((data: WeatherSlot[]) => { setWeather(data); setWeatherLoading(false); })
        .catch(() => { setWeatherError(true); setWeatherLoading(false); });
    }

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fetchWeather(59.9139, 10.7522),
        { timeout: 5000 }
      );
    } else {
      fetchWeather(59.9139, 10.7522);
    }
  }, []);

  // Load today's logged weight from DB (not just localStorage)
  useEffect(() => {
    // Check localStorage first (instant)
    try {
      const stored = localStorage.getItem("weight_log");
      if (stored) {
        const { weight: w, savedAt } = JSON.parse(stored);
        if (new Date(savedAt) >= getLastResetTime()) setLoggedWeight(w);
        else localStorage.removeItem("weight_log");
      }
    } catch {}

    // Then confirm with DB
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

  const now = new Date();
  const currentSlot = weather[0];
  const upcomingSlots = weather.slice(1, 8); // next 7 hours

  const totalPrecip = weather
    .slice(0, 8)
    .reduce((sum, s) => sum + (s.precipitation ?? 0), 0);

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
              onChange={(e) => setWeightInput(e.target.value)}
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

        {weatherLoading && (
          <p className="text-sm text-textMuted">Henterværdata…</p>
        )}

        {weatherError && (
          <p className="text-sm text-textMuted">Kunne ikke hente værvarselet.</p>
        )}

        {!weatherLoading && !weatherError && currentSlot && (
          <>
            {/* Current snapshot */}
            <div className="flex items-center gap-6 mb-6">
              <span className="text-6xl">{symbolEmoji(currentSlot.symbol)}</span>
              <div>
                <p className="text-4xl font-bold text-textPrimary">
                  {currentSlot.temp != null ? `${Math.round(currentSlot.temp)}°` : "–"}
                </p>
                <p className="text-sm text-textMuted mt-1">
                  {currentSlot.windSpeed != null && `Vind ${Math.round(currentSlot.windSpeed)} m/s`}
                  {totalPrecip > 0 && ` · Nedbør ${totalPrecip.toFixed(1)} mm neste 8t`}
                  {totalPrecip === 0 && " · Ingen nedbør neste 8t"}
                </p>
              </div>
            </div>

            {/* Hourly strip */}
            <div className="flex gap-3 overflow-x-auto pb-1">
              {upcomingSlots.map((slot) => (
                <div key={slot.time} className="flex flex-col items-center gap-1 shrink-0 min-w-[52px]">
                  <span className="text-xs text-textMuted">{fmtHour(slot.time)}</span>
                  <span className="text-xl">{symbolEmoji(slot.symbol)}</span>
                  <span className="text-sm font-semibold text-textPrimary">
                    {slot.temp != null ? `${Math.round(slot.temp)}°` : "–"}
                  </span>
                  {(slot.precipitation ?? 0) > 0 && (
                    <span className="text-xs text-blue-400">{slot.precipitation?.toFixed(1)}</span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
