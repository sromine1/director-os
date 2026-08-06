"use server";

import { getConnectedAccounts } from "@/lib/connectors/connected-accounts";
import { syncConnectedAccounts } from "@/lib/services/sync-connected-accounts";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export async function syncAllConnectedAccounts() {
  const accounts = getConnectedAccounts(await cookies());
  if (accounts.length === 0) {
    return { success: false, message: "Connect an email account before syncing." };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseSecretKey) {
    return { success: false, message: "Supabase is not configured." };
  }

  const result = await syncConnectedAccounts(
    createClient(supabaseUrl, supabaseSecretKey),
    accounts,
  );
  revalidatePath("/");

  const details = [...result.summaries, ...result.errors].join(" · ");
  return {
    success: result.summaries.length > 0,
    message: details || "Synchronization did not return a result.",
  };
}
