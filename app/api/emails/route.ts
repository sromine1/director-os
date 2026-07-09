import { analyzeEmail } from "@/lib/directorAi";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecretKey) {
      return NextResponse.json(
        { error: "Missing Supabase environment variables" },
        { status: 500 }
      );
    }

    const analysis = await analyzeEmail({
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
      body: payload.body,
      receivedAt: payload.receivedAt,
      importance: payload.importance,
      hasAttachments: payload.hasAttachments,
    });

    const supabase = createClient(supabaseUrl, supabaseSecretKey);

    const { data, error } = await supabase
      .from("executive_briefs")
      .insert({
        source_message_id: payload.messageId,
        received_at: payload.receivedAt,
        sender: payload.from,
        recipients: payload.to,
        subject: payload.subject,
        body_text: payload.body,
        has_attachments: payload.hasAttachments,
        priority: analysis.priority,
        client: analysis.client,
        category: analysis.category,
        deadline: analysis.deadline,
        estimated_effort: analysis.estimatedEffort,
        executive_summary: analysis.summary,
        action_items: analysis.actionItems?.join("\n"),
        decisions_required: analysis.decisions?.join("\n"),
        risks: analysis.risks?.join("\n"),
        suggested_reply: analysis.reply,
        raw_ai_output: JSON.stringify(analysis),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      analysis,
    });
  } catch (error) {
    console.error("Email ingestion error:", error);

    return NextResponse.json(
      { error: "Invalid request or AI analysis failed" },
      { status: 400 }
    );
  }
}