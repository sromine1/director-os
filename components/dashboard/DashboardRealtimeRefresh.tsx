"use client";

import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const REFRESH_DEBOUNCE_MS = 500;

export default function DashboardRealtimeRefresh() {
  const router = useRouter();

  useEffect(() => {
    let refreshTimer: number | undefined;
    const channel = supabase
      .channel("executive-briefs-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "executive_briefs" },
        () => {
          if (refreshTimer) window.clearTimeout(refreshTimer);
          refreshTimer = window.setTimeout(() => router.refresh(), REFRESH_DEBOUNCE_MS);
        },
      )
      .subscribe();

    return () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
