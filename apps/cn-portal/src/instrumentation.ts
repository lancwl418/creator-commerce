/** Next 在服务进程启动时调用一次：预热 ERP 目录缓存，之后定时后台刷新。 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (!process.env.ERP_API_BASE_URL) return; // 构建 / 本地没配 ERP 时跳过
  const { keepErpProductsWarm } = await import('./lib/erp-products.server');
  keepErpProductsWarm();
}
