"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { seedDatabase } from "@/lib/seed";

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  const loadAll = useStore((s) => s.loadAll);

  useEffect(() => {
    async function init() {
      const seeded = localStorage.getItem("planlegger_seeded");
      if (!seeded) {
        await seedDatabase();
        localStorage.setItem("planlegger_seeded", "1");
      }
      await loadAll();
    }
    init();
  }, [loadAll]);

  return <>{children}</>;
}
