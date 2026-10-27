import "server-only";

/** Checks a Cloudflare Turnstile token with Cloudflare. Tokens are single-use and expire after 5 minutes. */
export async function isHuman(token: string, ip: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  // shortcut: with no secret configured (local dev before setup) the check is skipped; set it on every deployment.
  if (!secret) return true;
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body }).catch(() => null);
  return r?.ok ? (await r.json()).success === true : false;
}
