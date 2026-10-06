import type { ProductAttribute } from '@/lib/types/catalog';
import { t } from '@/lib/i18n';

export default function ProductAttributes({ attributes }: { attributes: ProductAttribute[] }) {
  if (attributes.length === 0) return null;
  return (
    <div className="mt-5">
      <h2 className="text-sm font-semibold text-gray-800 mb-2">
        {t('detail.attributes')}
      </h2>
      <table className="w-full text-sm">
        <tbody>
          {attributes.map((a) => (
            <tr key={a.label} className="border-b border-border last:border-0">
              <td className="py-1.5 text-gray-500 w-1/3">{a.label}</td>
              <td className="py-1.5 text-gray-800">{a.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
