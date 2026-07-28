import { getNylasConfig } from "./config";

export type NylasParticipant = {
  name?: string;
  email?: string;
};

export type NylasMessage = {
  id: string;
  subject?: string;
  snippet?: string;
  date?: number;
  unread?: boolean;
  starred?: boolean;
  from?: NylasParticipant[];
  to?: NylasParticipant[];
};

type NylasMessagesResponse = {
  data?: NylasMessage[];
  next_cursor?: string | null;
  request_id?: string;
  error?: {
    message?: string;
  };
};

export async function listRecentMessages(grantId: string, limit = 20) {
  const config = getNylasConfig();
  const url = new URL(
    `${config.apiUri}/v3/grants/${encodeURIComponent(grantId)}/messages`,
  );
  url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 50)));

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const payload = (await response.json()) as NylasMessagesResponse;

  if (!response.ok) {
    throw new Error(
      payload.error?.message ||
        `Nylas returned ${response.status} while loading messages.`,
    );
  }

  return payload.data ?? [];
}
