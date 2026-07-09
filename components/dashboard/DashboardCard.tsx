import Link from "next/link";
import PriorityBadge from "./PriorityBadge";
import { ExecutiveEmail } from "@/types/email";

type Props = {
  email: ExecutiveEmail;
};

export default function DashboardCard({ email }: Props) {
  return (
    <Link
      href={`/briefs/${email.id}`}
      className="block rounded-lg border border-slate-700 bg-slate-800 p-5 shadow transition hover:border-blue-500 hover:bg-slate-750"
    >
      <div className="flex justify-between mb-2">
        <h2 className="font-bold text-white">{email.subject}</h2>
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