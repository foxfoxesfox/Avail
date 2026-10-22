import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Zen_Kaku_Gothic_New } from "next/font/google";
import { NavSlot } from "./nav-slot";
import "./globals.css";

const zen = Zen_Kaku_Gothic_New({
  variable: "--font-zen",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Avail", template: "%s · Avail" },
  description: "Share one link, see when your team is free, and send the chosen time to everyone's calendar.",
};

export const viewport: Viewport = { themeColor: "#f4f6f5" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${zen.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="border-b border-rule">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
            <Link href="/" className="flex items-center gap-1.5 text-xl font-bold tracking-tight">
              Avail
              <span aria-hidden className="size-2.5 rounded-full bg-seal" />
            </Link>
            {/* The current path is request-time data under Cache Components. */}
            <Suspense fallback={<span className="text-sm font-medium text-ink-soft">New schedule</span>}>
              <NavSlot />
            </Suspense>
          </div>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
