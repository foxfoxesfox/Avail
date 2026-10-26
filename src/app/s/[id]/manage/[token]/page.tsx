import type { Metadata } from "next";
import { Suspense } from "react";
import { Manage } from "../manage";

export const metadata: Metadata = { title: "Organizer", robots: { index: false, follow: false } };

async function Content({ params }: { params: PageProps<"/s/[id]/manage/[token]">["params"] }) {
  const { id, token } = await params;
  return <Manage shareId={id} token={token} />;
}

export default function ManagePage({ params }: PageProps<"/s/[id]/manage/[token]">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pt-8 pb-16">
      <Suspense fallback={<div className="dot-grid h-96 rounded-[10px] border border-rule" />}>
        <Content params={params} />
      </Suspense>
    </main>
  );
}
