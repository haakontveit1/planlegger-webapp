"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  {
    items: [
      { href: "/",           label: "Planner",     icon: "✦" },
      { href: "/backlog",    label: "Backlog",     icon: "◎" },
      { href: "/braindump",  label: "Brain Dump",  icon: "✎" },
    ],
  },
  {
    items: [
      { href: "/projects", label: "Projects",  icon: "◈" },
      { href: "/growth",   label: "Growth",    icon: "↑" },
    ],
  },
  {
    items: [
      { href: "/calendar", label: "Calendar",  icon: "◻" },
      { href: "/workout",  label: "Workout",   icon: "▣" },
      { href: "/buy",      label: "Buy",       icon: "◎" },
      { href: "/stats",    label: "Stats",     icon: "▦" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <aside className="w-60 h-screen bg-surface border-r border-border flex flex-col shrink-0">
      <div className="px-6 py-6 border-b border-border">
        <span className="text-xl font-bold text-textPrimary tracking-tight">Planlegger</span>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto space-y-1">
        {sections.map((section, si) => (
          <div key={si} className={si > 0 ? "pt-3 mt-3 border-t border-border/50" : ""}>
            {section.items.map(({ href, label, icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-base font-medium transition-colors duration-100 ${
                    active
                      ? "bg-accent/15 text-accent"
                      : "text-textSecondary hover:text-textPrimary hover:bg-white/5"
                  }`}
                >
                  <span className="text-base w-5 text-center leading-none opacity-80">{icon}</span>
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-border">
        <p className="text-xs text-textMuted">Personal planner v1.0</p>
      </div>
    </aside>
  );
}
