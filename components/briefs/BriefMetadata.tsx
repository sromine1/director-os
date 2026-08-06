import type { BriefAiMetadata, BriefDetail } from "@/lib/executive-brief-detail";
import { formatBriefDate, sourceName } from "@/lib/executive-brief-detail";

export default function BriefMetadata({ brief, ai }: { brief: BriefDetail; ai: BriefAiMetadata }) {
  const confidence = ai.confidence === null ? "Not available" : `${Math.round(ai.confidence * 100)}%`;

  return (
    <aside className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Brief metadata</h2>
      <dl className="mt-5 space-y-4">
        <MetadataRow label="Sender" value={brief.sender} />
        <MetadataRow label="Recipients" value={brief.recipients} />
        <MetadataRow label="Source" value={sourceName(brief)} />
        <MetadataRow label="Account" value={brief.source_account ?? null} />
        <MetadataRow label="Received" value={formatBriefDate(brief.received_at)} />
        <MetadataRow label="Deadline" value={brief.deadline} />
        <MetadataRow label="AI confidence" value={confidence} />
        <MetadataRow label="Executive score" value={ai.importanceScore === null ? null : `${ai.importanceScore}/100`} />
        <MetadataRow label="AI model" value={ai.model} />
        <MetadataRow label="Analyzed" value={formatBriefDate(ai.processedAt)} />
      </dl>
    </aside>
  );
}

function MetadataRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm leading-6 text-slate-200">{value?.trim() || "Not available"}</dd>
    </div>
  );
}
