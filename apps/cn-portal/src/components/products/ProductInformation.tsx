import type { SellerTier } from '@creator-commerce/shared/erp/pricing';
import type { ProductDetailView } from '@/lib/types/catalog';
import { t } from '@/lib/i18n';
import AddToCart from './AddToCart';
import ProductAttributes from './ProductAttributes';
import ProductPrice from './ProductPrice';
import MoqHint from './MoqHint';

interface ProductInformationProps {
  details: ProductDetailView;
  tier: SellerTier;
}

export default function ProductInformation({ details, tier }: ProductInformationProps) {
  const { item } = details;
  const { fromPrice: minPrice, maxPrice, moqQty } = item;
  return (
    <div>
      {/* 产品名英文原文 */}
      <h1 className="text-xl font-bold text-gray-900">
        {item.name}
      </h1>
      <p className="text-xs text-gray-400 mt-1">{item.itemNo}</p>

      {/* 价格（按等级） */}
      <div className="mt-4">
        <p className="text-[11px] text-gray-500">{t(`tier.${tier}`)}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">
          <ProductPrice min={minPrice} max={maxPrice} />
        </p>
      </div>
      <MoqHint quantity={moqQty} className="mt-2 px-2.5 py-1 text-xs" />

      {/* 属性表 */}
      <ProductAttributes attributes={details.attributes} />

      {/* 生产周期 */}
      {details.productionTime != null && details.productionTime !== '' && (
        <div className="mt-4 text-sm">
          <span className="text-gray-500">{t('detail.productionTime')}：</span>
          <span className="text-gray-800">{String(details.productionTime)}</span>
        </div>
      )}

      {/* 发货地（只读 + 固定说明，文档 5.2 / 7.1） */}
      <div className="mt-3 text-sm">
        <span className="text-gray-500">{t('detail.shipFrom')}：</span>
        <span className="text-gray-800">{details.shipFrom || '—'}</span>
        <p className="text-[11px] text-gray-400 mt-1">
          {t('detail.shipFromNote')}
        </p>
      </div>

      {/* 加入购物车 */}
      <div className="mt-6">
        <AddToCart />
      </div>
    </div>
  );
}
