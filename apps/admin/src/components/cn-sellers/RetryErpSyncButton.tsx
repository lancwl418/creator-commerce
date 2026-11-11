'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { retryCnSellerErpSyncAction } from '@/lib/cn-sellers/actions';
import { useT } from '@/lib/i18n/client';

/** ERP 同步失败的卖家：重新在 ERP 建客户档案。失败原因由列表里的错误信息显示。 */
export function RetryErpSyncButton({ sellerId }: { sellerId: string }) {
  const t = useT();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function retry() {
    setError(null);
    startTransition(async () => {
      const result = await retryCnSellerErpSyncAction(sellerId);
      if (result.error) setError(result.error);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={retry}
        disabled={isPending}
        className="mt-1 block text-xs font-medium text-primary-600 hover:text-primary-500 disabled:text-gray-300"
      >
        {isPending ? t('cnSellers.erp.retrying') : t('cnSellers.erp.retry')}
      </button>
      {error && <p className="mt-1 max-w-xs text-xs text-danger-600 break-words">{error}</p>}
    </>
  );
}
