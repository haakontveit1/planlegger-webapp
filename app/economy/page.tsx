"use client";
import { useState, useEffect, useMemo } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

interface Expense {
  id: string;
  name: string;
  amountPerMonth: number;
  categoryId: string | null;
  createdAt: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const PALETTE = [
  "#7B72FF", "#F59E0B", "#34D399", "#F87171",
  "#60A5FA", "#A78BFA", "#38BDF8", "#FB923C",
];

const UNCATEGORIZED_COLOR = "#4B5563";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtKr(n: number) {
  return `kr ${Math.round(n).toLocaleString("no-NO")}`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EconomyPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses,   setExpenses]   = useState<Expense[]>([]);
  const [loading,    setLoading]    = useState(true);

  // Add expense form
  const [showExpenseForm,  setShowExpenseForm]  = useState(false);
  const [expenseName,      setExpenseName]      = useState("");
  const [expenseAmount,    setExpenseAmount]    = useState("");
  const [expenseCatId,     setExpenseCatId]     = useState<string | null>(null);
  const [expenseSaving,    setExpenseSaving]    = useState(false);

  // Add category form
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [catName,          setCatName]          = useState("");
  const [catColor,         setCatColor]         = useState(PALETTE[0]);
  const [catSaving,        setCatSaving]        = useState(false);

  // Edit category
  const [editingCatId,  setEditingCatId]  = useState<string | null>(null);
  const [editCatName,   setEditCatName]   = useState("");
  const [editCatColor,  setEditCatColor]  = useState(PALETTE[0]);
  const [editCatSaving, setEditCatSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/economy/categories").then(r => r.json()),
      fetch("/api/economy/expenses").then(r => r.json()),
    ]).then(([cats, exps]) => {
      setCategories(cats);
      setExpenses(exps);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // ── Derived data ────────────────────────────────────────────────────────────

  const totalMonthly = useMemo(
    () => expenses.reduce((s, e) => s + e.amountPerMonth, 0),
    [expenses],
  );

  const byCategory = useMemo(() => {
    const catMap = new Map<string, Category>(categories.map(c => [c.id, c]));
    const groups = new Map<string | null, { name: string; color: string; total: number; items: Expense[] }>();

    for (const cat of categories) {
      groups.set(cat.id, { name: cat.name, color: cat.color, total: 0, items: [] });
    }
    groups.set(null, { name: "Ukategorisert", color: UNCATEGORIZED_COLOR, total: 0, items: [] });

    for (const exp of expenses) {
      const key = exp.categoryId && catMap.has(exp.categoryId) ? exp.categoryId : null;
      const g = groups.get(key)!;
      g.total += exp.amountPerMonth;
      g.items.push(exp);
    }

    return Array.from(groups.entries())
      .filter(([, g]) => g.items.length > 0)
      .map(([id, g]) => ({ ...g, categoryId: id }))
      .sort((a, b) => b.total - a.total);
  }, [categories, expenses]);

  const pieData = byCategory.map(g => ({ name: g.name, value: g.total, color: g.color }));

  // ── Actions ─────────────────────────────────────────────────────────────────

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(expenseAmount);
    if (!expenseName.trim() || isNaN(amount) || amount <= 0) return;
    setExpenseSaving(true);
    try {
      await fetch("/api/economy/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          name: expenseName.trim(),
          amountPerMonth: amount,
          categoryId: expenseCatId || null,
        }),
      });
      const updated = await fetch("/api/economy/expenses").then(r => r.json());
      setExpenses(updated);
      setExpenseName("");
      setExpenseAmount("");
      setExpenseCatId(null);
      setShowExpenseForm(false);
    } catch {}
    setExpenseSaving(false);
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!catName.trim()) return;
    setCatSaving(true);
    try {
      await fetch("/api/economy/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: crypto.randomUUID(), name: catName.trim(), color: catColor }),
      });
      const updated = await fetch("/api/economy/categories").then(r => r.json());
      setCategories(updated);
      setCatName("");
      setCatColor(PALETTE[0]);
      setShowCategoryForm(false);
    } catch {}
    setCatSaving(false);
  }

  async function deleteExpense(id: string) {
    await fetch(`/api/economy/expenses?id=${id}`, { method: "DELETE" });
    setExpenses(prev => prev.filter(e => e.id !== id));
  }

  async function deleteCategory(id: string) {
    await fetch(`/api/economy/categories?id=${id}`, { method: "DELETE" });
    setCategories(prev => prev.filter(c => c.id !== id));
    if (editingCatId === id) setEditingCatId(null);
  }

  function startEditCategory(cat: Category) {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
    setEditCatColor(cat.color);
  }

  async function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCatId || !editCatName.trim()) return;
    setEditCatSaving(true);
    try {
      await fetch("/api/economy/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingCatId, name: editCatName.trim(), color: editCatColor }),
      });
      setCategories(prev => prev.map(c =>
        c.id === editingCatId ? { ...c, name: editCatName.trim(), color: editCatColor } : c
      ));
      setEditingCatId(null);
    } catch {}
    setEditCatSaving(false);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-textPrimary">Privat Økonomi</h1>
          <p className="text-sm text-textMuted mt-1">Månedlige utgifter og abonnementer</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => { setShowCategoryForm(v => !v); setShowExpenseForm(false); }}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
              showCategoryForm
                ? "border-accent/50 text-accent bg-accent/10"
                : "border-border text-textSecondary hover:text-textPrimary hover:bg-white/5"
            }`}
          >
            {showCategoryForm ? "Avbryt" : "+ Ny kategori"}
          </button>
          <button
            onClick={() => { setShowExpenseForm(v => !v); setShowCategoryForm(false); }}
            className="px-4 py-2 rounded-lg bg-accent/15 text-accent hover:bg-accent/25 text-sm font-semibold transition-colors"
          >
            {showExpenseForm ? "Avbryt" : "+ Legg til utgift"}
          </button>
        </div>
      </div>

      {/* New category form */}
      {showCategoryForm && (
        <form onSubmit={handleAddCategory} className="bg-surface rounded-xl border border-border p-5 space-y-4 animate-slide-up">
          <h3 className="text-base font-semibold text-textPrimary">Ny kategori</h3>
          <input
            type="text"
            value={catName}
            onChange={e => setCatName(e.target.value)}
            placeholder="Navn (f.eks. Streaming, Mat, Transport)"
            className="input-base"
            autoFocus
            required
          />
          <div>
            <p className="text-xs text-textMuted mb-2">Farge</p>
            <div className="flex gap-2 flex-wrap">
              {PALETTE.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCatColor(c)}
                  className="w-7 h-7 rounded-full transition-transform hover:scale-110 shrink-0"
                  style={{ background: c, outline: catColor === c ? `3px solid ${c}` : "none", outlineOffset: "2px" }}
                />
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={!catName.trim() || catSaving}
            className="px-4 py-2 rounded-lg bg-accent/15 text-accent text-sm font-semibold hover:bg-accent/25 transition-colors disabled:opacity-40"
          >
            {catSaving ? "Oppretter…" : "Opprett kategori"}
          </button>
        </form>
      )}

      {/* New expense form */}
      {showExpenseForm && (
        <form onSubmit={handleAddExpense} className="bg-surface rounded-xl border border-border p-5 space-y-4 animate-slide-up">
          <h3 className="text-base font-semibold text-textPrimary">Legg til utgift</h3>
          <input
            type="text"
            value={expenseName}
            onChange={e => setExpenseName(e.target.value)}
            placeholder="Navn (f.eks. Netflix, Treningssenter, Husleie)"
            className="input-base"
            autoFocus
            required
          />
          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-40">
              <span className="text-textMuted text-sm shrink-0">kr</span>
              <input
                type="number"
                step="1"
                min="1"
                value={expenseAmount}
                onChange={e => setExpenseAmount(e.target.value)}
                placeholder="Beløp per måned"
                className="input-base flex-1"
                required
              />
              <span className="text-textMuted text-sm shrink-0">/mnd</span>
            </div>
            <select
              value={expenseCatId ?? ""}
              onChange={e => setExpenseCatId(e.target.value || null)}
              className="input-base flex-1 min-w-40"
            >
              <option value="">Ingen kategori</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          {categories.length === 0 && (
            <p className="text-xs text-textMuted">Tip: opprett kategorier først med &quot;+ Ny kategori&quot; for å organisere utgiftene.</p>
          )}
          <button
            type="submit"
            disabled={!expenseName.trim() || !expenseAmount || expenseSaving}
            className="px-4 py-2 rounded-lg bg-accent/15 text-accent text-sm font-semibold hover:bg-accent/25 transition-colors disabled:opacity-40"
          >
            {expenseSaving ? "Lagrer…" : "Lagre utgift"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-textMuted text-sm">Laster…</p>
      ) : expenses.length === 0 ? (
        <div className="text-center py-20 text-textMuted space-y-2">
          <p className="text-3xl font-bold text-textPrimary">kr 0</p>
          <p className="text-base font-medium mt-2">Ingen utgifter ennå</p>
          <p className="text-sm">Legg til abonnementer og månedlige betalinger ovenfor</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface rounded-xl border border-border p-5 text-center">
              <p className="text-xs text-textMuted mb-1">Per måned</p>
              <p className="text-xl font-bold text-textPrimary">{fmtKr(totalMonthly)}</p>
            </div>
            <div className="bg-surface rounded-xl border border-border p-5 text-center">
              <p className="text-xs text-textMuted mb-1">Per år</p>
              <p className="text-xl font-bold text-textPrimary">{fmtKr(totalMonthly * 12)}</p>
            </div>
            <div className="bg-surface rounded-xl border border-border p-5 text-center">
              <p className="text-xs text-textMuted mb-1">Antall poster</p>
              <p className="text-xl font-bold text-textPrimary">{expenses.length}</p>
            </div>
          </div>

          {/* Pie chart + category breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface rounded-xl border border-border p-5">
              <h2 className="text-sm font-semibold text-textPrimary mb-1">Fordeling</h2>
              <p className="text-xs text-textMuted mb-4">per kategori</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={88}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#1C1C1E", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v, name) => [`${fmtKr(Number(v))}/mnd`, name as string]}
                    labelStyle={{ display: "none" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-surface rounded-xl border border-border p-5">
              <h2 className="text-sm font-semibold text-textPrimary mb-1">Per kategori</h2>
              <p className="text-xs text-textMuted mb-4">{byCategory.length} grupper</p>
              <div className="space-y-3">
                {byCategory.map(g => {
                  const pct = totalMonthly > 0 ? Math.round((g.total / totalMonthly) * 100) : 0;
                  return (
                    <div key={g.categoryId ?? "none"}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: g.color }} />
                        <span className="text-sm text-textPrimary flex-1">{g.name}</span>
                        <span className="text-xs text-textMuted">{pct}%</span>
                        <span className="text-sm font-semibold text-textPrimary">{fmtKr(g.total)}</span>
                      </div>
                      <div className="h-1 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: g.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Expense list grouped by category */}
          <div className="space-y-4">
            {byCategory.map(g => (
              <section key={g.categoryId ?? "none"} className="bg-surface rounded-xl border border-border overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-3 border-b border-border/50 bg-surfaceElevated/50">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: g.color }} />
                  <h3 className="text-sm font-semibold text-textPrimary flex-1">{g.name}</h3>
                  <span className="text-xs text-textMuted">{g.items.length} poster</span>
                  <span className="text-sm font-bold text-textPrimary ml-3">{fmtKr(g.total)}<span className="text-textMuted font-normal">/mnd</span></span>
                </div>
                <div className="divide-y divide-border/30">
                  {[...g.items].sort((a, b) => b.amountPerMonth - a.amountPerMonth).map(exp => (
                    <div key={exp.id} className="flex items-center gap-3 px-5 py-3 group">
                      <span className="flex-1 text-sm text-textPrimary">{exp.name}</span>
                      <span className="text-sm font-semibold text-textPrimary">
                        {fmtKr(exp.amountPerMonth)}<span className="text-textMuted font-normal">/mnd</span>
                      </span>
                      <button
                        onClick={() => deleteExpense(exp.id)}
                        className="text-textMuted hover:text-danger transition-colors opacity-0 group-hover:opacity-100 text-sm px-1 shrink-0"
                        title="Slett"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Category management */}
          {categories.length > 0 && (
            <section className="bg-surface rounded-xl border border-border p-5">
              <h2 className="text-sm font-semibold text-textPrimary mb-3">Kategorier</h2>
              <div className="space-y-1">
                {categories.map(cat => {
                  const isEditing = editingCatId === cat.id;
                  if (isEditing) {
                    return (
                      <form
                        key={cat.id}
                        onSubmit={handleSaveCategory}
                        className="p-3 bg-surfaceElevated rounded-xl border border-accent/30 space-y-3"
                      >
                        <input
                          type="text"
                          value={editCatName}
                          onChange={e => setEditCatName(e.target.value)}
                          className="input-base text-sm"
                          autoFocus
                          required
                        />
                        <div className="flex gap-2 flex-wrap">
                          {PALETTE.map(c => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setEditCatColor(c)}
                              className="w-6 h-6 rounded-full transition-transform hover:scale-110 shrink-0"
                              style={{ background: c, outline: editCatColor === c ? `3px solid ${c}` : "none", outlineOffset: "2px" }}
                            />
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={!editCatName.trim() || editCatSaving}
                            className="px-3 py-1.5 rounded-lg bg-accent/15 text-accent text-xs font-semibold hover:bg-accent/25 transition-colors disabled:opacity-40"
                          >
                            {editCatSaving ? "Lagrer…" : "Lagre"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCatId(null)}
                            className="px-3 py-1.5 rounded-lg text-textMuted text-xs hover:text-textSecondary transition-colors"
                          >
                            Avbryt
                          </button>
                        </div>
                      </form>
                    );
                  }
                  return (
                    <div key={cat.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent hover:border-border hover:bg-white/5 group transition-colors">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: cat.color }} />
                      <span className="flex-1 text-sm text-textPrimary">{cat.name}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEditCategory(cat)}
                          className="text-textMuted hover:text-accent transition-colors text-sm px-2 py-1 rounded hover:bg-white/5"
                          title="Rediger"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => deleteCategory(cat.id)}
                          className="text-textMuted hover:text-danger transition-colors text-sm px-2 py-1 rounded hover:bg-white/5"
                          title="Slett"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
