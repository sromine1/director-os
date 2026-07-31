import Link from "next/link";
import PriorityBadge from "./PriorityBadge";
import { ExecutiveEmail } from "@/types/email";

type Props = {
  email: ExecutiveEmail;
};

export default function DashboardCard({ email }: Props) {
  const isCalendar = email.sourceType === "calendar" || email.category === "Calendar";
  const sourceLabel = getSourceLabel(email.sourceProvider, isCalendar);

  return (
    <Link
      href={`/briefs/${email.id}`}
      className="block rounded-lg border border-slate-700 bg-slate-800 p-5 shadow transition hover:border-blue-500 hover:bg-slate-750"
    >
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full border border-slate-600 bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-300">
              {sourceLabel}
            </span>
            {email.sourceAccount && (
              <span className="text-xs text-slate-400">{email.sourceAccount}</span>
            )}
            {typeof email.executiveScore === "number" && (
              <span className="text-xs text-slate-500">
                Relevance {email.executiveScore}/100
              </span>
            )}
          </div>
          <h2 className="font-bold text-white">{email.subject}</h2>
        </div>
        <PriorityBadge priority={email.priority} />
      </div>

      <p className="text-sm text-slate-400">{email.sender}</p>
      <p className="mt-3 text-slate-300">{email.summary}</p>

      {email.deadline && (
        <p className="mt-4 font-semibold text-red-400">
          Deadline: {email.deadline}
        </p>
      )}
    </Link>
  );
}

function getSourceLabel(
  provider: ExecutiveEmail["sourceProvider"],
  isCalendar: boolean,
) {
  if (provider === "google") return isCalendar ? "Google Calendar" : "Gmail";
  if (provider === "microsoft") return isCalendar ? "Outlook Calendar" : "Outlook";
  return isCalendar ? "Calendar" : "Email";
}
