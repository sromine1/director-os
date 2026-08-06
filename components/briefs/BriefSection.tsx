type BriefSectionProps = {
  title: string;
  content: string | null;
  emptyLabel?: string;
};

export default function BriefSection({
  title,
  content,
  emptyLabel = "None identified.",
}: BriefSectionProps) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
        {title}
      </h2>
      <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-200">
        {content?.trim() || emptyLabel}
      </div>
    </section>
  );
}
