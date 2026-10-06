import { t } from '@/lib/i18n';

export default function MoqHint({ quantity, className = '' }: { quantity: number | null; className?: string }) {
  if (quantity == null) return null;
  return (
    <span className={`inline-block rounded-md bg-brand-50 text-brand-600 font-medium ${className}`}>
      {t('moq.hint', 'zh', { n: quantity })}
    </span>
  );
}
