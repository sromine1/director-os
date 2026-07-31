import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type Participant = {
  name?: string;
  email?: string;
  status?: string;
};

type NylasObject = {
  id?: string;
  grant_id?: string;
  object?: string;
  subject?: string;
  snippet?: string;
  body?: string;
  date?: number;
  created_at?: number;
  updated_at?: number;
  from?: Participant[];
  to?: Participant[];
  title?: string;
  description?: string;
  creator?: Participant;
  organizer?: Participant;
  participants?: Participant[];
  when?: {
    object?: string;
    start_time?: number;
    end_time?: number;
    time?: number;
    start_date?: string;
    date?: string;
  };
};

type NylasWebhook = {
  id?: string;
  type?: string;
  source?: string;
  time?: number;
  data?: {
    application_id?: string;
    object?: NylasObject;
  };
};

type ExistingSource = {
  source_account: string | null;
};

export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get("challenge");

  if (!challenge) {
    return new NextResponse("Missing challenge", { status: 400 });
  }

  // Nylas requires the exact challenge as plain text with no JSON wrapper.
  return new NextResponse(challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function POST(request: NextRequest) {
  const rawBody = Buffer.from(await request.arrayBuffer());
  const webhookSecret = process.env.NYLAS_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    console.error("NYLAS_WEBHOOK_SECRET is not configured.");
    return NextResponse.json(
      { error: "Webhook security is not configured." },
      { status: 503 },
    );
  }

  const signature = request.headers.get("x-nylas-signature");
  if (!signature || !verifySignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let notification: NylasWebhook;
  try {
    notification = JSON.parse(rawBody.toString("utf8")) as NylasWebhook;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  try {
    await processNotification(notification);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Unable to process Nylas webhook:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook processing failed." },
      { status: 500 },
    );
  }
}

function verifySignature(body: Buffer, signature: string, secret: string) {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;

  const expected = createHmac("sha256", secret).update(body).digest();
  const received = Buffer.from(signature, "hex");

  return received.length === expected.length && timingSafeEqual(received, expected);
}

async function processNotification(notification: NylasWebhook) {
  const eventType = normalizeEventType(notification.type);
  const object = notification.data?.object;
  const grantId = object?.grant_id;
  const objectId = object?.id;

  if (!eventType || !object || !grantId || !objectId) {
    console.info("Ignoring unsupported or incomplete Nylas notification", {
      type: notification.type,
      webhookId: notification.id,
    });
    return;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase server credentials are not configured.");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const provider = providerFromSource(notification.source);
  const sourceAccount = await findSourceAccount(supabase, grantId);
  const sourceType = eventType.startsWith("event.") ? "calendar" : "email";
  const sourceMessageId = sourceType === "calendar" ? `calendar:${objectId}` : objectId;

  if (eventType.endsWith(".deleted")) {
    const { error } = await supabase
      .from("executive_briefs")
      .delete()
      .eq("source_message_id", sourceMessageId)
      .eq("source_grant_id", grantId);

    if (error) throw new Error(`Unable to delete webhook item: ${error.message}`);
    return;
  }

  if (
    eventType !== "message.created" &&
    eventType !== "message.updated" &&
    eventType !== "event.created" &&
    eventType !== "event.updated"
  ) {
    return;
  }

  const record =
    sourceType === "calendar"
      ? mapCalendarRecord(object, provider, sourceAccount, grantId, notification)
      : mapMessageRecord(object, provider, sourceAccount, grantId, notification);

  const { data: existing, error: lookupError } = await supabase
    .from("executive_briefs")
    .select("id")
    .eq("source_message_id", sourceMessageId)
    .eq("source_grant_id", grantId)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`Unable to locate webhook item: ${lookupError.message}`);
  }

  if (existing?.id) {
    const { error } = await supabase
      .from("executive_briefs")
      .update(record)
      .eq("id", existing.id);
    if (error) throw new Error(`Unable to update webhook item: ${error.message}`);
  } else {
    const { error } = await supabase.from("executive_briefs").insert(record);
    if (error) throw new Error(`Unable to insert webhook item: ${error.message}`);
  }
}

function mapMessageRecord(
  object: NylasObject,
  provider: string,
  account: string | null,
  grantId: string,
  notification: NylasWebhook,
) {
  return {
    source_message_id: object.id,
    source_provider: provider,
    source_account: account,
    source_type: "email",
    source_grant_id: grantId,
    subject: object.subject?.trim() || "No subject",
    sender: formatParticipant(object.from?.[0], "Unknown sender"),
    recipients: formatParticipants(object.to),
    received_at: toIso(object.date ?? object.created_at ?? notification.time),
    body_text: cleanText(object.snippet ?? object.body),
    raw_ai_output: JSON.stringify({
      webhook_pending_analysis: true,
      webhook_event_type: notification.type,
      webhook_id: notification.id,
      source_provider: provider,
      source_account: account,
      source_type: "email",
      source_grant_id: grantId,
    }),
  };
}

function mapCalendarRecord(
  object: NylasObject,
  provider: string,
  account: string | null,
  grantId: string,
  notification: NylasWebhook,
) {
  return {
    source_message_id: `calendar:${object.id}`,
    source_provider: provider,
    source_account: account,
    source_type: "calendar",
    source_grant_id: grantId,
    subject: object.title?.trim() || "Untitled meeting",
    sender: formatParticipant(
      object.organizer ?? object.creator,
      "Calendar",
    ),
    recipients: formatParticipants(object.participants),
    received_at: toIso(eventStart(object) ?? notification.time),
    body_text: cleanText(object.description),
    category: "Calendar",
    raw_ai_output: JSON.stringify({
      webhook_pending_analysis: true,
      webhook_event_type: notification.type,
      webhook_id: notification.id,
      source_provider: provider,
      source_account: account,
      source_type: "calendar",
      source_grant_id: grantId,
    }),
  };
}

async function findSourceAccount(
  supabase: ReturnType<typeof createClient>,
  grantId: string,
) {
  const { data } = await supabase
    .from("executive_briefs")
    .select("source_account")
    .eq("source_grant_id", grantId)
    .not("source_account", "is", null)
    .limit(1)
    .maybeSingle();

  return (data as ExistingSource | null)?.source_account ?? null;
}

function normalizeEventType(type?: string) {
  if (!type) return "";
  const supportedPrefixes = [
    "message.created",
    "message.updated",
    "message.deleted",
    "event.created",
    "event.updated",
    "event.deleted",
  ];
  return supportedPrefixes.find((prefix) => type.startsWith(prefix)) ?? type;
}

function providerFromSource(source?: string) {
  const value = source?.toLowerCase() ?? "";
  if (value.includes("google")) return "google";
  if (value.includes("microsoft")) return "microsoft";
  return "unknown";
}

function eventStart(object: NylasObject) {
  const when = object.when;
  if (!when) return object.created_at;
  if (typeof when.start_time === "number") return when.start_time;
  if (typeof when.time === "number") return when.time;
  if (when.start_date) return Date.parse(`${when.start_date}T00:00:00Z`) / 1000;
  if (when.date) return Date.parse(`${when.date}T00:00:00Z`) / 1000;
  return object.created_at;
}

function toIso(timestamp?: number) {
  if (!timestamp || !Number.isFinite(timestamp)) return null;
  return new Date(timestamp * 1000).toISOString();
}

function formatParticipant(participant: Participant | undefined, fallback: string) {
  if (!participant) return fallback;
  if (participant.name && participant.email) {
    return `${participant.name} <${participant.email}>`;
  }
  return participant.name || participant.email || fallback;
}

function formatParticipants(participants?: Participant[]) {
  const value = (participants ?? [])
    .map((participant) => formatParticipant(participant, ""))
    .filter(Boolean)
    .join(", ");
  return value || null;
}

function cleanText(value?: string) {
  if (!value) return null;
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12000) || null;
}
