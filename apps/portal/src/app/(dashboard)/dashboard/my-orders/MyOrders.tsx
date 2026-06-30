'use client';

import { useEffect, useState } from 'react';

interface OrderItem {
  title: string;
  variant: string | null;
  quantity: number;
  preview: string | null;
}
interface Order {
  id: number;
  name: string;
  createdAt: string;
  total: string;
  currency: string;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  statusUrl: string | null;
  items: OrderItem[];
}

export default function MyOrders() {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [linked, setLinked] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetch('/api/shopify/my-orders')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setState('error'); return; }
        setLinked(d.linked);
        setOrders(d.orders || []);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, []);

  if (state === 'loading') {
    return <div className="py-16 text-center text-sm text-gray-400">Loading your orders…</div>;
  }

  if (state === 'error') {
    return (
      <div className="rounded-2xl border border-border bg-white p-10 text-center">
        <p className="text-gray-500">Couldn&apos;t load your orders. Please try again later.</p>
      </div>
    );
  }

  if (!linked) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-white p-12 text-center">
        <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-ink" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
          </svg>
        </div>
        <p className="text-gray-900 font-medium mb-1">No linked store account yet</p>
        <p className="text-gray-500 text-sm max-w-md mx-auto">
          Orders you place on the ghostyle store with this email will show up here.
        </p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-white p-12 text-center">
        <p className="text-gray-500">No orders yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((o) => (
        <div key={o.id} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-sm font-bold text-gray-900">{o.name}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <FulfillmentBadge status={o.fulfillmentStatus} />
              <span className="text-sm font-bold text-gray-900">
                {o.currency === 'USD' ? '$' : ''}{Number(o.total).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            {o.items.map((it, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-surface-secondary overflow-hidden shrink-0 flex items-center justify-center">
                  {it.preview ? (
                    <img src={it.preview} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900 truncate">{it.title}</p>
                  {it.variant && <p className="text-[11px] text-gray-400">{it.variant}</p>}
                </div>
                <span className="text-xs text-gray-500 shrink-0">×{it.quantity}</span>
              </div>
            ))}
          </div>

          {o.statusUrl && (
            <div className="mt-4 pt-3 border-t border-border-light">
              <a
                href={o.statusUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-gray-900 underline underline-offset-2 hover:text-brand-600"
              >
                View order status →
              </a>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FulfillmentBadge({ status }: { status: string | null }) {
  const fulfilled = status === 'fulfilled';
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
        fulfilled ? 'bg-emerald-50 text-emerald-700' : 'bg-brand-100 text-ink'
      }`}
    >
      {fulfilled ? 'Fulfilled' : 'Processing'}
    </span>
  );
}
