"use client";
import { useState, useRef } from "react";
import { useStore } from "@/lib/store";
import { newId, now } from "@/lib/utils";
import { ShoppingItem } from "@/lib/db";

export default function HandelistePage() {
  const shoppingItems = useStore((s) => s.shoppingItems);
  const addShoppingItem = useStore((s) => s.addShoppingItem);
  const toggleShoppingItem = useStore((s) => s.toggleShoppingItem);
  const deleteShoppingItem = useStore((s) => s.deleteShoppingItem);

  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const unchecked = shoppingItems.filter((i) => !i.checked);
  const checked = shoppingItems.filter((i) => i.checked);
  const allDone = shoppingItems.length > 0 && unchecked.length === 0;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const item: ShoppingItem = {
      id: newId(),
      text: input.trim(),
      checked: false,
      sortOrder: Date.now(),
      createdAt: now(),
    };
    await addShoppingItem(item);
    setInput("");
    inputRef.current?.focus();
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-6 md:py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-textPrimary">Handleliste</h1>
        <p className="text-sm text-textMuted mt-1">
          {shoppingItems.length === 0
            ? "Legg til ting du trenger å kjøpe"
            : allDone
            ? "Alt er handlet!"
            : `${unchecked.length} vare${unchecked.length !== 1 ? "r" : ""} igjen`}
        </p>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Legg til vare..."
          className="input-base flex-1 min-w-0"
          autoFocus
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accentLight transition-colors disabled:opacity-40 shrink-0"
        >
          Legg til
        </button>
      </form>

      {shoppingItems.length === 0 ? (
        <div className="text-center py-20 text-textMuted">
          <p className="text-4xl mb-4">🛒</p>
          <p className="text-lg mb-1">Handlelisten er tom</p>
          <p className="text-sm">Legg til varer ovenfor</p>
        </div>
      ) : (
        <div className="space-y-1">
          {unchecked.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3.5 bg-surface rounded-xl border border-border group">
              <button
                onClick={() => toggleShoppingItem(item.id)}
                className="w-5 h-5 rounded-full border-2 border-border hover:border-accent transition-colors shrink-0 flex items-center justify-center"
                aria-label="Merk som handlet"
              />
              <span className="flex-1 text-base text-textPrimary">{item.text}</span>
              <button
                onClick={() => deleteShoppingItem(item.id)}
                className="text-textMuted hover:text-danger transition-colors opacity-0 group-hover:opacity-100 shrink-0 px-1 text-sm"
              >
                ✕
              </button>
            </div>
          ))}

          {checked.length > 0 && (
            <>
              {unchecked.length > 0 && <div className="h-px bg-border/50 my-2" />}
              {checked.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3.5 bg-surface rounded-xl border border-border/40 group">
                  <button
                    onClick={() => toggleShoppingItem(item.id)}
                    className="w-5 h-5 rounded-full bg-success/20 border-2 border-success transition-colors shrink-0 flex items-center justify-center"
                    aria-label="Merk som ikke handlet"
                  >
                    <span className="text-success text-xs leading-none">✓</span>
                  </button>
                  <span className="flex-1 text-base text-textMuted line-through">{item.text}</span>
                  <button
                    onClick={() => deleteShoppingItem(item.id)}
                    className="text-textMuted hover:text-danger transition-colors opacity-0 group-hover:opacity-100 shrink-0 px-1 text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {allDone && (
        <div className="mt-8 text-center bg-success/10 border border-success/30 rounded-xl px-6 py-5">
          <p className="text-success font-semibold text-lg">Handleturen er ferdig!</p>
          <p className="text-sm text-textMuted mt-1">Oppgaven &quot;Handle på butikken&quot; er markert som fullført i planleggeren.</p>
        </div>
      )}
    </div>
  );
}
