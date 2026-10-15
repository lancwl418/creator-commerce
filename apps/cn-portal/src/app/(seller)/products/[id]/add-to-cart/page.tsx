import { redirect } from 'next/navigation';
import type { SyncPageProps } from '@/lib/types/product';

/** 旧「加入批量单」入口：已并入统一下单页（页内按钮加入批量单） */
export default async function LegacyAddToCartPage({ params }: SyncPageProps) {
  const { id } = await params;
  redirect(`/products/${id}/order`);
}
