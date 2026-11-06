'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { pushOrderToFactoriesAction } from '@/lib/factory/actions';
import type { FactoryPushOutcome } from '@/lib/factory/types';
import type { FactoryPushRow } from '@/lib/queries/cn-factory-pushes';

function formatDate(value: string): string {
  return new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * 工厂推送：确认后的单可下到工厂「待推送」（RIIN 在其后台核对后再推生产，
 * Linmiao 需在其后台传面单）。展示已推记录，失败可直接重试。
 */
export function FactoryPushPanel({ orderId, pushes, canPush }: { orderId: string; pushes: FactoryPushRow[]; canPush: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [outcomes, setOutcomes] = useState<FactoryPushOutcome[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function push() {
    setError(null);
    setOutcomes(null);
    startTransition(async () => {
      const result = await pushOrderToFactoriesAction(orderId);
      setOutcomes(result.outcomes);
      setError(result.error ?? null);
      if (result.outcomes.some((o) => o.ok)) router.refresh();
    });
  }

  if (!canPush && pushes.length === 0) return null;

  return (
    <div className="mt-3 rounded-xl border border-border-light bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-gray-500">Factory push (places the order in the factory&apos;s pending-push queue)</p>
        {canPush && (
          <button
            type="button"
            onClick={push}
            disabled={isPending}
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {isPending ? 'Pushing…' : pushes.length > 0 ? 'Push again' : 'Push to factory'}
          </button>
        )}
      </div>

      {pushes.length > 0 && (
        <ul className="mt-2 space-y-1">
          {pushes.map((push) => (
            <li key={push.id} className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
              <span className="font-mono text-xs">{push.platform_oid}</span>
              <span className="text-xs text-gray-400">
                {push.cn_factory_suppliers?.name ?? 'factory'} · placed {formatDate(push.placed_at)}
              </span>
              {push.order_status_str && <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{push.order_status_str}</span>}
              {push.tracking_number && <span className="text-xs text-gray-500">tracking {push.tracking_number}</span>}
              {push.cn_factory_suppliers?.console_url && (
                <a href={push.cn_factory_suppliers.console_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 underline">
                  factory console
                </a>
              )}
              {push.last_error && <span className="text-xs text-danger-600">{push.last_error}</span>}
            </li>
          ))}
        </ul>
      )}

      {outcomes?.map((outcome) => (
        <p key={outcome.platformOid} className={`mt-2 text-xs ${outcome.ok ? 'text-success-600' : 'text-danger-600'}`}>
          {outcome.ok
            ? `${outcome.factoryName}: placed as ${outcome.platformOid} — confirm & push to production in the factory console`
            : `${outcome.factoryName}: ${outcome.error}`}
        </p>
      ))}
      {error && <p className="mt-2 text-xs text-danger-600">{error}</p>}
    </div>
  );
}
