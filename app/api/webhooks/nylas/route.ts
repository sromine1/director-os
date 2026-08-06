import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getNylasMessage,
  isSpamMessage,
  listJunkFolderIds,
  type NylasMessage,
} from "@/lib/connectors/email/nylas/messages";
import { syncNylasMessagesToSupabase } from "@/lib/connectors/email/sync";

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
  folders?: string[];
  html_link?: string;
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

  let item: NylasMessage;
  if (sourceType === "email") {
    const [message, junkFolderIds] = await Promise.all([
      getNylasMessage(grantId, objectId),
      listJunkFolderIds(grantId),
    ]);

    if (isSpamMessage(message, junkFolderIds)) {
      const { error } = await supabase
        .from("executive_briefs")
        .delete()
        .eq("source_message_id", sourceMessageId)
        .eq("source_grant_id", grantId);
      if (error) throw new Error(`Unable to remove spam brief: ${error.message}`);
      return;
    }

    item = message;
  } else {
    item = mapWebhookEvent(object, notification.time);
  }

  await syncNylasMessagesToSupabase(supabase, [item], {
    provider,
    account: sourceAccount ?? undefined,
    grantId,
    reanalyze: eventType.endsWith(".updated"),
  });
}

function mapWebhookEvent(
  object: NylasObject,
  fallbackTime?: number,
): NylasMessage {
  const organizer = object.organizer ?? object.creator;
  const description = object.description?.trim();
  return {
    id: `calendar:${object.id}`,
    subject: object.title?.trim() || "Untitled meeting",
    snippet: description || "Calendar event",
    date: eventStart(object) ?? fallbackTime,
    from: organizer ? [{ name: organizer.name, email: organizer.email }] : [],
    to: object.participants?.map((participant) => ({
      name: participant.name,
      email: participant.email,
    })),
    webLink: object.html_link,
  };
}

async function findSourceAccount(
  supabase: SupabaseClient,
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
