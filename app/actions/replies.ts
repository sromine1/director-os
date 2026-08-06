"use server";

import {
  generateExecutiveReply,
  isReplyTone,
  type ReplyBriefContext,
} from "@/lib/ai/draft-reply";
import { createClient } from "@supabase/supabase-js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function draftBriefReply(id: string, tone: string) {
  if (!UUID_PATTERN.test(id)) {
    return { success: false as const, message: "Invalid executive brief ID." };
  }
  if (!isReplyTone(tone)) {
    return { success: false as const, message: "Invalid reply tone." };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseSecretKey) {
    return { success: false as const, message: "Supabase is not configured." };
  }

  const { data, error } = await createClient(supabaseUrl, supabaseSecretKey)
    .from("executive_briefs")
    .select(
      "subject, sender, recipients, body_text, executive_summary, action_items, decisions_required, risks, suggested_reply, deadline, category",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) return { success: false as const, message: error.message };
  if (!data) return { success: false as const, message: "Executive brief not found." };

  try {
    const draft = await generateExecutiveReply(data as ReplyBriefContext, tone);
    return { success: true as const, draft };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Unable to generate a reply.",
    };
  }
}
