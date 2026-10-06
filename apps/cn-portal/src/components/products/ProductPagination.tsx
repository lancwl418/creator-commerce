import Link from 'next/link';
import { catalogUrl, catalogSearchParams } from '@/lib/catalog-query';
import type { CatalogSearchParams } from '@/lib/types/catalog';
import { t } from '@/lib/i18n';

interface ProductPaginationProps {
  searchParams: CatalogSearchParams;
  page: number;
  pages: number;
}

export default function ProductPagination({ searchParams, page, pages }: ProductPaginationProps) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <PageLink sp={searchParams} page={page - 1} disabled={page <= 1} label={t('pagination.previous')} />
      <span className="text-sm text-gray-500 px-3">{page} / {pages}</span>
      <PageLink sp={searchParams} page={page + 1} disabled={page >= pages} label={t('pagination.next')} />
    </div>
  );
}

function PageLink({
  sp,
  page,
  disabled,
  label,
}: {
  sp: CatalogSearchParams;
  page: number;
  disabled: boolean;
  label: string;
}) {
  if (disabled) {
    return (
      <span className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium text-gray-300 cursor-not-allowed">
        {label}
      </span>
    );
  }
  return (
    <Link
      href={catalogUrl(catalogSearchParams(sp), { page: String(page) })}
      className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
    >
      {label}
    </Link>
  );
}
