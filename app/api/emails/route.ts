import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecretKey) {
      return NextResponse.json(
        { error: "Missing Supabase environment variables" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseSecretKey);

    const { data, error } = await supabase
      .from("executive_briefs")
      .insert({
        received_at: body.receivedAt,
        sender: body.from,
        recipients: body.to,
        subject: body.subject,
        body_text: body.body,
        has_attachments: body.hasAttachments,
        priority: body.analysis?.priority,
        client: body.analysis?.client,
        category: body.analysis?.category,
        deadline: body.analysis?.deadline,
        estimated_effort: body.analysis?.estimatedEffort,
        executive_summary: body.analysis?.summary,
        action_items: body.analysis?.actionItems?.join("\n"),
        decisions_required: body.analysis?.decisions?.join("\n"),
        risks: body.analysis?.risks?.join("\n"),
        suggested_reply: body.analysis?.reply,
        raw_ai_output: JSON.stringify(body.analysis),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}