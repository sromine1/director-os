import PriorityBadge from "./PriorityBadge";
import { ExecutiveEmail } from "@/types/email";

type Props = {
  email: ExecutiveEmail;
};

export default function DashboardCard({ email }: Props) {
  return (
    <div className="border rounded-lg p-5 shadow hover:shadow-lg transition bg-white">
      <div className="flex justify-between mb-2">
        <h2 className="font-bold">{email.subject}</h2>

        <PriorityBadge priority={email.priority} />
      </div>

      <p className="text-sm text-gray-500">
        {email.sender}
      </p>

      <p className="mt-3">
        {email.summary}
      </p>

      {email.deadline && (
        <p className="mt-4 text-red-600 font-semibold">
          Deadline: {email.deadline}
        </p>
      )}
    </div>
  );
}