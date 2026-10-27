import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Zen_Kaku_Gothic_New } from "next/font/google";
import { NavSlot } from "./nav-slot";
import { AccountSlot } from "./account-slot";
import "./globals.css";

const zen = Zen_Kaku_Gothic_New({
  variable: "--font-zen",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

const description = "Share one link, see when your team is free, and send the chosen time to everyone's calendar.";

// Link previews (chat apps, social): the image comes from opengraph-image.tsx; pages without their own text use this.
export const metadata: Metadata = {
  metadataBase: new URL("https://avail.foxesvx.dev"),
  title: { default: "Avail", template: "%s · Avail" },
  description,
  openGraph: { siteName: "Avail", type: "website", description },
  twitter: { card: "summary_large_image" },
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
            <nav className="flex items-center gap-4">
              {/* The current path and the session are request-time data under Cache Components. */}
              <Suspense fallback={<span className="text-sm font-medium text-ink-soft">New schedule</span>}>
                <NavSlot />
              </Suspense>
              <Suspense fallback={null}>
                <AccountSlot />
              </Suspense>
            </nav>
          </div>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
        <footer className="border-t border-rule">
          <div className="mx-auto flex max-w-2xl gap-4 px-5 py-4 text-sm text-ink-soft">
            <Link href="/help" className="underline-offset-4 hover:text-ink hover:underline">Help</Link>
            <Link href="/privacy" className="underline-offset-4 hover:text-ink hover:underline">Privacy</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
