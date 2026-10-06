import type { BuyerOrderItem } from '@/lib/types/buyer-order';
import ImageThumbnail from '@/components/ui/ImageThumbnail';

export default function OrderLineItem({ item }: { item: BuyerOrderItem }) {
  return (
    <div className="flex items-center gap-3">
      <ImageThumbnail src={item.preview} />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-900 truncate">{item.title}</p>
        {item.variant && <p className="text-[11px] text-gray-400">{item.variant}</p>}
      </div>
      <span className="text-xs text-gray-500 shrink-0">×{item.quantity}</span>
    </div>
  );
}
