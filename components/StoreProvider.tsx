"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  const loadAll = useStore((s) => s.loadAll);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return <>{children}</>;
}
