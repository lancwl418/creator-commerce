import type { PriceTableView } from '@/lib/types/catalog';
import { t } from '@/lib/i18n';
import ProductPrice from './ProductPrice';

function facesLabel(faces: number): string {
  if (faces === 1) return t('priceTable.singleSided');
  if (faces === 2) return t('priceTable.doubleSided');
  return t('priceTable.sides', 'zh', { n: faces });
}

function VariantPriceTable({ table }: { table: PriceTableView }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-gray-500">
            <th className="px-4 py-2.5 font-medium">{t('priceTable.size')}</th>
            <th className="px-4 py-2.5 font-medium">{t('priceTable.color')}</th>
            {table.showBlankPrice && (
              <th className="px-4 py-2.5 font-medium whitespace-nowrap">{t('priceTable.blank')}</th>
            )}
            {table.columns.map((column) => (
              <th key={`${column.craftName}:${column.faces}`} className="px-4 py-2.5 font-medium whitespace-nowrap">
                {column.craftName} · {facesLabel(column.faces)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={`${row.sizes}:${row.colors}`} className="border-b border-border last:border-0 align-top">
              <td className="px-4 py-2.5 text-gray-800">{row.sizes}</td>
              <td className="px-4 py-2.5 text-gray-800">{row.colors ?? t('priceTable.allColors')}</td>
              {table.showBlankPrice && (
                <td className="px-4 py-2.5 whitespace-nowrap"><ProductPrice min={row.blankPrice} /></td>
              )}
              {row.printPrices.map((price, index) => (
                <td key={index} className="px-4 py-2.5 whitespace-nowrap">
                  {price == null ? <span className="text-gray-300">—</span> : <ProductPrice min={price} />}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function VariantPriceTables({ tables }: { tables: PriceTableView[] }) {
  if (tables.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold text-gray-800 mb-3">{t('priceTable.title')}</h2>
      <div className="space-y-4">
        {tables.map((table, index) => (
          <div key={index}>
            {tables.length > 1 && (
              <p className="text-xs text-gray-500 mb-1.5">{t('priceTable.option', 'zh', { n: index + 1 })}</p>
            )}
            <VariantPriceTable table={table} />
          </div>
        ))}
      </div>
    </section>
  );
}
