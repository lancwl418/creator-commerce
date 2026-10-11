import Link from 'next/link';
import { getCnOrders, parseCnOrderStatus } from '@/lib/queries/cn-orders';
import type { CnOrdersPageProps } from '@/lib/types/cn-order';
import { CnOrdersTable } from '@/components/cn-orders/CnOrdersTable';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending_confirmation', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default async function CnOrdersPage({ searchParams }: CnOrdersPageProps) {
  const { status } = await searchParams;
  const current = parseCnOrderStatus(status);
  const orders = await getCnOrders(current);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">CN Purchase Orders</h1>
        <p className="text-sm text-gray-500 mt-1">
          Blank / designed product orders placed by CN sellers. No online payment yet: confirm after arranging payment, then push to ERP.
        </p>
      </div>
      <div className="flex gap-2">
        {TABS.map((tab) => {
          const active = (current ?? 'all') === tab.key;
          return (
            <Link key={tab.key} href={tab.key === 'all' ? '/dashboard/cn-orders' : `/dashboard/cn-orders?status=${tab.key}`}
              className={`rounded-xl px-4 py-2 text-sm font-medium ${active ? 'bg-primary-600 text-white' : 'bg-white border border-border-light text-gray-600 hover:bg-gray-50'}`}>
              {tab.label}
            </Link>
          );
        })}
      </div>
      <CnOrdersTable orders={orders} />
    </div>
  );
}
