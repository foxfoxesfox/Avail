"use client";

// Any unexpected failure while rendering a page. The details stay in the server logs.
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pt-12 pb-16">
      <h1 className="text-[1.875rem] leading-tight font-bold tracking-[-0.02em]">Something went wrong</h1>
      <p className="mt-2 max-w-md text-ink-soft">Nothing you saved is lost. Try again, or come back in a minute.</p>
      <button type="button" onClick={reset}
        className="mt-6 rounded-full bg-indigo px-6 py-3.5 text-base font-bold text-white transition-colors duration-150 hover:bg-indigo-deep">
        Try again
      </button>
    </main>
  );
}
