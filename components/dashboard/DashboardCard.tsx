import Link from "next/link";
import PriorityBadge from "./PriorityBadge";
import { ExecutiveEmail } from "@/types/email";

type Props = {
  email: ExecutiveEmail;
};

export default function DashboardCard({ email }: Props) {
  const isCalendar = email.category === "Calendar";

  return (
    <Link
      href={`/briefs/${email.id}`}
      className="block rounded-lg border border-slate-700 bg-slate-800 p-5 shadow transition hover:border-blue-500 hover:bg-slate-750"
    >
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <span className="mb-2 inline-flex rounded-full border border-slate-600 bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-300">
            {isCalendar ? "Calendar" : "Email"}
          </span>
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
