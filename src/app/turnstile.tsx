"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global { interface Window { turnstile?: TurnstileApi } }

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/** Cloudflare's bot check, inside a form: usually invisible, a checkbox only when Cloudflare is unsure.
 *  It adds a hidden "cf-turnstile-response" field. Change `resetKey` after each submit (tokens are single-use). */
export function Turnstile({ resetKey }: { resetKey?: unknown }) {
  const box = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!SITE_KEY || !ready || !box.current || !window.turnstile) return;
    const id = window.turnstile.render(box.current, { sitekey: SITE_KEY, appearance: "interaction-only", theme: "light" });
    return () => window.turnstile?.remove(id);
  }, [ready, resetKey]);

  if (!SITE_KEY) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive"
        onReady={() => setReady(true)} />
      <div ref={box} className="empty:hidden" />
    </>
  );
}
