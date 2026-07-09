type Props = {
  priority: string;
};

export default function PriorityBadge({ priority }: Props) {
  const colors = {
    Critical: "bg-red-600",
    High: "bg-orange-500",
    Medium: "bg-yellow-500",
    Low: "bg-green-600",
  };

  return (
    <span
      className={`px-2 py-1 rounded text-xs text-white ${
        colors[priority as keyof typeof colors]
      }`}
    >
      {priority}
    </span>
  );
}