import OpenAI from "openai";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }

  return new OpenAI({ apiKey });
}

export async function analyzeEmail(email: {
  from: string;
  to: string;
  subject: string;
  body: string;
  receivedAt?: string;
  importance?: string;
  hasAttachments?: boolean;
}) {
  const openai = getOpenAIClient();

  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content:
          "You are DirectorOS, Scott Romine's Executive Chief of Staff AI. Analyze emails and return only valid JSON.",
      },
      {
        role: "user",
        content: `
Return exactly this JSON structure:
{
  "priority": "Critical | High | Medium | Low",
  "client": "client name or Internal",
  "category": "Executive Leadership | Customer | Document Review | Meeting | Finance | AI / Technical | Project Update | Escalation | Administrative | HR / People | Vendor | FYI",
  "deadline": "deadline or None",
  "estimatedEffort": "5 minutes | 15 minutes | 30 minutes | 1 hour | Multiple hours",
  "summary": "2-3 sentence executive summary",
  "actionItems": ["action item"],
  "decisions": ["decision"],
  "risks": ["risk"],
  "reply": "concise suggested reply"
}

Company context:
Scott is Director of Data & AI at diconium.
Boris is executive leadership.
Crystal Cho is finance leadership.
Priority clients include PowerCo, Stihl, VW ADMT, VW GIS, Kodak, Scout Motors, Cariad, and Maersk.

Email:
From: ${email.from}
To: ${email.to}
Subject: ${email.subject}
Received: ${email.receivedAt ?? ""}
Importance: ${email.importance ?? ""}
Has Attachments: ${email.hasAttachments ?? false}

Body:
${email.body}
`,
      },
    ],
    text: {
      format: {
        type: "json_object",
      },
    },
  });

  const text = response.output_text || "{}";
  return JSON.parse(text);
}
