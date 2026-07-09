import AppLayout from "@/components/layout/AppLayout";
import DashboardCard from "@/components/dashboard/DashboardCard";
import { ExecutiveEmail } from "@/types/email";

const sampleEmails: ExecutiveEmail[] = [
  {
    id: "1",
    subject: "PowerCo Architecture Approval Needed",
    sender: "Boris",
    priority: "Critical",
    category: "Document Review",
    summary:
      "Approval is required before tomorrow's client presentation. Two executive decisions are required.",
    actionRequired: true,
    deadline: "Tomorrow 3:00 PM",
  },
  {
    id: "2",
    subject: "Budget Review",
    sender: "Crystal Cho",
    priority: "High",
    category: "Finance",
    summary:
      "Please review the latest quarterly budget before the executive meeting.",
    actionRequired: true,
  },
  {
    id: "3",
    subject: "Weekly AI Update",
    sender: "Jonathan Wiens",
    priority: "Medium",
    category: "AI",
    summary:
      "Weekly update covering AI initiatives and delivery status.",
    actionRequired: false,
  },
];

export default function Home() {
  return (
    <AppLayout>
      <div className="grid grid-cols-4 gap-6 mb-8">

        <MetricCard title="Critical" value="1" color="text-red-400" />

        <MetricCard title="High Priority" value="2" color="text-orange-400" />

        <MetricCard title="Open Decisions" value="3" color="text-blue-400" />

        <MetricCard title="Action Items" value="5" color="text-green-400" />

      </div>

      <h2 className="text-3xl font-bold text-white mb-6">
        Executive Inbox
      </h2>

      <div className="space-y-5">
        {sampleEmails.map((email) => (
          <DashboardCard
            key={email.id}
            email={email}
          />
        ))}
      </div>
    </AppLayout>
  );
}

function MetricCard({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-slate-800 border border-slate-700 p-6">
      <p className="text-slate-400">
        {title}
      </p>

      <p className={`text-4xl font-bold mt-3 ${color}`}>
        {value}
      </p>
    </div>
  );
}