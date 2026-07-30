import { getNylasConfig } from "@/lib/connectors/email/nylas/config";
import type {
  NylasMessage,
  NylasParticipant,
} from "@/lib/connectors/email/nylas/messages";

export type NylasEventTime =
  | { object: "date"; date: string }
  | { object: "datespan"; start_date: string; end_date: string }
  | { object: "time"; time: number }
  | { object: "timespan"; start_time: number; end_time: number };

export type NylasEvent = {
  id: string;
  title?: string;
  description?: string;
  calendar_id?: string;
  when?: NylasEventTime;
  participants?: Array<NylasParticipant & { status?: string }>;
  organizer_email?: string;
  organizer_name?: string;
  location?: string;
  conferencing?: unknown;
  status?: string;
};

type NylasEventsResponse = {
  data?: NylasEvent[];
  next_cursor?: string | null;
  error?: { message?: string };
};

export async function listUpcomingEvents(
  grantId: string,
  options: {
    calendarId?: string;
    start?: Date;
    end?: Date;
    limit?: number;
  } = {},
) {
  const config = getNylasConfig();
  const now = options.start ?? new Date();
  const end = options.end ?? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const url = new URL(
    `${config.apiUri}/v3/grants/${encodeURIComponent(grantId)}/events`,
  );

  url.searchParams.set("calendar_id", options.calendarId ?? "primary");
  url.searchParams.set("start", String(Math.floor(now.getTime() / 1000)));
  url.searchParams.set("end", String(Math.floor(end.getTime() / 1000)));
  url.searchParams.set(
    "limit",
    String(Math.min(Math.max(options.limit ?? 50, 1), 200)),
  );

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const payload = (await response.json()) as NylasEventsResponse;

  if (!response.ok) {
    throw new Error(
      payload.error?.message ||
        `Nylas returned ${response.status} while loading calendar events.`,
    );
  }

  return payload.data ?? [];
}

/**
 * Converts a calendar event into the same universal input currently used by
 * the Executive Brief pipeline. Prefixing the source ID avoids collisions
 * with email message IDs while keeping the MVP on one table.
 */
export function mapEventToExecutiveBriefInput(event: NylasEvent): NylasMessage {
  const start = getEventStart(event.when);
  const participants = event.participants ?? [];
  const organizer: NylasParticipant = {
    name: event.organizer_name || "Calendar",
    email: event.organizer_email,
  };

  const details = [
    start ? `Starts: ${start.toISOString()}` : null,
    event.location ? `Location: ${event.location}` : null,
    participants.length > 0
      ? `Attendees: ${participants.map(formatParticipant).join(", ")}`
      : null,
    event.description?.trim() || null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    id: `calendar:${event.id}`,
    subject: event.title?.trim() || "Untitled meeting",
    snippet: details || "Calendar event",
    date: start ? Math.floor(start.getTime() / 1000) : undefined,
    from: [organizer],
    to: participants,
  };
}

function getEventStart(when?: NylasEventTime) {
  if (!when) return null;

  if (when.object === "time") return new Date(when.time * 1000);
  if (when.object === "timespan") return new Date(when.start_time * 1000);
  if (when.object === "date") return new Date(`${when.date}T00:00:00`);
  return new Date(`${when.start_date}T00:00:00`);
}

function formatParticipant(participant: NylasParticipant) {
  if (participant.name && participant.email) {
    return `${participant.name} <${participant.email}>`;
  }

  return participant.name || participant.email || "Unknown attendee";
}
