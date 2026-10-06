// PostgREST 默认只返回一页数据；明确分页，避免库存/可见性超过上限后丢行。
const PLATFORM_PAGE_SIZE = 1000;

interface QueryResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

export async function loadAllRows<T>(
  table: string,
  query: (from: number, to: number) => PromiseLike<QueryResult<T>>
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PLATFORM_PAGE_SIZE) {
    const result = await query(from, from + PLATFORM_PAGE_SIZE - 1);
    // 查询失败不能伪装成「库存尚未导入」或「默认全部可见」。
    if (result.error) throw new Error(`Failed to load ${table}: ${result.error.message}`);
    if (!result.data) throw new Error(`Failed to load ${table}: missing response data`);
    rows.push(...result.data);
    if (result.data.length < PLATFORM_PAGE_SIZE) return rows;
  }
}
