import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import StoreProvider from "@/components/StoreProvider";

export const metadata: Metadata = {
  title: "Planlegger",
  description: "Personal task planner",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-background text-textPrimary h-screen overflow-hidden flex">
        <StoreProvider>
          <Sidebar />
          <main className="flex-1 overflow-y-auto h-screen">
            {children}
          </main>
        </StoreProvider>
      </body>
    </html>
  );
}
