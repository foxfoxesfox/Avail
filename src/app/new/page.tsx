import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { CreateForm } from "./create-form";

export const metadata: Metadata = { title: "New schedule" };

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

// Default dates depend on today, so this part renders per request.
async function Form() {
  await connection();
  const today = new Date();
  const twoWeeks = new Date(today.getTime() + 13 * 86_400_000);
  return (
    <CreateForm
      zones={[...Intl.supportedValuesOf("timeZone"), "UTC"]}
      defaults={{
        title: "",
        startDate: isoDay(today),
        endDate: isoDay(twoWeeks),
        weekdays: ["1", "2", "3", "4", "5"],
        startHour: "10",
        endHour: "22",
        slotMinutes: "60",
        timeZone: "Asia/Singapore",
        deadline: "",
        visibility: "names",
        members: "",
      }}
    />
  );
}

export default function NewSchedulePage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pt-8 pb-16">
      <h1 className="text-[1.875rem] leading-tight font-bold tracking-[-0.02em] text-balance">When is everyone free?</h1>
      <p className="mt-1 mb-7 text-ink-soft">Set the dates and hours, add people, then share one link.</p>
      <Suspense fallback={<div className="dot-grid h-96 rounded-[10px] border border-rule" />}>
        <Form />
      </Suspense>
    </main>
  );
}
