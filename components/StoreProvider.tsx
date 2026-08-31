"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  const loadAll = useStore((s) => s.loadAll);
  const isLoaded = useStore((s) => s.isLoaded);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  if (!isLoaded) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 h-full">
        <h1 className="text-4xl font-bold text-textPrimary tracking-tight">Planlegger</h1>
        <div className="flex gap-2">
          {[0, 150, 300].map((delay, i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-accent animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
