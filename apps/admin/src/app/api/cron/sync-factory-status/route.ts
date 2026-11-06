import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { syncFactoryPushStatuses } from '@/lib/factory/status-sync';

export const dynamic = 'force-dynamic';

/**
 * 定时回查工厂状态/运单号。外部调度器（Render Cron / cron-job.org）定时 POST，
 * 鉴权用 Authorization: Bearer <CRON_SECRET>；库访问走 service role（无用户会话）。
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' }, { status: 500 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { persistSession: false },
  });
  const result = await syncFactoryPushStatuses(supabase);
  return NextResponse.json(result);
}
