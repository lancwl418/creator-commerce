import { requireSeller } from '@/lib/sellers/session';
import SiteHeader from '@/components/layout/SiteHeader';

export default async function ProductsLayout({ children }: { children: React.ReactNode }) {
  const seller = await requireSeller();
  return (
    <>
      <SiteHeader seller={seller} />
      {children}
    </>
  );
}
