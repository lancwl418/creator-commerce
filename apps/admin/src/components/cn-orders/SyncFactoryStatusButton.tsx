'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { syncFactoryStatusesAction } from '@/lib/factory/actions';

/** 手动回查所有未完结推送的工厂状态/运单号 */
export function SyncFactoryStatusButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [summary, setSummary] = useState<string | null>(null);

  function sync() {
    setSummary(null);
    startTransition(async () => {
      const result = await syncFactoryStatusesAction();
      const parts = [`${result.checked} checked`, `${result.updated} updated`];
      if (result.errors.length > 0) parts.push(`${result.errors.length} errors: ${result.errors[0]}`);
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
        {isPending ? 'Syncing…' : 'Sync factory status'}
      </button>
      {summary && <span className="text-xs text-gray-400">{summary}</span>}
    </div>
  );
}
