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
      .from("directoros_emails")
      .insert({
        source_message_id: body.source_message_id,
        received_at: body.received_at,
        sender: body.sender,
        recipients: body.recipients,
        subject: body.subject,
        body_text: body.body_text,
        has_attachments: body.has_attachments,
        priority: body.priority,
        client: body.client,
        category: body.category,
        deadline: body.deadline,
        estimated_effort: body.estimated_effort,
        executive_summary: body.executive_summary,
        action_items: body.action_items,
        decisions_required: body.decisions_required,
        risks: body.risks,
        suggested_reply: body.suggested_reply,
        raw_ai_output: body.raw_ai_output,
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