import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/creators/[id]/stats?range=last_month
 *
 * Returns aggregated financial stats for a creator within a time range.
 * Data source: creator_earnings_summary (monthly aggregation from ERP payout_ledger).
 *
 * Supported ranges:
 *   current_month, last_week, last_month, last_3_months, last_6_months, this_year, last_year
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: creatorId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const range = request.nextUrl.searchParams.get('range') || 'current_month';
  const { startDate, endDate, periods } = getDateRange(range);

  // Query creator_earnings_summary for the matching periods
  let query = supabase
    .from('creator_earnings_summary')
    .select('*')
    .eq('creator_id', creatorId);

  if (periods.length > 0) {
    query = query.in('period', periods);
  }

  const { data: earnings, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Aggregate across all matched periods and channels
  const summary = {
    total_orders: 0,
    total_units: 0,
    gross_revenue: 0,
    total_cost: 0,
    platform_fees: 0,
    creator_earnings: 0,
    platform_profit: 0,
    // Breakdown by channel
    by_channel: {} as Record<string, {
      total_orders: number;
      gross_revenue: number;
      total_cost: number;
      creator_earnings: number;
      platform_profit: number;
    }>,
    // Breakdown by period (for chart)
    by_period: {} as Record<string, {
      total_orders: number;
      gross_revenue: number;
      creator_earnings: number;
      platform_profit: number;
    }>,
  };

  for (const row of (earnings || [])) {
    const orders = row.total_orders || 0;
    const units = row.total_units || 0;
    const gross = parseFloat(row.gross_revenue) || 0;
    const cost = parseFloat(row.total_cost) || 0;
    const fees = parseFloat(row.platform_fees) || 0;
    const net = parseFloat(row.net_earnings) || 0;
    const platformProfit = gross - cost - net;

    summary.total_orders += orders;
    summary.total_units += units;
    summary.gross_revenue += gross;
    summary.total_cost += cost;
    summary.platform_fees += fees;
    summary.creator_earnings += net;
    summary.platform_profit += platformProfit;

    // By channel
    const ch = row.channel_type || 'unknown';
    if (!summary.by_channel[ch]) {
      summary.by_channel[ch] = { total_orders: 0, gross_revenue: 0, total_cost: 0, creator_earnings: 0, platform_profit: 0 };
    }
    summary.by_channel[ch].total_orders += orders;
    summary.by_channel[ch].gross_revenue += gross;
    summary.by_channel[ch].total_cost += cost;
    summary.by_channel[ch].creator_earnings += net;
    summary.by_channel[ch].platform_profit += platformProfit;

    // By period
    const p = row.period;
    if (!summary.by_period[p]) {
      summary.by_period[p] = { total_orders: 0, gross_revenue: 0, creator_earnings: 0, platform_profit: 0 };
    }
    summary.by_period[p].total_orders += orders;
    summary.by_period[p].gross_revenue += gross;
    summary.by_period[p].creator_earnings += net;
    summary.by_period[p].platform_profit += platformProfit;
  }

  // Round currency values
  summary.gross_revenue = round2(summary.gross_revenue);
  summary.total_cost = round2(summary.total_cost);
  summary.platform_fees = round2(summary.platform_fees);
  summary.creator_earnings = round2(summary.creator_earnings);
  summary.platform_profit = round2(summary.platform_profit);

  return NextResponse.json({
    range,
    start_date: startDate,
    end_date: endDate,
    periods,
    ...summary,
  });
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function getDateRange(range: string): { startDate: string; endDate: string; periods: string[] } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  let startDate: Date;
  let endDate: Date = now;

  switch (range) {
    case 'last_week': {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      break;
    }
    case 'last_month': {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0); // last day of prev month
      break;
    }
    case 'last_3_months': {
      startDate = new Date(year, month - 3, 1);
      break;
    }
    case 'last_6_months': {
      startDate = new Date(year, month - 6, 1);
      break;
    }
    case 'this_year': {
      startDate = new Date(year, 0, 1);
      break;
    }
    case 'last_year': {
      startDate = new Date(year - 1, 0, 1);
      endDate = new Date(year - 1, 11, 31);
      break;
    }
    case 'current_month':
    default: {
      startDate = new Date(year, month, 1);
      break;
    }
  }

  // Generate period strings (YYYY-MM) between start and end
  const periods: string[] = [];
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  while (cursor <= endDate) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    periods.push(`${y}-${m}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(startDate), endDate: fmt(endDate), periods };
}
