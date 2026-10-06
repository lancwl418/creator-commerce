export default function FulfillmentBadge({ status }: { status: string | null }) {
  const fulfilled = status === 'fulfilled';
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${fulfilled ? 'bg-emerald-50 text-emerald-700' : 'bg-brand-100 text-ink'
      }`}>
      {fulfilled ? 'Fulfilled' : 'Processing'}
    </span>
  );
}
