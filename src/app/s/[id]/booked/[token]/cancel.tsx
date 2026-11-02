"use client";

import { useState, useTransition } from "react";
import { flushSync } from "react-dom";
import { Confirm } from "../../../confirm";
import { cancelBooking } from "../../book-actions";

export function CancelBooking({ token }: { token: string }) {
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();
  if (asking) {
    return (
      <Confirm busy={pending} question="Cancel this booking? The time opens for others again." yes="Yes, cancel booking" busyYes="Cancelling…"
        onKeep={() => { flushSync(() => setAsking(false)); document.getElementById("cancel-booking")?.focus(); }}
        // This button goes away once cancelled; the heading (now "Booking cancelled") takes focus instead.
        onYes={() => start(async () => { await cancelBooking(token); document.getElementById("booking-title")?.focus(); })} />
    );
  }
  return (
    <button type="button" id="cancel-booking" onClick={() => setAsking(true)}
      className="rounded-full bg-indigo-wash px-5 py-3 text-sm font-bold text-indigo transition-colors duration-150 hover:bg-indigo-wash-hover">
      Cancel booking
    </button>
  );
}
