/** Only same-site paths may be a post-sign-in destination (no "//evil.com" or absolute URLs). */
export function safeNext(next: string | null | undefined) {
  return next && /^\/(?!\/)[\w\-./]*$/.test(next) && !next.includes("..") ? next : "/";
}
