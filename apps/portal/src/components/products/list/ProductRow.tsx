import Link from 'next/link';
import type { ProductListItem } from '@/lib/types/product';
import ImageThumbnail from '@/components/ui/ImageThumbnail';
import ProductStatusBadge from '../ProductStatusBadge';
import ChannelBadge from '../ChannelBadge';
import ProductRowActions from './ProductRowActions';

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export default function ProductRow({ product }: { product: ProductListItem }) {
  const previewUrls = stringArray(product.preview_urls);
  const artworkUrls = stringArray(product.design_artwork_urls);
  const listings = product.channel_listings ?? [];
  const activeListings = listings.filter((listing) => listing.status === 'active');
  const displayPrice = product.retail_price ?? activeListings[0]?.price;

  return (
    <div className="group flex flex-col sm:grid sm:grid-cols-[auto_1fr_160px_120px_100px_100px_80px] gap-3 sm:gap-4 items-start sm:items-center px-5 py-4 hover:bg-surface-hover transition-colors">
      <Link href={`/dashboard/products/${product.id}`} className="contents">
        <ImageThumbnail src={previewUrls[0]} alt={product.title ?? ''} size={40} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-primary-700 transition-colors">
            {product.title || product.designs?.title || 'Untitled'}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {new Date(product.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="min-w-0">
          {artworkUrls.length > 0 ? (
            <div className="flex items-center gap-1.5">
              {artworkUrls.slice(0, 3).map((url, index) => (
                <ImageThumbnail key={index} src={url} size={32} className="rounded-md border border-border-light" />
              ))}
              {artworkUrls.length > 3 && <span className="text-[10px] text-gray-400 font-medium">+{artworkUrls.length - 3}</span>}
            </div>
          ) : <span className="text-xs text-gray-400">—</span>}
        </div>
        <div>
          {activeListings.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {activeListings.map((listing) => (
                <ChannelBadge key={listing.id} channelType={listing.creator_store_connections?.platform || listing.channel_type} />
              ))}
            </div>
          ) : <span className="text-xs text-gray-400">—</span>}
        </div>
        <div>
          {displayPrice != null ? (
            <span className="text-sm font-semibold text-gray-900">${Number(displayPrice).toFixed(2)}</span>
          ) : <span className="text-xs text-gray-400">—</span>}
        </div>
        <div><ProductStatusBadge status={product.status} /></div>
      </Link>
      <div className="sm:justify-self-end">
        <ProductRowActions productId={product.id} listings={listings} />
      </div>
    </div>
  );
}
