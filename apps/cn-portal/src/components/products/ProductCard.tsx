import Image from 'next/image';
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
          // ERP 主图动辄 500KB 的 PNG，一页 40 张；经 next/image 缩成卡片尺寸的 webp 并在服务端缓存
          <Image
            src={img}
            alt={item.name}
            width={320}
            height={320}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px"
            className="w-full h-full object-contain p-4"
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
