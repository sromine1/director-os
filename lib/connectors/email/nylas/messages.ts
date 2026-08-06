import { getNylasConfig } from "./config";

export type NylasParticipant = {
  name?: string;
  email?: string;
};

export type NylasMessage = {
  id: string;
  thread_id?: string;
  subject?: string;
  snippet?: string;
  date?: number;
  unread?: boolean;
  starred?: boolean;
  from?: NylasParticipant[];
  to?: NylasParticipant[];
  folders?: string[];
  webLink?: string;
};

type NylasFolder = {
  id: string;
  name?: string;
  attributes?: string[];
};

type NylasMessagesResponse = {
  data?: NylasMessage[];
  next_cursor?: string | null;
  request_id?: string;
  error?: {
    message?: string;
  };
};

type NylasMessageResponse = {
  data?: NylasMessage;
  error?: { message?: string };
};

type NylasFoldersResponse = {
  data?: NylasFolder[];
  error?: { message?: string };
};

export async function listRecentMessages(grantId: string, limit = 20) {
  const config = getNylasConfig();
  const messagesUrl = new URL(
    `${config.apiUri}/v3/grants/${encodeURIComponent(grantId)}/messages`,
  );
  messagesUrl.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 50)));

  const [messagesResponse, junkFolderIds] = await Promise.all([
    fetch(messagesUrl, {
      headers: nylasHeaders(config.apiKey),
      cache: "no-store",
    }),
    listJunkFolderIds(grantId),
  ]);

  const payload = (await messagesResponse.json()) as NylasMessagesResponse;

  if (!messagesResponse.ok) {
    throw new Error(
      payload.error?.message ||
        `Nylas returned ${messagesResponse.status} while loading messages.`,
    );
  }

  const messages = payload.data ?? [];
  return {
    messages: messages.filter((message) => !isSpamMessage(message, junkFolderIds)),
    spamMessageIds: messages
      .filter((message) => isSpamMessage(message, junkFolderIds))
      .map((message) => message.id),
  };
}

export async function listJunkFolderIds(grantId: string) {
  const config = getNylasConfig();
  const url = `${config.apiUri}/v3/grants/${encodeURIComponent(grantId)}/folders`;
  const response = await fetch(url, {
    headers: nylasHeaders(config.apiKey),
    cache: "no-store",
  });
  const payload = (await response.json()) as NylasFoldersResponse;

  if (!response.ok) {
    throw new Error(
      payload.error?.message ||
        `Nylas returned ${response.status} while loading folders.`,
    );
  }

  return new Set(
    (payload.data ?? [])
      .filter(isJunkFolder)
      .map((folder) => folder.id),
  );
}

export async function getNylasMessage(grantId: string, messageId: string) {
  const config = getNylasConfig();
  const url = `${config.apiUri}/v3/grants/${encodeURIComponent(grantId)}/messages/${encodeURIComponent(messageId)}`;
  const response = await fetch(url, {
    headers: nylasHeaders(config.apiKey),
    cache: "no-store",
  });
  const payload = (await response.json()) as NylasMessageResponse;

  if (!response.ok || !payload.data) {
    throw new Error(
      payload.error?.message ||
        `Nylas returned ${response.status} while loading a message.`,
    );
  }

  return payload.data;
}

export function isSpamMessage(
  message: Pick<NylasMessage, "folders">,
  junkFolderIds: ReadonlySet<string>,
) {
  return (message.folders ?? []).some(
    (folderId) =>
      folderId.toUpperCase() === "SPAM" || junkFolderIds.has(folderId),
  );
}

function isJunkFolder(folder: NylasFolder) {
  const hasJunkAttribute = (folder.attributes ?? []).some(
    (attribute) => attribute.replace(/^\\+/, "").toLowerCase() === "junk",
  );
  const normalizedName = folder.name?.trim().toLowerCase();
  return (
    hasJunkAttribute ||
    normalizedName === "spam" ||
    normalizedName === "junk" ||
    normalizedName === "junk email"
  );
}

function nylasHeaders(apiKey: string) {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}
