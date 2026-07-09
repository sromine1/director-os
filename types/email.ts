export interface ExecutiveEmail {
  id: string;
  subject: string;
  sender: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  category: string;
  summary: string;
  actionRequired: boolean;
  deadline?: string;
}