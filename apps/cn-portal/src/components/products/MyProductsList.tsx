import Link from 'next/link';
import type { MyProductRow } from '@/lib/types/product';
import { erpImage } from '@/lib/image';
import { t } from '@/lib/i18n';
import ProductPrice from './ProductPrice';

const STATUS_STYLES: Record<string, string> = {
  listed: 'bg-green-50 text-green-700',
  ready: 'bg-gray-100 text-gray-600',
  draft: 'bg-gray-100 text-gray-600',
  paused: 'bg-amber-50 text-amber-700',
  archived: 'bg-gray-100 text-gray-400',
};

function thumbnail(product: MyProductRow): string | null {
  const image = product.product_images?.[0];
  if (!image) return null;
  return image.rawPath ? erpImage(image.rawPath) : image.url ?? null;
}

export default function MyProductsList({ products, highlightId }: { products: MyProductRow[]; highlightId?: string }) {
  if (products.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center bg-white">
        <p className="text-gray-500">{t('myProducts.empty')}</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-border bg-white overflow-hidden">
      <ul className="divide-y divide-border">
        {products.map((product) => {
          const src = thumbnail(product);
          const listing = product.channel_listings?.find((l) => l.external_listing_url) ?? product.channel_listings?.[0];
          return (
            <li key={product.id} className={`flex items-center gap-4 px-5 py-4 ${product.id === highlightId ? 'bg-brand-50' : ''}`}>
              <div className="w-14 h-14 rounded-lg bg-surface-secondary overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {src && <img src={src} alt="" className="w-full h-full object-contain p-1" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{product.title ?? '—'}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(product.created_at).toLocaleDateString('zh-CN')}
                  {listing?.creator_store_connections?.store_name && ` · ${listing.creator_store_connections.store_name}`}
                </p>
              </div>
              <ProductPrice min={product.retail_price} className="text-sm font-medium text-gray-800" />
              <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[product.status] ?? STATUS_STYLES.draft}`}>
                {t(`myProducts.status.${product.status === 'listed' ? 'listed' : 'notListed'}`)}
              </span>
              {product.status !== 'listed' && (
                <Link href={`/my-products/${product.id}/sync`} className="text-sm font-semibold text-gray-900 underline underline-offset-2 whitespace-nowrap">
                  {t('myProducts.syncNow')}
                </Link>
              )}
              {listing?.external_listing_url && (
                <a href={listing.external_listing_url} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-700 underline underline-offset-2 whitespace-nowrap">
                  {t('myProducts.viewInStore')}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
