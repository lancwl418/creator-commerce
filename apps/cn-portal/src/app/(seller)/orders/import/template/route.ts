import { IMPORT_TEMPLATE_CSV } from '@/lib/orders/import';

/** 表格下单模板（UTF-8 带 BOM，Excel 直接打开不乱码） */
export function GET() {
  return new Response(`﻿${IMPORT_TEMPLATE_CSV}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="cn-portal-order-template.csv"',
    },
  });
}
