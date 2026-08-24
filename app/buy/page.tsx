"use client";
import { useState, useEffect, useRef } from "react";
import { newId, now } from "@/lib/utils";

interface BuyItem {
  id: string;
  name: string;
  isRange: boolean;
  priceEstimate: number | null;
  priceMin: number | null;
  priceMax: number | null;
  createdAt: string;
}

function formatPrice(item: BuyItem): string | null {
  if (item.isRange && (item.priceMin !== null || item.priceMax !== null)) {
    const lo = item.priceMin?.toLocaleString("nb-NO") ?? "?";
    const hi = item.priceMax?.toLocaleString("nb-NO") ?? "?";
    return `${lo} – ${hi} kr`;
  }
  if (!item.isRange && item.priceEstimate !== null) {
    return `~${item.priceEstimate.toLocaleString("nb-NO")} kr`;
  }
  return null;
}

export default function BuyPage() {
  const [items, setItems] = useState<BuyItem[]>([]);
  const [name, setName] = useState("");
  const [isRange, setIsRange] = useState(false);
  const [estimate, setEstimate] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/buy-items").then((r) => r.json()).then(setItems);
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const item: BuyItem = {
      id: newId(),
      name: name.trim(),
      isRange,
      priceEstimate: !isRange && estimate !== "" ? Number(estimate) : null,
      priceMin: isRange && priceMin !== "" ? Number(priceMin) : null,
      priceMax: isRange && priceMax !== "" ? Number(priceMax) : null,
      createdAt: now(),
    };
    await fetch("/api/buy-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    setItems((prev) => [...prev, item]);
    setName("");
    setEstimate("");
    setPriceMin("");
    setPriceMax("");
    nameRef.current?.focus();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/buy-items/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const hasAnyPrice = items.some(
    (i) => i.priceEstimate !== null || i.priceMin !== null || i.priceMax !== null
  );
  const totalMin = items.reduce((sum, item) => {
    if (item.isRange) return sum + (item.priceMin ?? 0);
    return sum + (item.priceEstimate ?? 0);
  }, 0);
  const totalMax = items.reduce((sum, item) => {
    if (item.isRange) return sum + (item.priceMax ?? item.priceMin ?? 0);
    return sum + (item.priceEstimate ?? 0);
  }, 0);
  const hasRange = items.some((i) => i.isRange && i.priceMin !== null && i.priceMax !== null);

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-textPrimary">Things to buy</h1>
        <p className="text-sm text-textMuted mt-1">Capture what you want to buy with a price estimate</p>
      </div>

      {/* Add form */}
      <div className="bg-surface rounded-xl border border-border p-5 mb-8">
        <form onSubmit={handleAdd} className="space-y-4">
          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What do you want to buy?"
            className="input-base w-full"
            autoFocus
          />

          {/* Price type toggle */}
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-border overflow-hidden text-sm shrink-0">
              <button
                type="button"
                onClick={() => setIsRange(false)}
                className={`px-4 py-2 transition-colors ${
                  !isRange ? "bg-accent text-white font-semibold" : "text-textSecondary hover:text-textPrimary"
                }`}
              >
                Estimate
              </button>
              <button
                type="button"
                onClick={() => setIsRange(true)}
                className={`px-4 py-2 transition-colors ${
                  isRange ? "bg-accent text-white font-semibold" : "text-textSecondary hover:text-textPrimary"
                }`}
              >
                Range
              </button>
            </div>
            <span className="text-xs text-textMuted">
              {isRange ? "Set a low and high end" : "Your best guess"}
            </span>
          </div>

          {/* Price input(s) */}
          <div className="flex gap-3 items-end">
            {!isRange ? (
              <div className="flex-1 relative">
                <input
                  type="number"
                  value={estimate}
                  onChange={(e) => setEstimate(e.target.value)}
                  placeholder="0"
                  className="input-base w-full pr-10"
                  min={0}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-textMuted pointer-events-none">kr</span>
              </div>
            ) : (
              <>
                <div className="flex-1">
                  <label className="text-xs text-textMuted mb-1.5 block">From</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={priceMin}
                      onChange={(e) => setPriceMin(e.target.value)}
                      placeholder="0"
                      className="input-base w-full pr-10"
                      min={0}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-textMuted pointer-events-none">kr</span>
                  </div>
                </div>
                <span className="text-textMuted pb-2.5 shrink-0">–</span>
                <div className="flex-1">
                  <label className="text-xs text-textMuted mb-1.5 block">To</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={priceMax}
                      onChange={(e) => setPriceMax(e.target.value)}
                      placeholder="0"
                      className="input-base w-full pr-10"
                      min={0}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-textMuted pointer-events-none">kr</span>
                  </div>
                </div>
              </>
            )}
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accentLight transition-colors disabled:opacity-40 shrink-0"
            >
              Add
            </button>
          </div>
        </form>
      </div>

      {/* Items list */}
      {items.length === 0 ? (
        <div className="text-center py-20 text-textMuted">
          <p className="text-4xl mb-4">🛍</p>
          <p className="text-lg mb-1">Nothing on the list yet</p>
          <p className="text-sm">Add items above to keep track of what you want to buy</p>
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-6">
            {items.map((item) => {
              const price = formatPrice(item);
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-4 bg-surface rounded-xl border border-border px-5 py-4 group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-base text-textPrimary font-medium">{item.name}</p>
                    {price && <p className="text-sm text-textMuted mt-0.5">{price}</p>}
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-textMuted hover:text-danger transition-colors opacity-0 group-hover:opacity-100 text-sm px-1 shrink-0"
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          {/* Total estimate */}
          {hasAnyPrice && totalMin > 0 && (
            <div className="bg-surfaceElevated rounded-xl border border-border px-5 py-4">
              <p className="text-xs text-textMuted mb-1">Estimated total</p>
              <p className="text-2xl font-bold text-textPrimary">
                {hasRange
                  ? `${totalMin.toLocaleString("nb-NO")} – ${totalMax.toLocaleString("nb-NO")} kr`
                  : `${totalMin.toLocaleString("nb-NO")} kr`}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
