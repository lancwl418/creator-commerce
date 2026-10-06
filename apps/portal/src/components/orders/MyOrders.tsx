'use client';

import { useMyOrders } from '@/hooks/orders/useMyOrders';
import EmptyState from '@/components/ui/EmptyState';
import OrderCard from './OrderCard';

export default function MyOrders() {
  const state = useMyOrders();

  if (state.status === 'loading') {
    return <div className="py-16 text-center text-sm text-gray-400">Loading your orders…</div>;
  }

  if (state.status === 'error') {
    return (
      <div className="rounded-2xl border border-border bg-white p-10 text-center">
        <p className="text-gray-500">Couldn&apos;t load your orders. Please try again later.</p>
      </div>
    );
  }

  if (!state.linked) {
    return (
      <EmptyState>
        <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-ink" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
          </svg>
        </div>
        <p className="text-gray-900 font-medium mb-1">No linked store account yet</p>
        <p className="text-gray-500 text-sm max-w-md mx-auto">
          Orders you place on the ghostyle store with this email will show up here.
        </p>
      </EmptyState>
    );
  }

  if (state.orders.length === 0) {
    return (
      <EmptyState>
        <p className="text-gray-500">No orders yet.</p>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      {state.orders.map((order) => <OrderCard key={order.id} order={order} />)}
    </div>
  );
}
