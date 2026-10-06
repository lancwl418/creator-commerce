import type { ProductListItem } from '@/lib/types/product';
import ProductRow from './ProductRow';

export default function ProductTable({ products }: { products: ProductListItem[] }) {
  return (
    <div className="rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
      <div className="hidden sm:grid sm:grid-cols-[auto_1fr_160px_120px_100px_100px_80px] gap-4 items-center px-5 py-3 bg-surface-secondary border-b border-border-light text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        <div className="w-10" />
        <div>Product</div><div>Design</div><div>Channel</div>
        <div>Price</div><div>Status</div><div className="text-right">Actions</div>
      </div>
      <div className="divide-y divide-border-light">
        {products.map((product) => <ProductRow key={product.id} product={product} />)}
      </div>
    </div>
  );
}
