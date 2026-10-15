import Link from 'next/link';
import { t } from '@/lib/i18n';

/**
 * 产品页入口：同步店铺暂未开放（置灰 + 即将上线）；下单统一走 /products/[id]/order，
 * 页内上传设计可选（不传 = 白板），也可从那里加入批量单。
 */
export default function ProductActions({ productId, canOrder }: { productId: string; canOrder: boolean }) {
  return (
    <div className="mt-6 space-y-3">
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-1.5">
          {t('actions.sync.title')}
          <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-400">{t('actions.comingSoon')}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-400 cursor-not-allowed" title={t('actions.comingSoon')}>
            {t('actions.sync.blank')}
          </span>
          <span className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-400 cursor-not-allowed" title={t('actions.comingSoon')}>
            {t('actions.sync.design')}
          </span>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-1.5">{t('actions.order.title')}</p>
        {canOrder ? (
          <Link href={`/products/${productId}/order`}
            className="inline-block rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-gray-900 hover:bg-brand-600 transition-all shadow-sm">
            {t('actions.order.start')}
          </Link>
        ) : (
          <span className="inline-block rounded-xl bg-gray-100 px-6 py-2.5 text-sm font-semibold text-gray-400" title={t('actions.order.unavailable')}>
            {t('actions.order.start')}
          </span>
        )}
        <p className="mt-1.5 text-xs text-gray-400">{t('order.unifiedHint')}</p>
      </div>
    </div>
  );
}
