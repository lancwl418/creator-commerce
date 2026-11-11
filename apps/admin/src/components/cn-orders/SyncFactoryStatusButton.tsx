'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { syncFactoryStatusesAction } from '@/lib/factory/actions';
import { useT } from '@/lib/i18n/client';

/** 手动回查所有未完结推送的工厂状态/运单号 */
export function SyncFactoryStatusButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [summary, setSummary] = useState<string | null>(null);
  const t = useT();

  function sync() {
    setSummary(null);
    startTransition(async () => {
      const result = await syncFactoryStatusesAction();
      const parts = [t('factorySync.checked', { count: result.checked }), t('factorySync.updated', { count: result.updated })];
      if (result.errors.length > 0) parts.push(t('factorySync.errors', { count: result.errors.length, first: result.errors[0] }));
      setSummary(parts.join(' · '));
      if (result.updated > 0) router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={sync}
        disabled={isPending}
        className="rounded-xl border border-border-light bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
      >
        {isPending ? t('factorySync.syncing') : t('factorySync.button')}
      </button>
      {summary && <span className="text-xs text-gray-400">{summary}</span>}
    </div>
  );
}
