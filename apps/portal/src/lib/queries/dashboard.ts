import { createClient } from '@/lib/supabase/server';
import { getOrders } from './orders';
import { getCreatorProfile } from './creators';
import { getRecommendedProducts } from './catalog';
import { aggregateOrderTotals } from '@/lib/utils';
import type { DashboardData } from '@/lib/types/dashboard';

export async function getDashboardData(creatorId: string, email: string): Promise<DashboardData> {
  const db = await createClient();
  const [profile, designs, published, orders, recommendedProducts] = await Promise.all([
    getCreatorProfile(creatorId),
    db.from('designs').select('*', { count: 'exact', head: true }).eq('creator_id', creatorId),
    db.from('sellable_product_instances').select('*', { count: 'exact', head: true }).eq('creator_id', creatorId).in('status', ['listed', 'published']),
    getOrders(creatorId),
    getRecommendedProducts().catch(error => { console.error('Failed to load recommendations', error); return []; }),
  ]);
  if (designs.error) throw new Error(designs.error.message);
  if (published.error) throw new Error(published.error.message);
  const totals = aggregateOrderTotals(orders);
  return { displayName: profile?.display_name || email, designCount: designs.count ?? 0,
    publishedCount: published.count ?? 0, totalOrders: totals.totalOrders, storeRevenue: totals.totalRevenue,
    storeEarnings: totals.totalEarnings, ordersRequiringAction: orders.filter(order => order.fulfillment_status !== 'fulfilled').length,
    recommendedProducts };
}
