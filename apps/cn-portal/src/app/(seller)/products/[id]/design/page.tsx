import { notFound } from 'next/navigation';
import { getCatalogItem } from '@/lib/catalog';
import { getProductDetail } from '@/lib/catalog.server';
import { buildEmbeddedEditorUrl, getDesignEngineUrl } from '@/lib/design-engine';
import { cacheProductsForEditor } from '@/lib/products-cache';
import { ERP_TEMPLATE_PREFIX } from '@/lib/products/blank-product';
import { getRequestOrigin } from '@/lib/request-origin';
import { requireSeller } from '@/lib/sellers/session';
import type { SyncPageProps } from '@/lib/types/product';
import { t } from '@/lib/i18n';
import DesignEditorFrame from '@/components/products/design/DesignEditorFrame';

export const dynamic = 'force-dynamic';

/** 「开始设计」：把 ERP 产品交给 Design Engine，保存后建产品草稿并进入同步页。 */
export default async function DesignPage({ params }: SyncPageProps) {
  const { id } = await params;
  const seller = await requireSeller();
  const { product, data } = await getProductDetail(id, seller.tier);
  if (!product || !getCatalogItem(product, seller.tier, data)) notFound();

  const origin = await getRequestOrigin();
  const editorUrl = buildEmbeddedEditorUrl(`${ERP_TEMPLATE_PREFIX}${product.id}`, cacheProductsForEditor([product]), origin);

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <h1 className="sr-only">{t('design.title')}</h1>
      <DesignEditorFrame
        creatorId={seller.id}
        editorUrl={editorUrl}
        engineOrigin={new URL(getDesignEngineUrl()).origin}
        backHref={`/products/${id}`}
      />
    </div>
  );
}
