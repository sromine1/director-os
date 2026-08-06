"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function setBriefCompleted(id: string, completed: boolean) {
  if (!UUID_PATTERN.test(id)) {
    return { success: false, message: "Invalid executive brief ID." };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    return { success: false, message: "Supabase is not configured." };
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey);
  const { error } = await supabase
    .from("executive_briefs")
    .update({ completed_at: completed ? new Date().toISOString() : null })
    .eq("id", id);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/");
  revalidatePath(`/briefs/${id}`);
  return { success: true, message: completed ? "Brief completed." : "Brief restored." };
}

export async function setBriefSnooze(id: string, preset: string | null) {
  if (!UUID_PATTERN.test(id)) {
    return { success: false, message: "Invalid executive brief ID." };
  }

  const snoozeUntil = getSnoozeUntil(preset);
  if (preset !== null && !snoozeUntil) {
    return { success: false, message: "Invalid snooze option." };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseSecretKey) {
    return { success: false, message: "Supabase is not configured." };
  }

  const { error } = await createClient(supabaseUrl, supabaseSecretKey)
    .from("executive_briefs")
    .update({ snooze_until: snoozeUntil?.toISOString() ?? null })
    .eq("id", id);

  if (error) return { success: false, message: error.message };

  revalidatePath("/");
  revalidatePath(`/briefs/${id}`);
  return {
    success: true,
    message: snoozeUntil ? `Snoozed until ${snoozeUntil.toISOString()}.` : "Brief restored.",
  };
}

export async function setBriefPinned(id: string, pinned: boolean) {
  if (!UUID_PATTERN.test(id)) {
    return { success: false, message: "Invalid executive brief ID." };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseSecretKey) {
    return { success: false, message: "Supabase is not configured." };
  }

  const { error } = await createClient(supabaseUrl, supabaseSecretKey)
    .from("executive_briefs")
    .update({ pinned })
    .eq("id", id);

  if (error) return { success: false, message: error.message };

  revalidatePath("/");
  revalidatePath(`/briefs/${id}`);
  return { success: true, message: pinned ? "Brief pinned." : "Brief unpinned." };
}

function getSnoozeUntil(preset: string | null) {
  if (preset === null) return null;

  const durations: Record<string, number> = {
    later_today: 3 * 60 * 60 * 1000,
    tomorrow: 24 * 60 * 60 * 1000,
    next_week: 7 * 24 * 60 * 60 * 1000,
  };
  const duration = durations[preset];
  return duration ? new Date(Date.now() + duration) : null;
}
