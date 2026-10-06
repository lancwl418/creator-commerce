import { t } from '@/lib/i18n';

interface ProductPriceProps {
  min: number | null;
  max?: number | null;
  from?: boolean;
  className?: string;
}

export default function ProductPrice({ min, max, from = false, className = '' }: ProductPriceProps) {
  if (min == null) return <span className="text-xs text-gray-400">{t('price.unavailable')}</span>;
  return (
    <span className={className}>
      ${min.toFixed(2)}
      {from && <span className="text-[10px] text-gray-400 ml-0.5">{t('price.from')}</span>}
      {!from && max != null && max !== min && (
        <span className="text-base font-medium text-gray-500"> – ${max.toFixed(2)}</span>
      )}
    </span>
  );
}
