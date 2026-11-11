// Admin 界面文案字典（英文 / 中文）。
// 目前覆盖 CN 卖家、CN 订单（含工厂推送）、侧边栏、顶栏和登录页；其余页面仍是英文原文。
// ERP / 工厂返回的数据和错误原文不翻译。

export type Locale = 'en' | 'zh';

export const LOCALES: Locale[] = ['en', 'zh'];
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'admin_locale';

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'zh';
}

const messages = {
  // 通用
  'common.signOut': { en: 'Sign out', zh: '退出登录' },
  'common.language': { en: 'Language', zh: '语言' },
  'common.save': { en: 'Save', zh: '保存' },
  'common.saving': { en: 'Saving…', zh: '保存中…' },
  'common.cancel': { en: 'Cancel', zh: '取消' },
  'common.edit': { en: 'Edit', zh: '编辑' },
  'common.search': { en: 'Search', zh: '搜索' },
  'common.updateFailed': { en: 'Update failed', zh: '更新失败' },
  'common.saveFailed': { en: 'Save failed', zh: '保存失败' },

  // 侧边栏
  'nav.brand': { en: 'Admin', zh: '管理后台' },
  'nav.console': { en: 'Admin Console', zh: '管理控制台' },
  'nav.openMenu': { en: 'Open menu', zh: '打开菜单' },
  'nav.closeMenu': { en: 'Close menu', zh: '关闭菜单' },
  'nav.section.overview': { en: 'Overview', zh: '概览' },
  'nav.section.creators': { en: 'Creators', zh: '创作者' },
  'nav.section.content': { en: 'Content', zh: '内容' },
  'nav.section.operations': { en: 'Operations', zh: '运营' },
  'nav.section.system': { en: 'System', zh: '系统' },
  'nav.dashboard': { en: 'Dashboard', zh: '仪表盘' },
  'nav.creators': { en: 'Creator Management', zh: '创作者管理' },
  'nav.recruitment': { en: 'Recruitment', zh: '招募' },
  'nav.cnSellers': { en: 'CN Sellers', zh: '中国卖家' },
  'nav.designs': { en: 'Design Review', zh: '设计审核' },
  'nav.products': { en: 'Products', zh: '产品' },
  'nav.channels': { en: 'Channels', zh: '渠道' },
  'nav.orders': { en: 'Orders', zh: '订单' },
  'nav.cnOrders': { en: 'CN Orders', zh: '中国卖家订单' },
  'nav.settlements': { en: 'Settlements', zh: '结算' },
  'nav.settings': { en: 'Settings', zh: '设置' },

  // 登录
  'login.title': { en: 'Admin Console', zh: '管理控制台' },
  'login.subtitle': { en: 'Sign in to the management dashboard', zh: '登录管理后台' },
  'login.email': { en: 'Email', zh: '邮箱' },
  'login.password': { en: 'Password', zh: '密码' },
  'login.passwordPlaceholder': { en: 'Enter your password', zh: '请输入密码' },
  'login.submit': { en: 'Sign in', zh: '登录' },
  'login.submitting': { en: 'Signing in...', zh: '登录中…' },

  // 中国卖家
  'cnSellers.title': { en: 'CN Sellers', zh: '中国卖家' },
  'cnSellers.subtitle': {
    en: 'Seller accounts from the CN portal. The tier decides which ERP price level they see; visible suppliers limit which ERP products appear in their catalog (none selected = all).',
    zh: '中国卖家平台的卖家账号。等级决定看到哪一档 ERP 价格；可见供应商限定目录里显示哪些 ERP 产品（不选 = 全部）。',
  },
  'cnSellers.searchPlaceholder': { en: 'Company, email or contact', zh: '公司名、邮箱或联系人' },
  'cnSellers.empty': { en: 'No sellers yet', zh: '还没有卖家' },
  'cnSellers.col.company': { en: 'Company', zh: '公司' },
  'cnSellers.col.contact': { en: 'Contact', zh: '联系人' },
  'cnSellers.col.tier': { en: 'Tier', zh: '等级' },
  'cnSellers.col.suppliers': { en: 'Visible suppliers', zh: '可见供应商' },
  'cnSellers.col.erp': { en: 'ERP', zh: 'ERP 同步' },
  'cnSellers.col.registered': { en: 'Registered', zh: '注册时间' },
  'cnSellers.erpLoadError': {
    en: "Could not load suppliers from ERP, so visible suppliers can't be edited right now. Reload to try again.",
    zh: '无法从 ERP 加载供应商，暂时不能编辑可见供应商。请刷新重试。',
  },
  'cnSellers.tierLabel': { en: 'Seller tier', zh: '卖家等级' },
  'cnSellers.tier.CN_MERCHANT': { en: 'China merchant', zh: '中国商家' },
  'cnSellers.tier.VIP': { en: 'VIP', zh: 'VIP' },
  'cnSellers.tier.WHOLESALE': { en: 'Wholesale', zh: '批发' },
  'cnSellers.tier.RETAIL': { en: 'Retail', zh: '零售' },
  'cnSellers.sync.synced': { en: 'synced', zh: '已同步' },
  'cnSellers.sync.pending': { en: 'pending', zh: '未同步' },
  'cnSellers.sync.failed': { en: 'failed', zh: '同步失败' },
  'cnSellers.suppliers.all': { en: 'All suppliers', zh: '全部供应商' },
  'cnSellers.suppliers.hint': {
    en: "Only selected suppliers' products are visible. Select none for all.",
    zh: '只显示勾选的供应商的产品；都不勾 = 全部。',
  },
  'cnSellers.suppliers.none': { en: 'No suppliers in the ERP catalog', zh: 'ERP 目录里没有供应商' },

  // 中国卖家订单
  'cnOrders.title': { en: 'CN Purchase Orders', zh: '中国卖家采购单' },
  'cnOrders.subtitle': {
    en: 'Blank / designed product orders placed by CN sellers. No online payment yet: confirm after arranging payment, then push to ERP.',
    zh: '中国卖家下的白板 / 设计产品采购单。暂无在线支付：安排好付款后确认，再推送。',
  },
  'cnOrders.back': { en: '← CN Purchase Orders', zh: '← 中国卖家采购单' },
  'cnOrders.tab.all': { en: 'All', zh: '全部' },
  'cnOrders.empty': { en: 'No purchase orders', zh: '没有采购单' },
  'cnOrders.status.pending_confirmation': { en: 'Pending', zh: '待确认' },
  'cnOrders.status.confirmed': { en: 'Confirmed', zh: '已确认' },
  'cnOrders.status.cancelled': { en: 'Cancelled', zh: '已取消' },
  'cnOrders.type.blank': { en: 'Blank', zh: '白板' },
  'cnOrders.type.designed': { en: 'Designed', zh: '带设计' },
  'cnOrders.fallbackTitle': { en: 'Order', zh: '订单' },
  'cnOrders.moreProducts': { en: '{first} + {count} more', zh: '{first} 等 {total} 个产品' },
  'cnOrders.unknownSeller': { en: 'Unknown seller', zh: '未知卖家' },
  'cnOrders.col.sku': { en: 'SKU', zh: 'SKU' },
  'cnOrders.col.options': { en: 'Options', zh: '规格' },
  'cnOrders.col.factory': { en: 'Factory', zh: '工厂' },
  'cnOrders.col.unit': { en: 'Unit', zh: '单价' },
  'cnOrders.col.qty': { en: 'Qty', zh: '数量' },
  'cnOrders.designedFaces': { en: 'designed ×{faces}', zh: '印花 ×{faces} 面' },
  'cnOrders.pieces': { en: '{count} pcs', zh: '共 {count} 件' },
  'cnOrders.shipTo': { en: 'Ship to: ', zh: '收货地址：' },
  'cnOrders.noPreview': { en: 'no preview', zh: '无预览' },
  'cnOrders.designFile': { en: 'design file', zh: '设计文件' },
  'cnOrders.note': { en: 'Note: {note}', zh: '备注：{note}' },
  'cnOrders.erpOrder': { en: 'ERP order #{id}', zh: 'ERP 订单 #{id}' },
  'cnOrders.confirm': { en: 'Confirm', zh: '确认' },
  'cnOrders.cancel': { en: 'Cancel', zh: '取消订单' },

  // 工厂状态同步
  'factorySync.button': { en: 'Sync factory status', zh: '同步工厂状态' },
  'factorySync.syncing': { en: 'Syncing…', zh: '同步中…' },
  'factorySync.checked': { en: '{count} checked', zh: '检查 {count} 单' },
  'factorySync.updated': { en: '{count} updated', zh: '更新 {count} 单' },
  'factorySync.errors': { en: '{count} errors: {first}', zh: '{count} 个错误：{first}' },

  // 推送工厂选择
  'pushSupplier.title': { en: "Push factory (cost for this order's quantities)", zh: '推送工厂（按本单数量计算的成本）' },
  'pushSupplier.noQuote': { en: 'no quote for {count} item(s)', zh: '{count} 个条目无报价' },
  'pushSupplier.sellerNickname': { en: ' (seller sees {name})', zh: '（卖家侧 {name}）' },
  'pushSupplier.default': { en: ' · default', zh: ' · 默认' },
  'pushSupplier.cheaper': { en: '{name} is cheaper by ${amount}', zh: '{name} 便宜 ${amount}' },
  'pushSupplier.custom': { en: 'custom', zh: '已改选' },

  // 工厂推送
  'factoryPush.title': {
    en: "Factory push (places the order in the factory's pending-push queue)",
    zh: '工厂推送（下单到工厂的「待推送」队列）',
  },
  'factoryPush.push': { en: 'Push to factory', zh: '推送到工厂' },
  'factoryPush.pushAgain': { en: 'Push again', zh: '再次推送' },
  'factoryPush.preparing': { en: 'Preparing…', zh: '准备中…' },
  'factoryPush.previewFailed': { en: 'Preview failed', zh: '预览失败' },
  'factoryPush.factory': { en: 'factory', zh: '工厂' },
  'factoryPush.placed': { en: 'placed {date}', zh: '下单于 {date}' },
  'factoryPush.sentBack': { en: ' — factory sent it back, needs attention', zh: ' — 工厂已退回，需要处理' },
  'factoryPush.tracking': { en: 'tracking {number}', zh: '运单号 {number}' },
  'factoryPush.console': { en: 'factory console', zh: '工厂后台' },
  'factoryPush.placedOk': {
    en: '{factory}: placed as {oid} — confirm & push to production in the factory console',
    zh: '{factory}：已下单 {oid}，请到工厂后台确认并推送生产',
  },
  'factoryPush.dialog.title': { en: 'Confirm factory push — CN{number}', zh: '确认推送工厂 — CN{number}' },
  'factoryPush.dialog.subtitle': {
    en: "This places a real order in the factory's pending-push queue. Review the shipping info and items before confirming.",
    zh: '这会在工厂的「待推送」队列里真实下单。确认前请核对收货信息和产品明细。',
  },
  'factoryPush.dialog.shipping': { en: 'Shipping', zh: '收货信息' },
  'factoryPush.dialog.items': { en: 'Items', zh: '产品明细' },
  'factoryPush.dialog.remark': { en: 'Remark to factory (max 20 chars)', zh: '给工厂的备注（最多 20 字）' },
  'factoryPush.dialog.alreadyPushed': { en: 'already pushed — will be skipped', zh: '已推送过，将跳过' },
  'factoryPush.dialog.col.factorySku': { en: 'Factory SKU', zh: '工厂 SKU' },
  'factoryPush.dialog.col.spec': { en: 'Spec', zh: '规格' },
  'factoryPush.dialog.col.print': { en: 'Print', zh: '印花' },
  'factoryPush.dialog.col.unit': { en: 'Unit', zh: '单价' },
  'factoryPush.dialog.col.qty': { en: 'Qty', zh: '数量' },
  'factoryPush.dialog.printInfo': { en: 'position {position} · {files} file(s)', zh: '位置 {position} · {files} 个文件' },
  'factoryPush.dialog.blank': { en: 'blank', zh: '白板' },
  'factoryPush.dialog.missing': { en: 'Missing: {fields}', zh: '缺少：{fields}' },
  'factoryPush.dialog.pushing': { en: 'Pushing…', zh: '推送中…' },
  'factoryPush.dialog.confirm': { en: 'Confirm push ({count})', zh: '确认推送（{count}）' },
  'factoryPush.field.name': { en: 'Name', zh: '收件人' },
  'factoryPush.field.phone': { en: 'Phone', zh: '电话' },
  'factoryPush.field.address1': { en: 'Address', zh: '地址' },
  'factoryPush.field.address2': { en: 'Address 2 (optional)', zh: '地址 2（选填）' },
  'factoryPush.field.city': { en: 'City', zh: '城市' },
  'factoryPush.field.province': { en: 'Province / State', zh: '省 / 州' },
  'factoryPush.field.zip': { en: 'ZIP / Post code', zh: '邮编' },
  'factoryPush.field.country': { en: 'Country', zh: '国家' },
} satisfies Record<string, Record<Locale, string>>;

export type MessageKey = keyof typeof messages;
export type MessageVars = Record<string, string | number>;
export type Translate = (key: MessageKey, vars?: MessageVars) => string;

/** 取文案并替换 {name} 占位符；缺变量时保留占位符原样。 */
export function translate(locale: Locale, key: MessageKey, vars?: MessageVars): string {
  const text: string = messages[key][locale];
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

export function createTranslator(locale: Locale): Translate {
  return (key, vars) => translate(locale, key, vars);
}

/** 日期格式化用的 BCP 47 语言标签 */
export function dateLocale(locale: Locale): string {
  return locale === 'zh' ? 'zh-CN' : 'en-US';
}
