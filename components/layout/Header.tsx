"use client";

import { useEffect, useState } from "react";

export default function Header() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const updateClock = () => setNow(new Date());
    updateClock();

    const interval = window.setInterval(updateClock, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const dateLabel = now
    ? new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(now)
    : "Loading today’s date…";

  const timeLabel = now
    ? new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(now)
    : null;

  return (
    <header className="min-h-20 border-b border-slate-800 bg-slate-950 flex items-center justify-between px-8 py-4">
      <div>
        <h2 className="text-2xl font-semibold text-white">
          Today&apos;s Executive Brief
        </h2>

        <p className="text-slate-400">
          {dateLabel}
          {timeLabel ? ` · ${timeLabel}` : ""}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="font-semibold text-white">Scott Romine</p>

          <p className="text-slate-400 text-sm">Director of Data & AI</p>
        </div>

        <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white">
          SR
        </div>
      </div>
    </header>
  );
}
