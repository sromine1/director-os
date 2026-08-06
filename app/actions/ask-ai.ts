"use server";

import {
  answerBriefQuestion,
  type BriefChatMessage,
} from "@/lib/ai/brief-chat";
import type { ReplyBriefContext } from "@/lib/ai/draft-reply";
import { createClient } from "@supabase/supabase-js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function askBriefAi(
  id: string,
  question: string,
  history: BriefChatMessage[],
) {
  const normalizedQuestion = question.trim();
  if (!UUID_PATTERN.test(id)) {
    return { success: false as const, message: "Invalid executive brief ID." };
  }
  if (!normalizedQuestion || normalizedQuestion.length > 2_000) {
    return { success: false as const, message: "Enter a question under 2,000 characters." };
  }
  if (!isValidHistory(history)) {
    return { success: false as const, message: "Invalid conversation history." };
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
    const answer = await answerBriefQuestion(
      data as ReplyBriefContext,
      normalizedQuestion,
      history,
    );
    return { success: true as const, answer };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Unable to answer the question.",
    };
  }
}

function isValidHistory(value: BriefChatMessage[]) {
  return (
    Array.isArray(value) &&
    value.length <= 8 &&
    value.every(
      (message) =>
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.length > 0 &&
        message.content.length <= 4_000,
    )
  );
}
