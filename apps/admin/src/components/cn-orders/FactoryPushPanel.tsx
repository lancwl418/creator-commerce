'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { previewFactoryPushAction, pushOrderToFactoriesAction } from '@/lib/factory/actions';
import type { FactoryPushConsignee, FactoryPushOutcome, FactoryPushPlan } from '@/lib/factory/types';
import type { FactoryPushRow } from '@/lib/queries/cn-factory-pushes';

function formatDate(value: string): string {
  return new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const CONSIGNEE_FIELDS: { key: keyof FactoryPushConsignee; label: string; required: boolean; span?: boolean }[] = [
  { key: 'name', label: 'Name', required: true },
  { key: 'phone', label: 'Phone', required: true },
  { key: 'address1', label: 'Address', required: true, span: true },
  { key: 'address2', label: 'Address 2 (optional)', required: false, span: true },
  { key: 'city', label: 'City', required: true },
  { key: 'province', label: 'Province / State', required: true },
  { key: 'zip', label: 'ZIP / Post code', required: true },
  { key: 'country', label: 'Country', required: true },
];

/** 推送确认弹窗：先收货信息（可编辑，确认时回写订单），再产品明细；预览即所发 */
function ConfirmDialog({
  plan,
  isPending,
  onConfirm,
  onCancel,
}: {
  plan: FactoryPushPlan;
  isPending: boolean;
  onConfirm: (consignee: FactoryPushConsignee, remark: string) => void;
  onCancel: () => void;
}) {
  const [consignee, setConsignee] = useState<FactoryPushConsignee>(plan.consignee);
  const [remark, setRemark] = useState(plan.sellerRemark ?? '');
  const pushable = plan.groups.filter((g) => !g.alreadyPushed);
  const missing = CONSIGNEE_FIELDS.filter((f) => f.required && !consignee[f.key].trim());

  function set(key: keyof FactoryPushConsignee, value: string) {
    setConsignee((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900">Confirm factory push — CN{plan.orderNumber}</h3>
        <p className="text-xs text-gray-500 mt-1">
          This places a real order in the factory&apos;s pending-push queue. Review the shipping info and items before confirming.
        </p>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Shipping</p>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
            {CONSIGNEE_FIELDS.map((field) => (
              <label key={field.key} className={`block text-xs text-gray-500 ${field.span ? 'col-span-2' : ''}`}>
                {field.label}
                <input
                  type="text"
                  value={consignee[field.key]}
                  onChange={(event) => set(field.key, event.target.value)}
                  disabled={isPending}
                  className={`mt-1 w-full rounded-lg border px-2.5 py-1.5 text-sm text-gray-800 disabled:opacity-50 ${
                    field.required && !consignee[field.key].trim() ? 'border-danger-500 bg-danger-50' : 'border-border-light'
                  }`}
                />
              </label>
            ))}
            <label className="col-span-2 block text-xs text-gray-500">
              Remark to factory (max 20 chars)
              <input
                type="text"
                value={remark}
                maxLength={20}
                onChange={(event) => setRemark(event.target.value)}
                disabled={isPending}
                className="mt-1 w-full rounded-lg border border-border-light px-2.5 py-1.5 text-sm text-gray-800 disabled:opacity-50"
              />
            </label>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Items</p>
          {plan.groups.map((group) => (
            <div key={group.platformOid} className="mt-2 rounded-xl border border-border-light p-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{group.factoryName}</span>
                <span className="font-mono text-xs text-gray-500">{group.platformOid}</span>
                {group.alreadyPushed && (
                  <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">already pushed — will be skipped</span>
                )}
              </div>
              <table className="w-full text-sm mt-2">
                <thead>
                  <tr className="border-b border-border-light text-left text-xs text-gray-500">
                    <th className="px-2 py-1 font-medium">Factory SKU</th>
                    <th className="px-2 py-1 font-medium">Spec</th>
                    <th className="px-2 py-1 font-medium">Print</th>
                    <th className="px-2 py-1 font-medium">Unit</th>
                    <th className="px-2 py-1 font-medium">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((item, index) => (
                    <tr key={index} className="border-b border-border-light last:border-0">
                      <td className="px-2 py-1 font-mono text-xs text-gray-800">
                        {item.factorySku}
                        <span className="block font-sans text-xs text-gray-400">{item.title}</span>
                      </td>
                      <td className="px-2 py-1 text-gray-800">{item.spec}</td>
                      <td className="px-2 py-1 text-gray-800">
                        {item.shouldPrint ? `position ${item.printPosition} · ${item.printImages} file(s)` : 'blank'}
                      </td>
                      <td className="px-2 py-1 text-gray-800">${item.price.toFixed(2)}</td>
                      <td className="px-2 py-1 text-gray-800">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          {missing.length > 0 && (
            <span className="mr-auto text-xs text-danger-600">Missing: {missing.map((f) => f.label).join(', ')}</span>
          )}
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-lg border border-border-light px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(consignee, remark)}
            disabled={isPending || pushable.length === 0 || missing.length > 0}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {isPending ? 'Pushing…' : `Confirm push (${pushable.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 工厂推送：确认后的单可下到工厂「待推送」（RIIN 在其后台核对后再推生产，
 * Linmiao 需在其后台传面单）。点推送先弹窗预览报文内容，确认才真实下单；失败可重试。
 */
export function FactoryPushPanel({ orderId, pushes, canPush }: { orderId: string; pushes: FactoryPushRow[]; canPush: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [plan, setPlan] = useState<FactoryPushPlan | null>(null);
  const [outcomes, setOutcomes] = useState<FactoryPushOutcome[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function preview() {
    setError(null);
    setOutcomes(null);
    startTransition(async () => {
      const result = await previewFactoryPushAction(orderId);
      if (result.plan) setPlan(result.plan);
      else setError(result.error ?? 'Preview failed');
    });
  }

  function confirm(consignee: FactoryPushConsignee, remark: string) {
    startTransition(async () => {
      const result = await pushOrderToFactoriesAction(orderId, { consignee, remark });
      setPlan(null);
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
            onClick={preview}
            disabled={isPending}
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {isPending && !plan ? 'Preparing…' : pushes.length > 0 ? 'Push again' : 'Push to factory'}
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
              {push.order_status_str && (
                <span className={`rounded-md px-1.5 py-0.5 text-xs ${push.order_status === 3 ? 'bg-danger-50 text-danger-600 font-medium' : 'bg-gray-100 text-gray-600'}`}>
                  {push.order_status_str}
                  {push.order_status === 3 && ' — factory sent it back, needs attention'}
                </span>
              )}
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

      {plan && <ConfirmDialog plan={plan} isPending={isPending} onConfirm={confirm} onCancel={() => setPlan(null)} />}
    </div>
  );
}
