import { redirect } from 'next/navigation';
import { getCurrentSeller } from '../queries/sellers';
import type { Seller } from '../types/seller';

/** 需要卖家身份的页面入口：没有登录或没有卖家账户时跳到登录页。 */
export async function requireSeller(): Promise<Seller> {
  const seller = await getCurrentSeller();
  if (!seller) redirect('/login');
  return seller;
}

/** 只给管理员的页面 / 操作：不是管理员的卖家回到选品页。 */
export async function requireAdmin(): Promise<Seller> {
  const seller = await requireSeller();
  if (!seller.isAdmin) redirect('/products');
  return seller;
}
