import { redirect } from 'next/navigation';
import type { SyncPageProps } from '@/lib/types/product';

/** 旧「上传设计下单」入口：已并入统一下单页（设计可选） */
export default async function LegacyDesignedOrderPage({ params }: SyncPageProps) {
  const { id } = await params;
  redirect(`/products/${id}/order`);
}
