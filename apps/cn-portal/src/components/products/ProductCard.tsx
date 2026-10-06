import Link from 'next/link';
import type { CatalogItem } from '@/lib/types/catalog';
import { erpImage } from '@/lib/image';
import { t } from '@/lib/i18n';
import ProductPrice from './ProductPrice';
import MoqHint from './MoqHint';

export default function ProductCard({ item }: { item: CatalogItem }) {
  const img = erpImage(item.imagePath);
  return (
    <Link
      href={`/products/${item.id}`}
      className="group rounded-2xl border-2 border-border bg-white overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="aspect-square bg-surface-secondary flex items-center justify-center">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={item.name}
            className="w-full h-full object-contain p-4"
            loading="lazy"
          />
        ) : (
          <span className="text-gray-300 text-xs">{t('image.empty')}</span>
        )}
      </div>
      <div className="p-3">
        {/* 产品名保持英文原文（文档 5.3） */}
        <p className="text-xs font-semibold text-gray-900 truncate group-hover:text-primary-700">
          {item.name}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5 truncate">
          {item.itemNo}
        </p>
        <div className="mt-2">
          <ProductPrice min={item.fromPrice} from className="text-sm font-semibold text-gray-800" />
        </div>
        <MoqHint quantity={item.moqQty} className="mt-2 px-2 py-0.5 text-[10px]" />
      </div>
    </Link>
  );
}
