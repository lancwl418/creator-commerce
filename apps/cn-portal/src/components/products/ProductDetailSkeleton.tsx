import Link from 'next/link';
import { t } from '@/lib/i18n';

export default function ProductDetailSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8" aria-busy="true">
      <Link href="/products" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
        ← {t('detail.back')}
      </Link>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4 animate-pulse">
        <div className="aspect-square rounded-2xl border border-border bg-white" />
        <div>
          <div className="h-6 w-3/4 rounded bg-gray-200" />
          <div className="h-3 w-24 rounded bg-gray-200 mt-2" />
          <div className="h-8 w-32 rounded bg-gray-200 mt-6" />
          <div className="space-y-3 mt-8">
            <div className="h-4 rounded bg-gray-200" />
            <div className="h-4 rounded bg-gray-200" />
            <div className="h-4 w-2/3 rounded bg-gray-200" />
          </div>
          <div className="h-11 rounded-xl bg-gray-200 mt-8" />
        </div>
      </div>
    </div>
  );
}
