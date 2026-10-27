import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pt-12 pb-16">
      <h1 className="text-[1.875rem] leading-tight font-bold tracking-[-0.02em]">This link doesn&apos;t work</h1>
      <p className="mt-2 max-w-md text-ink-soft">
        The schedule may have a new link, or the address was copied only in part. Ask the organizer for the current link.
      </p>
      <Link href="/" className="mt-6 inline-block rounded-full bg-indigo px-6 py-3.5 text-base font-bold text-white transition-colors duration-150 hover:bg-indigo-deep">
        Go to Avail
      </Link>
    </main>
  );
}
