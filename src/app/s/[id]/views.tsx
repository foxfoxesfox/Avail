"use client";

import { useState } from "react";
import type { Schedule } from "@/lib/supabase";
import { Availability } from "./availability";
import { GroupGrid } from "./group";

const TABS = [
  { id: "mine", label: "Your times" },
  { id: "all", label: "Everyone" },
] as const;

// Share page: members switch between painting their own times and seeing the group totals.
export function Views({ s }: { s: Schedule }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("mine");
  return (
    <>
      <div role="tablist" aria-label="View" className="mt-6 flex gap-1.5">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors duration-150 ${tab === t.id ? "border-indigo bg-indigo text-white" : "border-rule bg-sheet text-ink hover:border-indigo hover:text-indigo"}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "mine" ? <Availability s={s} /> : <GroupGrid s={s} />}
      </div>
    </>
  );
}
