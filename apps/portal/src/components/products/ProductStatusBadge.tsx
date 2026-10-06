export default function ProductStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    pending_review: 'bg-amber-50 text-amber-700 border border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    ready: 'bg-blue-50 text-blue-700 border border-blue-200',
    listed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    published: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    paused: 'bg-amber-50 text-amber-700 border border-amber-200',
    archived: 'bg-gray-100 text-gray-500',
  };

  const labels: Record<string, string> = {
    draft: 'Draft',
    pending_review: 'In Review',
    approved: 'Approved',
    ready: 'Ready',
    listed: 'Listed',
    published: 'Published',
    paused: 'Paused',
    archived: 'Archived',
  };

  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${styles[status] || styles.draft}`}>
      {labels[status] || status}
    </span>
  );
}

