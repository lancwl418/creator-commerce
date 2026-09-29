import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resolveProductTierPrice } from '@creator-commerce/shared/erp';
import { getProductDetail } from '@/lib/catalog.server';
import { getCurrentSellerTier } from '@/lib/seller';
import { erpImage } from '@/lib/image';
import { t } from '@/lib/i18n';
import AddToCart from './AddToCart';

export const dynamic = 'force-dynamic';

function distinct(values: (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v)));
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tier = await getCurrentSellerTier();
  const { product, data } = await getProductDetail(id, tier);

  if (!product) notFound();

  const skus = product.prodSkuList ?? [];

  // 该等级价格区间（POD 为产品+等级级）
  const price = resolveProductTierPrice(product, tier);
  const minPrice = price?.min ?? null;
  const maxPrice = price?.max ?? null;

  // 是否有可购买 SKU：未隐藏 + 有货（库存空表=引导态视为有货）
  const stockKnown = data.stock.size > 0;
  const listable = skus.filter((s) => {
    if (data.hiddenSkusForTier.has(s.sku)) return false;
    if (stockKnown && data.stock.get(s.sku) !== true) return false;
    return true;
  });
  const buyable = minPrice != null && listable.length > 0;

  // 起订量：产品下第一个有 MOQ 的 SKU
  let moqQty: number | null = null;
  for (const s of skus) {
    const m = data.moq.get(s.sku);
    if (m?.minQty != null) {
      moqQty = m.minQty;
      break;
    }
  }

  // 图集
  const images = distinct([
    product.mainPic,
    ...(product.prodImageList ?? []).map((i) => i.picSrc),
  ]);

  // 属性表（英文原文，文档 5.3）
  const attrs: { label: string; value: string }[] = [];
  if (product.option1Name)
    attrs.push({
      label: product.option1Name,
      value: distinct(skus.map((s) => s.option1)).join(', '),
    });
  if (product.option2Name)
    attrs.push({
      label: product.option2Name,
      value: distinct(skus.map((s) => s.option2)).join(', '),
    });
  if (product.option3Name)
    attrs.push({
      label: product.option3Name,
      value: distinct(skus.map((s) => s.option3)).join(', '),
    });
  if (product.weight != null)
    attrs.push({ label: 'Weight', value: String(product.weight) });

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <Link
        href="/products"
        className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        ← {t('detail.back')}
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
        {/* 图集 */}
        <div>
          <div className="aspect-square bg-white rounded-2xl border border-border flex items-center justify-center overflow-hidden">
            {images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={erpImage(images[0])!}
                alt={product.itemEnName || product.title}
                className="w-full h-full object-contain p-6"
              />
            ) : (
              <span className="text-gray-300">No image</span>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {images.slice(0, 6).map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={src}
                  src={erpImage(src)!}
                  alt=""
                  className="w-16 h-16 object-contain rounded-lg border border-border bg-white p-1"
                />
              ))}
            </div>
          )}
        </div>

        {/* 信息 */}
        <div>
          {/* 产品名英文原文 */}
          <h1 className="text-xl font-bold text-gray-900">
            {product.itemEnName || product.title}
          </h1>
          <p className="text-xs text-gray-400 mt-1">{product.itemNo}</p>

          {/* 价格（按等级） */}
          <div className="mt-4">
            <p className="text-[11px] text-gray-500">{t(`tier.${tier}`)}</p>
            {minPrice != null ? (
              <p className="text-2xl font-bold text-gray-900 mt-0.5">
                ${minPrice.toFixed(2)}
                {maxPrice != null && maxPrice !== minPrice && (
                  <span className="text-base font-medium text-gray-500">
                    {' '}– ${maxPrice.toFixed(2)}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-sm text-gray-400 mt-0.5">
                {t('price.unavailable')}
              </p>
            )}
          </div>

          {/* 起订量提示（只提示不校验，文档 4.3） */}
          {moqQty != null && (
            <p className="mt-2 inline-block rounded-md bg-brand-50 px-2.5 py-1 text-xs text-brand-600 font-medium">
              {t('moq.hint', 'zh', { n: moqQty })}
            </p>
          )}

          {/* 属性表 */}
          {attrs.length > 0 && (
            <div className="mt-5">
              <h2 className="text-sm font-semibold text-gray-800 mb-2">
                {t('detail.attributes')}
              </h2>
              <table className="w-full text-sm">
                <tbody>
                  {attrs.map((a) => (
                    <tr key={a.label} className="border-b border-border last:border-0">
                      <td className="py-1.5 text-gray-500 w-1/3">{a.label}</td>
                      <td className="py-1.5 text-gray-800">{a.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 生产周期 */}
          {product.productionTime != null && product.productionTime !== '' && (
            <div className="mt-4 text-sm">
              <span className="text-gray-500">{t('detail.productionTime')}：</span>
              <span className="text-gray-800">{String(product.productionTime)}</span>
            </div>
          )}

          {/* 发货地（只读 + 固定说明，文档 5.2 / 7.1） */}
          <div className="mt-3 text-sm">
            <span className="text-gray-500">{t('detail.shipFrom')}：</span>
            <span className="text-gray-800">{product.shipFrom || '—'}</span>
            <p className="text-[11px] text-gray-400 mt-1">
              {t('detail.shipFromNote')}
            </p>
          </div>

          {/* 加入购物车 */}
          <div className="mt-6">
            <AddToCart disabled={!buyable} />
          </div>
        </div>
      </div>
    </div>
  );
}
