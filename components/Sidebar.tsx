"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navGroups: { label: string | null; items: { href: string; label: string; icon: string }[] }[] = [
  {
    label: null,
    items: [
      { href: "/",         label: "Planner",  icon: "✦" },
      { href: "/projects", label: "Projects", icon: "◈" },
    ],
  },
  {
    label: "Shopping",
    items: [
      { href: "/handleliste", label: "Handleliste", icon: "◉" },
      { href: "/buy",         label: "Buy",         icon: "◎" },
    ],
  },
  {
    label: "Økonomi",
    items: [
      { href: "/economy", label: "Privat Økonomi", icon: "◈" },
    ],
  },
  {
    label: "Stats",
    items: [
      { href: "/stats",    label: "Garmin",          icon: "▦" },
      { href: "/withings", label: "Weight Tracking",  icon: "◈" },
      { href: "/workout",  label: "Treningsstyrke",  icon: "▣" },
    ],
  },
];

const wipItems = [
  { href: "/calendar", label: "Calendar", icon: "◻" },
  { href: "/backlog",  label: "Backlog",  icon: "⊞" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  function NavLink({ href, label, icon, muted, onNav }: {
    href: string; label: string; icon: string; muted?: boolean; onNav?: () => void;
  }) {
    const active = isActive(href);
    return (
      <Link
        href={href}
        onClick={onNav}
        className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-base font-medium transition-colors duration-100 ${
          active
            ? "bg-accent/15 text-accent"
            : muted
            ? "text-textMuted hover:text-textSecondary hover:bg-white/5"
            : "text-textSecondary hover:text-textPrimary hover:bg-white/5"
        }`}
      >
        <span className="text-base w-5 text-center leading-none opacity-80">{icon}</span>
        <span>{label}</span>
      </Link>
    );
  }

  function SidebarNav({ onNav }: { onNav?: () => void }) {
    return (
      <>
        <nav className="flex-1 py-4 overflow-y-auto flex flex-col">
          <div className="flex-1 space-y-4">
            {navGroups.map((group, i) => (
              <div key={i}>
                {group.label && (
                  <p className="px-6 pb-1 text-2xs font-bold tracking-widest uppercase text-textMuted/50">{group.label}</p>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink key={item.href} {...item} onNav={onNav} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-border/50">
            <p className="px-6 pb-1 text-2xs font-bold tracking-widest uppercase text-textMuted/50">WIP</p>
            <div className="space-y-0.5">
              {wipItems.map((item) => (
                <NavLink key={item.href} {...item} muted onNav={onNav} />
              ))}
            </div>
          </div>
        </nav>
        <div className="px-2 py-3 border-t border-border space-y-0.5">
          <NavLink href="/settings" label="Settings" icon="⚙" onNav={onNav} />
          <p className="px-4 py-1 text-xs text-textMuted/50">Personal planner v1.0</p>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Desktop sidebar — always visible */}
      <aside className="hidden md:flex w-60 h-screen bg-surface border-r border-border flex-col shrink-0">
        <div className="px-6 py-6 border-b border-border">
          <span className="text-xl font-bold text-textPrimary tracking-tight">Planlegger</span>
        </div>
        <SidebarNav />
      </aside>

      {/* Mobile header — static in document flow (not fixed) */}
      <div className="md:hidden h-14 bg-surface border-b border-border flex items-center px-4 gap-3 shrink-0">
        <button
          onClick={() => setMobileOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-textPrimary hover:bg-white/5 transition-colors text-xl leading-none"
          aria-label="Open menu"
        >
          ☰
        </button>
        <span className="text-base font-bold text-textPrimary tracking-tight">Planlegger</span>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <aside className="w-64 h-screen bg-surface border-r border-border flex flex-col shrink-0">
            <div className="px-6 py-6 border-b border-border flex items-center justify-between">
              <span className="text-xl font-bold text-textPrimary tracking-tight">Planlegger</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-textMuted hover:text-textPrimary text-xl leading-none p-1 -mr-1"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>
            <SidebarNav onNav={() => setMobileOpen(false)} />
          </aside>
          {/* Backdrop */}
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  );
}
