'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { t } from '@/lib/i18n';
import ProductPrice from '@/components/products/ProductPrice';

export interface OrderableProduct {
  id: string;
  name: string;
  itemNo: string;
  fromPrice: number | null;
  maxPrice: number | null;
  supplierId: string | null;
  supplierName: string | null;
}

const MAX_SHOWN = 50;

/** 不同供应商的产品分开展示：按供应商分组（没标供应商的归到最后一组） */
function groupBySupplier(products: OrderableProduct[]): { supplierName: string | null; products: OrderableProduct[] }[] {
  const groups = new Map<string, { supplierName: string | null; products: OrderableProduct[] }>();
  for (const product of products) {
    const key = product.supplierId ?? '';
    const group = groups.get(key) ?? { supplierName: product.supplierName, products: [] };
    group.products.push(product);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => (a.supplierName === null ? 1 : b.supplierName === null ? -1 : 0));
}

/** 创建订单的产品选择：按名称 / 货号过滤、按供应商分组，点选后进入该产品的统一下单页。 */
export default function CreateOrderPicker({ products }: { products: OrderableProduct[] }) {
  const [query, setQuery] = useState('');
  const sections = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const filtered = keyword
      ? products.filter((p) => p.name.toLowerCase().includes(keyword) || p.itemNo.toLowerCase().includes(keyword))
      : products;
    return groupBySupplier(filtered.slice(0, MAX_SHOWN));
  }, [products, query]);

  return (
    <div className="space-y-4">
      <input type="search" value={query} onChange={(event) => setQuery(event.target.value)}
        placeholder={t('orders.create.search')} autoFocus
        className="w-full rounded-xl border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-500" />
      {sections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600">{t('orders.create.empty')}</div>
      ) : (
        sections.map((section, index) => (
          <div key={section.supplierName ?? `supplier-${index}`}>
            {section.supplierName && (
              <p className="mb-1.5 text-xs font-semibold text-gray-500">{t('detail.supplier')}：<span className="text-gray-800">{section.supplierName}</span></p>
            )}
            <ul className="divide-y divide-border rounded-2xl border border-border bg-white">
              {section.products.map((product) => (
                <li key={product.id}>
                  <Link href={`/products/${product.id}/order`} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{product.itemNo}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-gray-900">
                      <ProductPrice min={product.fromPrice} max={product.maxPrice} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
