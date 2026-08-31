import type { Metadata, Viewport } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import StoreProvider from "@/components/StoreProvider";
import ThemeProvider from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Planlegger",
  description: "Personal task planner",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-background text-textPrimary h-screen overflow-hidden flex flex-col md:flex-row">
        <ThemeProvider>
          <StoreProvider>
            <Sidebar />
            <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24 md:pb-0">
              {children}
            </main>
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
