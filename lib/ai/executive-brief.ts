import type { NylasMessage, NylasParticipant } from "@/lib/connectors/email/nylas/messages";

export type ExecutiveBriefAnalysis = {
  importance_score: number;
  priority: "Critical" | "High" | "Medium" | "Low";
  category: string;
  executive_summary: string;
  action_items: string[];
  decisions_required: string[];
  deadlines: string[];
  people: string[];
  organizations: string[];
  projects: string[];
  risks: string[];
  urgency_reason: string;
  suggested_reply: string;
  confidence: number;
};

type OpenAIResponse = {
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: { message?: string };
};

const EXECUTIVE_BRIEF_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    importance_score: { type: "integer", minimum: 0, maximum: 100 },
    priority: { type: "string", enum: ["Critical", "High", "Medium", "Low"] },
    category: { type: "string" },
    executive_summary: { type: "string" },
    action_items: { type: "array", items: { type: "string" } },
    decisions_required: { type: "array", items: { type: "string" } },
    deadlines: { type: "array", items: { type: "string" } },
    people: { type: "array", items: { type: "string" } },
    organizations: { type: "array", items: { type: "string" } },
    projects: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
    urgency_reason: { type: "string" },
    suggested_reply: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
  required: [
    "importance_score",
    "priority",
    "category",
    "executive_summary",
    "action_items",
    "decisions_required",
    "deadlines",
    "people",
    "organizations",
    "projects",
    "risks",
    "urgency_reason",
    "suggested_reply",
    "confidence",
  ],
} as const;

export async function analyzeMessageForExecutiveBrief(
  message: NylasMessage,
): Promise<ExecutiveBriefAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing required environment variable: OPENAI_API_KEY");
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";
  const sender = formatParticipant(message.from?.[0], "Unknown sender");
  const recipients = (message.to ?? [])
    .map((participant) => formatParticipant(participant, ""))
    .filter(Boolean)
    .join(", ");
  const receivedAt = message.date
    ? new Date(message.date * 1000).toISOString()
    : "Unknown";

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      store: false,
      instructions:
        "You are the Chief of Staff for a senior executive. Evaluate email objectively. Surface only genuine urgency, decisions, commitments, risks, deadlines, and actions. Do not invent missing details. Marketing, newsletters, automated notifications, and routine FYI messages should normally receive low importance. Keep the executive summary concise and useful.",
      input: `Analyze this email for an executive inbox.\n\nSender: ${sender}\nRecipients: ${recipients || "Unknown"}\nReceived: ${receivedAt}\nSubject: ${message.subject || "No subject"}\nUnread: ${Boolean(message.unread)}\nStarred: ${Boolean(message.starred)}\n\nEmail content:\n${message.snippet?.trim() || "No message text was available."}`,
      text: {
        format: {
          type: "json_schema",
          name: "executive_brief",
          description: "Structured executive analysis of an email message.",
          strict: true,
          schema: EXECUTIVE_BRIEF_SCHEMA,
        },
      },
    }),
    cache: "no-store",
  });

  const payload = (await response.json()) as OpenAIResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message || `OpenAI returned ${response.status}.`);
  }

  const outputText = payload.output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => content.type === "output_text")?.text;

  if (!outputText) {
    throw new Error("OpenAI did not return an executive brief.");
  }

  return JSON.parse(outputText) as ExecutiveBriefAnalysis;
}

function formatParticipant(
  participant: NylasParticipant | undefined,
  fallback: string,
) {
  if (!participant) return fallback;
  if (participant.name && participant.email) {
    return `${participant.name} <${participant.email}>`;
  }
  return participant.name || participant.email || fallback;
}
