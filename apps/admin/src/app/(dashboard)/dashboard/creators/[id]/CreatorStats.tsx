'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

const RANGES = [
  { key: 'current_month', label: 'Current Month' },
  { key: 'last_week', label: 'Last Week' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'last_3_months', label: 'Last 3 Months' },
  { key: 'last_6_months', label: 'Last 6 Months' },
  { key: 'this_year', label: 'This Year' },
  { key: 'last_year', label: 'Last Year' },
];

type ViewTab = 'overview' | 'platform' | 'design' | 'product';

const VIEW_TABS: { key: ViewTab; label: string; desc: string }[] = [
  { key: 'overview', label: 'Overview', desc: 'Overall financial summary' },
  { key: 'platform', label: 'By Platform', desc: 'IdeaMax, Shopify, Etsy, TikTok' },
  { key: 'design', label: 'By Design', desc: 'Designs sold on IdeaMax' },
  { key: 'product', label: 'By Product', desc: 'Products on creator stores' },
];

interface Stats {
  range: string;
  start_date: string;
  end_date: string;
  total_orders: number;
  total_units: number;
  gross_revenue: number;
  total_cost: number;
  platform_fees: number;
  creator_earnings: number;
  platform_profit: number;
  by_channel: Record<string, {
    total_orders: number;
    gross_revenue: number;
    total_cost: number;
    creator_earnings: number;
    platform_profit: number;
  }>;
  by_period: Record<string, {
    total_orders: number;
    gross_revenue: number;
    creator_earnings: number;
    platform_profit: number;
  }>;
}

interface DesignRow {
  id: string;
  title: string;
  status: string;
  products_count: number;
  listings_count: number;
  price: number | null;        // marketplace listing price
  cost: number | null;         // production cost
  royalty_rate: number;        // e.g. 0.15
  // Calculated
  orders: number;              // total orders (from ERP, 0 for now)
  total_revenue: number;       // orders * price
  creator_royalty: number;     // total_revenue * royalty_rate
  platform_profit: number;    // total_revenue - cost*orders - creator_royalty
}

interface ProductRow {
  id: string;
  title: string;
  status: string;
  retail_price: number | null;
  cost: number | null;
  channel: string;
  store_name: string | null;
  listing_status: string | null;
  preview_url: string | null;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export function CreatorStats({ creatorId }: { creatorId: string }) {
  const [range, setRange] = useState('current_month');
  const [view, setView] = useState<ViewTab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // Design & Product data
  const [designs, setDesigns] = useState<DesignRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loadingExtra, setLoadingExtra] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/creators/${creatorId}/stats?range=${range}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [creatorId, range]);

  const loadDesigns = useCallback(async () => {
    setLoadingExtra(true);
    const supabase = createClient();

    // Get royalty rate from operating_config
    const { data: configData } = await supabase
      .from('operating_config')
      .select('config_value')
      .eq('config_key', 'royalty_rates')
      .single();
    const royaltyRate = (configData?.config_value as { standard?: number })?.standard ?? 0.15;

    const { data } = await supabase
      .from('designs')
      .select('id, title, status, sellable_product_instances(id, retail_price, cost, channel_listings(id, price, status, channel_type))')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false });

    const mapped = (data || []).map(d => {
      const spi = d.sellable_product_instances as { id: string; retail_price: number | null; cost: number | null; channel_listings: { id: string; price: number | null; status: string; channel_type: string }[] }[] | null;
      const productsCount = spi?.length || 0;
      const allListings = spi?.flatMap(p => p.channel_listings || []) || [];
      const marketplaceListings = allListings.filter(l => l.channel_type === 'marketplace');
      const listingsCount = marketplaceListings.length;

      // Use marketplace listing price, fallback to retail_price
      const price = marketplaceListings.find(l => l.price != null)?.price
        ?? (spi || []).find(p => p.retail_price != null)?.retail_price
        ?? null;
      const cost = (spi || []).find(p => p.cost != null)?.cost ?? null;

      // TODO: real orders from ERP payout_ledger by design_id
      const orders = 0;
      const totalRevenue = price ? orders * price : 0;
      const creatorRoyalty = totalRevenue * royaltyRate;
      const platformProfit = totalRevenue - (cost ? orders * cost : 0) - creatorRoyalty;

      return {
        id: d.id,
        title: d.title,
        status: d.status,
        products_count: productsCount,
        listings_count: listingsCount,
        price,
        cost,
        royalty_rate: royaltyRate,
        orders,
        total_revenue: totalRevenue,
        creator_royalty: creatorRoyalty,
        platform_profit: platformProfit,
      };
    });
    setDesigns(mapped);
    setLoadingExtra(false);
  }, [creatorId]);

  const loadProducts = useCallback(async () => {
    setLoadingExtra(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('sellable_product_instances')
      .select('id, title, status, retail_price, cost, preview_urls, channel_listings(id, channel_type, status, price, creator_store_connections(store_name, platform))')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false });

    const rows: ProductRow[] = [];
    for (const p of (data || [])) {
      const listings = p.channel_listings as unknown as {
        id: string; channel_type: string; status: string; price: number;
        creator_store_connections: { store_name: string; platform: string }[] | { store_name: string; platform: string } | null;
      }[] | null;

      if (!listings || listings.length === 0) {
        rows.push({
          id: p.id,
          title: p.title || 'Untitled',
          status: p.status,
          retail_price: p.retail_price,
          cost: p.cost,
          channel: 'none',
          store_name: null,
          listing_status: null,
          preview_url: (p.preview_urls as string[])?.[0] || null,
        });
      } else {
        for (const l of listings) {
          const rawConn = l.creator_store_connections;
          const conn = Array.isArray(rawConn) ? rawConn[0] : rawConn;
          rows.push({
            id: p.id,
            title: p.title || 'Untitled',
            status: p.status,
            retail_price: l.price || p.retail_price,
            cost: p.cost,
            channel: l.channel_type === 'marketplace' ? 'ideamax' : (conn?.platform || l.channel_type),
            store_name: l.channel_type === 'marketplace' ? 'IdeaMax Marketplace' : (conn?.store_name || null),
            listing_status: l.status,
            preview_url: (p.preview_urls as string[])?.[0] || null,
          });
        }
      }
    }
    setProducts(rows);
    setLoadingExtra(false);
  }, [creatorId]);

  useEffect(() => {
    if (view === 'design' && designs.length === 0) loadDesigns();
    if (view === 'product' && products.length === 0) loadProducts();
  }, [view, designs.length, products.length, loadDesigns, loadProducts]);

  // Platform breakdown from channel_listings (real data)
  const [platformStats, setPlatformStats] = useState<{
    platform: string;
    store_name: string | null;
    listings: number;
    active: number;
    products: number;
  }[]>([]);

  const loadPlatformStats = useCallback(async () => {
    setLoadingExtra(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('channel_listings')
      .select('id, channel_type, status, sellable_product_instances!inner(creator_id), creator_store_connections(store_name, platform)')
      .eq('sellable_product_instances.creator_id', creatorId);

    const map: Record<string, { platform: string; store_name: string | null; listings: number; active: number; productIds: Set<string> }> = {};

    for (const row of (data || [])) {
      const rawConn = row.creator_store_connections as unknown as { store_name: string; platform: string }[] | { store_name: string; platform: string } | null;
      const conn = Array.isArray(rawConn) ? rawConn[0] : rawConn;
      const key = row.channel_type === 'marketplace' ? 'ideamax' : (conn?.platform || row.channel_type);
      const storeName = row.channel_type === 'marketplace' ? 'IdeaMax Marketplace' : (conn?.store_name || key);

      if (!map[key]) {
        map[key] = { platform: key, store_name: storeName, listings: 0, active: 0, productIds: new Set() };
      }
      map[key].listings++;
      if (row.status === 'active') map[key].active++;
      const spi = row.sellable_product_instances as unknown as { creator_id: string };
      if (spi) map[key].productIds.add(row.id);
    }

    setPlatformStats(Object.values(map).map(m => ({
      platform: m.platform,
      store_name: m.store_name,
      listings: m.listings,
      active: m.active,
      products: m.productIds.size,
    })));
    setLoadingExtra(false);
  }, [creatorId]);

  useEffect(() => {
    if (view === 'platform' && platformStats.length === 0) loadPlatformStats();
  }, [view, platformStats.length, loadPlatformStats]);

  const PLATFORM_COLORS: Record<string, string> = {
    ideamax: 'from-primary-500 to-primary-600',
    shopify: 'from-green-500 to-green-600',
    etsy: 'from-orange-500 to-orange-600',
    tiktok: 'from-gray-800 to-gray-900',
    marketplace: 'from-primary-500 to-primary-600',
    creator_store: 'from-green-500 to-green-600',
  };

  const PLATFORM_LABELS: Record<string, string> = {
    ideamax: 'IdeaMax',
    shopify: 'Shopify',
    etsy: 'Etsy',
    tiktok: 'TikTok Shop',
    marketplace: 'Marketplace',
    creator_store: 'Creator Store',
  };

  const DESIGN_STATUS: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-500',
    pending_review: 'bg-warning-50 text-warning-600',
    approved: 'bg-blue-50 text-blue-600',
    published: 'bg-success-50 text-success-600',
    rejected: 'bg-danger-50 text-danger-600',
  };

  const sortedPeriods = stats ? Object.keys(stats.by_period).sort() : [];
  const maxRevenue = sortedPeriods.length > 0
    ? Math.max(...sortedPeriods.map(p => stats!.by_period[p].gross_revenue), 1) : 1;

  return (
    <div className="bg-white rounded-2xl border border-border-light shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border-light">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Financial Overview</h2>
            {stats && (
              <p className="text-xs text-gray-400 mt-0.5">{stats.start_date} to {stats.end_date}</p>
            )}
          </div>
          <div className="flex gap-1 bg-surface-secondary rounded-xl p-1 overflow-x-auto">
            {RANGES.map((r) => (
              <button key={r.key} onClick={() => setRange(r.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  range === r.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex gap-1 mt-3 border-t border-border-light pt-3">
          {VIEW_TABS.map((t) => (
            <button key={t.key} onClick={() => setView(t.key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === t.key
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !stats ? (
          <p className="text-sm text-gray-400 text-center py-12">Failed to load stats</p>
        ) : (
          <>
            {/* ===== OVERVIEW ===== */}
            {view === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Orders" value={stats.total_orders.toString()} sub={`${stats.total_units} units`} color="from-blue-500 to-blue-600" />
                  <StatCard label="Gross Revenue" value={fmt(stats.gross_revenue)} sub={`Cost: ${fmt(stats.total_cost)}`} color="from-emerald-500 to-emerald-600" />
                  <StatCard label="Creator Profit" value={fmt(stats.creator_earnings)}
                    sub={stats.gross_revenue > 0 ? `${((stats.creator_earnings / stats.gross_revenue) * 100).toFixed(1)}% of revenue` : '-'}
                    color="from-violet-500 to-violet-600" />
                  <StatCard label="Platform Profit" value={fmt(stats.platform_profit)}
                    sub={stats.gross_revenue > 0 ? `${((stats.platform_profit / stats.gross_revenue) * 100).toFixed(1)}% margin` : '-'}
                    color="from-amber-500 to-amber-600" />
                </div>

                {sortedPeriods.length > 1 && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-3">Revenue by Period</p>
                    <div className="flex items-end gap-2 h-28">
                      {sortedPeriods.map((period) => {
                        const d = stats.by_period[period];
                        const heightPct = (d.gross_revenue / maxRevenue) * 100;
                        return (
                          <div key={period} className="flex-1 flex flex-col items-center gap-1">
                            <p className="text-[10px] text-gray-500 font-medium">{fmt(d.gross_revenue)}</p>
                            <div className="w-full relative" style={{ height: '80px' }}>
                              <div className="absolute bottom-0 w-full bg-gradient-to-t from-primary-500 to-primary-400 rounded-t-md transition-all"
                                style={{ height: `${Math.max(heightPct, 2)}%` }} />
                            </div>
                            <p className="text-[10px] text-gray-400">{period.slice(5)}/{period.slice(2, 4)}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {stats.total_orders === 0 && (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-400">No financial data for this period</p>
                    <p className="text-xs text-gray-300 mt-1">Data syncs from ERP payout ledger periodically</p>
                  </div>
                )}
              </div>
            )}

            {/* ===== BY PLATFORM ===== */}
            {view === 'platform' && (
              <div className="space-y-5">
                {/* Earnings by channel from API */}
                {Object.keys(stats.by_channel).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-3">Earnings by Channel</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border-light">
                            <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500">Channel</th>
                            <th className="text-right py-2 px-4 text-xs font-semibold text-gray-500">Orders</th>
                            <th className="text-right py-2 px-4 text-xs font-semibold text-gray-500">Revenue</th>
                            <th className="text-right py-2 px-4 text-xs font-semibold text-gray-500">Cost</th>
                            <th className="text-right py-2 px-4 text-xs font-semibold text-gray-500">Creator</th>
                            <th className="text-right py-2 pl-4 text-xs font-semibold text-gray-500">Platform</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(stats.by_channel).map(([ch, data]) => (
                            <tr key={ch} className="border-b border-border-light last:border-0">
                              <td className="py-2.5 pr-4">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${PLATFORM_COLORS[ch] || 'from-gray-400 to-gray-500'}`} />
                                  <span className="text-gray-700 font-medium">{PLATFORM_LABELS[ch] || ch}</span>
                                </div>
                              </td>
                              <td className="text-right py-2.5 px-4 text-gray-600">{data.total_orders}</td>
                              <td className="text-right py-2.5 px-4 text-gray-600">{fmt(data.gross_revenue)}</td>
                              <td className="text-right py-2.5 px-4 text-gray-400">{fmt(data.total_cost)}</td>
                              <td className="text-right py-2.5 px-4 text-violet-600 font-medium">{fmt(data.creator_earnings)}</td>
                              <td className="text-right py-2.5 pl-4 text-amber-600 font-medium">{fmt(data.platform_profit)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Listing distribution by platform */}
                <div>
                  <p className="text-xs font-medium text-gray-400 mb-3">Listing Distribution</p>
                  {loadingExtra ? (
                    <div className="flex justify-center py-8">
                      <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : platformStats.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">No listings on any platform</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {platformStats.map((p) => (
                        <div key={p.platform} className="rounded-xl border border-border-light p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${PLATFORM_COLORS[p.platform] || 'from-gray-400 to-gray-500'}`} />
                            <p className="text-sm font-semibold text-gray-900">{PLATFORM_LABELS[p.platform] || p.platform}</p>
                          </div>
                          {p.store_name && p.platform !== 'ideamax' && (
                            <p className="text-xs text-gray-400 -mt-2 mb-2 ml-5">{p.store_name}</p>
                          )}
                          <div className="flex gap-4">
                            <div>
                              <p className="text-lg font-bold text-gray-900">{p.listings}</p>
                              <p className="text-[10px] text-gray-400">listings</p>
                            </div>
                            <div>
                              <p className="text-lg font-bold text-success-600">{p.active}</p>
                              <p className="text-[10px] text-gray-400">active</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ===== BY DESIGN ===== */}
            {view === 'design' && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Designs sold on <strong>IdeaMax Marketplace</strong> with royalty model.</p>
              {designs.length > 0 && (
                <p className="text-xs text-gray-300 mb-4">
                  Royalty rate: <strong className="text-gray-500">{(designs[0].royalty_rate * 100).toFixed(0)}%</strong> to creator
                </p>
              )}
                {loadingExtra ? (
                  <div className="flex justify-center py-8">
                    <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : designs.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No designs</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border-light">
                          <th className="text-left py-2 pr-3 text-xs font-semibold text-gray-500">Design</th>
                          <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500">Status</th>
                          <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500">Price</th>
                          <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500">Cost</th>
                          <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500">Orders</th>
                          <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500">Revenue</th>
                          <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500">Creator ({(designs[0]?.royalty_rate * 100).toFixed(0)}%)</th>
                          <th className="text-right py-2 pl-2 text-xs font-semibold text-gray-500">Our Profit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {designs.map((d) => {
                          const margin = d.price && d.cost ? d.price - d.cost : null;
                          return (
                            <tr key={d.id} className="border-b border-border-light last:border-0 hover:bg-surface-hover transition-colors">
                              <td className="py-2.5 pr-3">
                                <p className="text-gray-900 font-medium truncate max-w-[180px]">{d.title}</p>
                                <p className="text-[10px] text-gray-400">{d.products_count} products · {d.listings_count} listings</p>
                              </td>
                              <td className="py-2.5 px-2">
                                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${DESIGN_STATUS[d.status] || 'bg-gray-100 text-gray-500'}`}>
                                  {d.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="text-right py-2.5 px-2 text-gray-900 font-medium">
                                {d.price != null ? fmt(d.price) : <span className="text-gray-300">-</span>}
                              </td>
                              <td className="text-right py-2.5 px-2 text-gray-400">
                                {d.cost != null ? (
                                  <span>
                                    {fmt(d.cost)}
                                    {margin != null && (
                                      <span className="text-[10px] text-gray-300 block">
                                        margin {fmt(margin)}
                                      </span>
                                    )}
                                  </span>
                                ) : <span className="text-gray-300">-</span>}
                              </td>
                              <td className="text-right py-2.5 px-2 text-gray-600">
                                {d.orders > 0 ? d.orders : <span className="text-gray-300">0</span>}
                              </td>
                              <td className="text-right py-2.5 px-2 text-gray-600">
                                {d.total_revenue > 0 ? fmt(d.total_revenue) : <span className="text-gray-300">$0.00</span>}
                              </td>
                              <td className="text-right py-2.5 px-2 text-violet-600 font-medium">
                                {d.creator_royalty > 0 ? fmt(d.creator_royalty) : (
                                  d.price != null ? (
                                    <span className="text-gray-300 font-normal text-[11px]">
                                      {fmt(d.price * d.royalty_rate)}/sale
                                    </span>
                                  ) : <span className="text-gray-300">-</span>
                                )}
                              </td>
                              <td className="text-right py-2.5 pl-2 text-amber-600 font-medium">
                                {d.platform_profit > 0 ? fmt(d.platform_profit) : (
                                  d.price != null && d.cost != null ? (
                                    <span className="text-gray-300 font-normal text-[11px]">
                                      {fmt(d.price - d.cost - d.price * d.royalty_rate)}/sale
                                    </span>
                                  ) : <span className="text-gray-300">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {/* Totals row */}
                      {designs.some(d => d.orders > 0) && (
                        <tfoot>
                          <tr className="border-t-2 border-border bg-surface-secondary">
                            <td colSpan={4} className="py-2.5 pr-3 text-xs font-semibold text-gray-500">Total</td>
                            <td className="text-right py-2.5 px-2 font-semibold text-gray-900">
                              {designs.reduce((s, d) => s + d.orders, 0)}
                            </td>
                            <td className="text-right py-2.5 px-2 font-semibold text-gray-900">
                              {fmt(designs.reduce((s, d) => s + d.total_revenue, 0))}
                            </td>
                            <td className="text-right py-2.5 px-2 font-semibold text-violet-600">
                              {fmt(designs.reduce((s, d) => s + d.creator_royalty, 0))}
                            </td>
                            <td className="text-right py-2.5 pl-2 font-semibold text-amber-600">
                              {fmt(designs.reduce((s, d) => s + d.platform_profit, 0))}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ===== BY PRODUCT ===== */}
            {view === 'product' && (
              <div>
                <p className="text-xs text-gray-400 mb-4">Products distributed across creator&apos;s connected stores (Shopify, Etsy, TikTok) and IdeaMax.</p>
                {loadingExtra ? (
                  <div className="flex justify-center py-8">
                    <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : products.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No products</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border-light">
                          <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500">Product</th>
                          <th className="text-left py-2 px-4 text-xs font-semibold text-gray-500">Platform</th>
                          <th className="text-right py-2 px-4 text-xs font-semibold text-gray-500">Price</th>
                          <th className="text-right py-2 px-4 text-xs font-semibold text-gray-500">Cost</th>
                          <th className="text-right py-2 px-4 text-xs font-semibold text-gray-500">Margin</th>
                          <th className="text-left py-2 pl-4 text-xs font-semibold text-gray-500">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((p, i) => {
                          const margin = p.retail_price && p.cost ? p.retail_price - p.cost : null;
                          return (
                            <tr key={`${p.id}-${i}`} className="border-b border-border-light last:border-0 hover:bg-surface-hover transition-colors">
                              <td className="py-2.5 pr-4">
                                <div className="flex items-center gap-2.5">
                                  {p.preview_url ? (
                                    <img src={p.preview_url} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-md bg-gray-100 shrink-0" />
                                  )}
                                  <p className="text-gray-900 font-medium truncate max-w-[180px]">{p.title}</p>
                                </div>
                              </td>
                              <td className="py-2.5 px-4">
                                <div className="flex items-center gap-1.5">
                                  <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${PLATFORM_COLORS[p.channel] || 'from-gray-400 to-gray-500'}`} />
                                  <span className="text-gray-600 text-xs">{PLATFORM_LABELS[p.channel] || p.channel}</span>
                                </div>
                                {p.store_name && p.channel !== 'ideamax' && (
                                  <p className="text-[10px] text-gray-400 ml-3.5">{p.store_name}</p>
                                )}
                              </td>
                              <td className="text-right py-2.5 px-4 text-gray-900 font-medium">
                                {p.retail_price ? fmt(p.retail_price) : '-'}
                              </td>
                              <td className="text-right py-2.5 px-4 text-gray-400">
                                {p.cost ? fmt(p.cost) : '-'}
                              </td>
                              <td className={`text-right py-2.5 px-4 font-medium ${margin && margin > 0 ? 'text-success-600' : 'text-gray-400'}`}>
                                {margin ? fmt(margin) : '-'}
                              </td>
                              <td className="py-2.5 pl-4">
                                {p.listing_status ? (
                                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${
                                    p.listing_status === 'active' ? 'bg-success-50 text-success-600' :
                                    p.listing_status === 'pending' ? 'bg-warning-50 text-warning-600' :
                                    p.listing_status === 'error' ? 'bg-danger-50 text-danger-600' :
                                    'bg-gray-100 text-gray-500'
                                  }`}>
                                    {p.listing_status}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-gray-300">not listed</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border-light p-4">
      <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${color} opacity-5 rounded-bl-[40px]`} />
      <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}
