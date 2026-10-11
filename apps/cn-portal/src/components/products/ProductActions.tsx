import Link from 'next/link';
import { t } from '@/lib/i18n';

/**
 * 产品页两个入口（2026-10-11 方案）：同步店铺（开始设计 / 仅同步白板）、下单（上传设计 / 白板下单）。
 * 目前只有「仅同步白板」可用，其余待后续步骤接入。
 */
export default function ProductActions({ productId, canSyncBlank }: { productId: string; canSyncBlank: boolean }) {
  return (
    <div className="mt-6 space-y-3">
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-1.5">{t('actions.sync.title')}</p>
        <div className="flex flex-wrap gap-2">
          {canSyncBlank ? (
            <Link href={`/products/${productId}/sync`}
              className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-brand-600 transition-all shadow-sm">
              {t('actions.sync.blank')}
            </Link>
          ) : (
            <span className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-400" title={t('actions.sync.blankUnavailable')}>
              {t('actions.sync.blank')}
            </span>
          )}
          <span className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-gray-400">{t('actions.sync.design')} · {t('actions.comingSoon')}</span>
        </div>
        {!canSyncBlank && <p className="mt-1 text-xs text-gray-400">{t('actions.sync.blankUnavailable')}</p>}
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-1.5">{t('actions.order.title')}</p>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-gray-400">{t('actions.order.design')} · {t('actions.comingSoon')}</span>
          <span className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-gray-400">{t('actions.order.blank')} · {t('actions.comingSoon')}</span>
        </div>
      </div>
    </div>
  );
}
