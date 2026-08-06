export interface ExecutiveEmail {
  id: string;
  subject: string;
  sender: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  category: string;
  summary: string;
  actionRequired: boolean;
  deadline?: string;
  sourceProvider?: "google" | "microsoft" | "unknown";
  sourceAccount?: string;
  sourceType?: "email" | "calendar";
  receivedAt?: string;
  completedAt?: string;
  snoozeUntil?: string;
  pinned: boolean;
  webLink?: string;
  executiveScore?: number;
}
