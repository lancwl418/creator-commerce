// 界面文案字典。中文为主、英文为第二语言（文档 5.3）。
// 产品名称与属性不在此翻译 —— 保持 ERP 英文原文。

export type Locale = 'zh' | 'en';

export const DEFAULT_LOCALE: Locale = 'zh';

const dict = {
  'app.title': { zh: '选品平台', en: 'Product Catalog' },
  'app.description': { zh: '中国卖家上架选品系统', en: 'Product catalog for Chinese sellers' },
  'nav.products': { zh: '选品', en: 'Products' },
  'nav.stores': { zh: '我的店铺', en: 'My store' },

  // 店铺连接
  'stores.title': { zh: '我的店铺', en: 'My store' },
  'stores.subtitle': { zh: '连接你的 Shopify 店铺，选品后可以直接同步上架、接收订单', en: 'Connect your Shopify store to sync products and receive orders' },
  'stores.shopify.description': { zh: '把选中的产品同步到你的 Shopify 店铺', en: 'Sync products to your Shopify store' },
  'stores.shopify.domainLabel': { zh: 'Shopify 店铺域名', en: 'Shopify store domain' },
  'stores.shopify.connect': { zh: '连接 Shopify', en: 'Connect Shopify' },
  'stores.disconnect': { zh: '断开连接', en: 'Disconnect' },
  'stores.disconnecting': { zh: '断开中…', en: 'Disconnecting…' },
  'stores.field.store': { zh: '店铺：', en: 'Store:' },
  'stores.field.url': { zh: '地址：', en: 'URL:' },
  'stores.field.connectedAt': { zh: '连接时间：', en: 'Connected:' },
  'stores.status.connected': { zh: '已连接', en: 'Connected' },
  'stores.status.disconnected': { zh: '未连接', en: 'Disconnected' },
  'stores.status.expired': { zh: '授权已过期', en: 'Expired' },
  'stores.status.error': { zh: '连接异常', en: 'Error' },
  'stores.help': {
    zh: '连接通过 Shopify 官方授权完成，我们不会保存你的店铺密码。连接后在产品详情页即可同步产品。',
    en: 'Connection uses Shopify OAuth; we never store your password. Once connected, sync products from the product page.',
  },
  'stores.notice.connected': { zh: 'Shopify 店铺已连接', en: 'Shopify store connected' },
  'stores.error.invalidShop': { zh: '请输入正确的 Shopify 店铺域名，例如 mystore.myshopify.com', en: 'Enter a valid Shopify domain, e.g. mystore.myshopify.com' },
  'stores.error.missingParams': { zh: '授权回调缺少参数，请重新连接', en: 'Authorization callback is missing parameters, please try again' },
  'stores.error.invalidState': { zh: '授权校验失败，请重新连接', en: 'Authorization check failed, please try again' },
  'stores.error.sessionExpired': { zh: '登录状态已过期，请重新登录后再连接', en: 'Session expired, sign in and try again' },
  'stores.error.invalidHmac': { zh: '授权签名校验失败，请重新连接', en: 'Authorization signature check failed, please try again' },
  'stores.error.tokenExchange': { zh: '获取 Shopify 授权失败，请稍后再试', en: 'Could not obtain Shopify access, please try again later' },
  'stores.error.saveFailed': { zh: '保存店铺信息失败，请稍后再试', en: 'Could not save the store, please try again later' },
  'stores.error.generic': { zh: '操作失败，请稍后再试', en: 'Something went wrong, please try again' },
  'image.empty': { zh: '暂无图片', en: 'No image' },
  'pagination.previous': { zh: '上一页', en: 'Previous' },
  'pagination.next': { zh: '下一页', en: 'Next' },

  // 列表页
  'list.title': { zh: '产品选品', en: 'Browse Products' },
  'list.count': { zh: '共 {n} 件产品', en: '{n} products' },
  'list.empty': { zh: '暂无符合条件的产品', en: 'No products match your filters' },
  'list.loadError': { zh: '产品加载失败', en: 'Failed to load products' },

  // 筛选 / 排序（文档 5.1）
  'filter.category': { zh: '品类', en: 'Category' },
  'filter.category.all': { zh: '全部', en: 'All' },
  'filter.priceRange': { zh: '价格区间', en: 'Price range' },
  'filter.priceMin': { zh: '最低价', en: 'Min' },
  'filter.priceMax': { zh: '最高价', en: 'Max' },
  'filter.inStockOnly': { zh: '仅看有货', en: 'In stock only' },
  'filter.apply': { zh: '筛选', en: 'Apply' },
  'filter.reset': { zh: '重置', en: 'Reset' },
  'sort.label': { zh: '排序', en: 'Sort' },
  'sort.newest': { zh: '新上架', en: 'Newest' },
  'sort.priceAsc': { zh: '价格从低到高', en: 'Price: low to high' },
  'sort.priceDesc': { zh: '价格从高到低', en: 'Price: high to low' },

  // 卡片 / 价格
  'price.from': { zh: '起', en: 'from' },
  'price.unavailable': { zh: '暂无报价', en: 'Price unavailable' },
  'moq.hint': { zh: '{n} 件起订', en: 'MOQ {n}' },

  // 详情页（文档 5.2）
  'detail.attributes': { zh: '产品属性', en: 'Attributes' },
  'detail.price': { zh: '价格', en: 'Price' },
  'detail.productionTime': { zh: '生产周期', en: 'Production time' },
  'detail.shipFrom': { zh: '发货地', en: 'Ship from' },
  'detail.shipFromNote': {
    zh: '发货地址固定，不可修改。',
    en: 'Ship-from address is fixed and cannot be changed.',
  },
  'priceTable.title': { zh: '价格明细', en: 'Price details' },
  'priceTable.option': { zh: '报价方案 {n}', en: 'Pricing option {n}' },
  'priceTable.size': { zh: '尺码', en: 'Size' },
  'priceTable.color': { zh: '颜色', en: 'Color' },
  'priceTable.allColors': { zh: '全部颜色', en: 'All colors' },
  'priceTable.blank': { zh: '空白件', en: 'Blank' },
  'priceTable.singleSided': { zh: '单面', en: '1 side' },
  'priceTable.doubleSided': { zh: '双面', en: '2 sides' },
  'priceTable.sides': { zh: '{n} 面', en: '{n} sides' },
  'detail.addToCart': { zh: '加入购物车', en: 'Add to cart' },
  'detail.cartPending': { zh: '下单模块开发中，稍后接入。', en: 'Ordering is under development.' },
  'detail.back': { zh: '返回选品', en: 'Back to products' },
  'detail.notFound': { zh: '产品不存在或已下架', en: 'Product not found or delisted' },

  // 卖家等级
  'tier.VIP': { zh: 'VIP 等级价', en: 'VIP price' },
  'tier.WHOLESALE': { zh: '批发商等级价', en: 'Wholesale price' },
  'tier.CN_MERCHANT': { zh: '中国商家等级价', en: 'China merchant price' },

  // 注册 / 登录
  'auth.login.title': { zh: '登录选品平台', en: 'Sign in' },
  'auth.login.subtitle': { zh: '登录后按您的账户等级查看价格', en: 'Sign in to see prices for your account level' },
  'auth.login.submit': { zh: '登录', en: 'Sign in' },
  'auth.login.pending': { zh: '登录中…', en: 'Signing in…' },
  'auth.login.noAccount': { zh: '还没有账户？', en: 'No account yet?' },
  'auth.login.forgot': { zh: '忘记密码？', en: 'Forgot password?' },
  'auth.forgot.title': { zh: '找回密码', en: 'Reset your password' },
  'auth.forgot.subtitle': { zh: '输入注册邮箱，我们会发送重设密码的链接', en: 'Enter your email and we will send a reset link' },
  'auth.forgot.submit': { zh: '发送重设链接', en: 'Send reset link' },
  'auth.forgot.pending': { zh: '发送中…', en: 'Sending…' },
  'auth.forgot.remembered': { zh: '想起密码了？', en: 'Remembered your password?' },
  'auth.reset.title': { zh: '设置新密码', en: 'Set a new password' },
  'auth.reset.subtitle': { zh: '设置后将直接登录', en: 'You will be signed in after saving' },
  'auth.reset.submit': { zh: '保存新密码', en: 'Save password' },
  'auth.reset.pending': { zh: '保存中…', en: 'Saving…' },
  'auth.register.title': { zh: '创建卖家账户', en: 'Create a seller account' },
  'auth.register.subtitle': { zh: '注册后即可浏览选品和价格', en: 'Register to browse products and prices' },
  'auth.register.submit': { zh: '注册', en: 'Register' },
  'auth.register.pending': { zh: '注册中…', en: 'Registering…' },
  'auth.register.hasAccount': { zh: '已有账户？', en: 'Already have an account?' },
  'auth.field.companyName': { zh: '公司名称', en: 'Company name' },
  'auth.field.contactName': { zh: '联系人', en: 'Contact name' },
  'auth.field.phone': { zh: '手机号', en: 'Phone' },
  'auth.field.email': { zh: '邮箱', en: 'Email' },
  'auth.field.password': { zh: '密码', en: 'Password' },
  'auth.field.passwordHint': { zh: '至少 {n} 位', en: 'At least {n} characters' },
  'auth.field.newPassword': { zh: '新密码', en: 'New password' },
  'auth.field.passwordConfirm': { zh: '再次输入新密码', en: 'Confirm new password' },
  'auth.signOut': { zh: '退出登录', en: 'Sign out' },
  'auth.notice.confirmEmail': {
    zh: '注册成功。请查收验证邮件，验证后即可登录。',
    en: 'Registered. Check your inbox to verify your email, then sign in.',
  },
  'auth.notice.resetEmailSent': {
    zh: '如果该邮箱已注册，重设密码的链接已发出，请查收邮件。',
    en: 'If this email is registered, a reset link has been sent.',
  },
  'auth.error.passwordMismatch': { zh: '两次输入的密码不一致', en: 'Passwords do not match' },
  'auth.error.samePassword': { zh: '新密码不能与旧密码相同', en: 'New password must differ from the old one' },
  'auth.error.linkExpired': { zh: '链接已失效，请重新申请', en: 'This link has expired, please request a new one' },
  'auth.error.resetFailed': { zh: '操作失败，请稍后再试', en: 'Something went wrong, please try again' },
  'auth.error.required': { zh: '请填写所有必填项', en: 'Please fill in all required fields' },
  'auth.error.phone': { zh: '手机号格式不正确', en: 'Invalid phone number' },
  'auth.error.email': { zh: '邮箱格式不正确', en: 'Invalid email address' },
  'auth.error.passwordLength': { zh: '密码长度不够或过于简单', en: 'Password is too short or too weak' },
  'auth.error.emailTaken': { zh: '该邮箱已注册，请直接登录', en: 'This email is already registered' },
  'auth.error.invalidCredentials': { zh: '邮箱或密码不正确', en: 'Incorrect email or password' },
  'auth.error.emailNotConfirmed': { zh: '邮箱尚未验证，请先查收验证邮件', en: 'Please verify your email first' },
  'auth.error.rateLimited': { zh: '操作过于频繁，请稍后再试', en: 'Too many attempts, please try again later' },
  'auth.error.notSeller': { zh: '该账户未开通卖家平台', en: 'This account is not a seller account' },
  'auth.error.unavailable': { zh: '注册暂未开放，请联系管理员', en: 'Registration is not available yet' },
  'auth.error.registerFailed': { zh: '注册失败，请稍后再试', en: 'Registration failed, please try again' },
  'auth.error.loginFailed': { zh: '登录失败，请稍后再试', en: 'Sign-in failed, please try again' },
} as const;

export type MessageKey = keyof typeof dict;

export function t(
  key: MessageKey,
  locale: Locale = DEFAULT_LOCALE,
  vars?: Record<string, string | number>
): string {
  let msg: string = dict[key][locale] ?? dict[key].zh;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      msg = msg.replace(`{${k}}`, String(v));
    }
  }
  return msg;
}
