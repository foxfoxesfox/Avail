import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-5 py-16">
      <h1 className="text-[2.5rem] leading-[1.05] font-bold tracking-[-0.03em] text-balance">When is everyone free?</h1>
      <p className="mt-3 max-w-md text-lg text-ink-soft">
        Share one link. Everyone marks their hours. See the best times at a glance.
      </p>
      <Link href="/new"
        className="mt-8 self-start rounded-full bg-indigo px-7 py-4 text-base font-bold text-white transition-colors duration-150 hover:bg-indigo-deep">
        Create a schedule
      </Link>
    </main>
  );
}
