import { describe, expect, it } from 'vitest';
import { buildErpCustomer, findErpLevelForTier } from './erp-sync';

const levels = [
  { id: 'lvl-vip', levelId: 'VIP', levelName: 'VIP', multiplier: 1.2 },
  { id: 'lvl-cn', levelId: null, levelName: '中国商家', multiplier: 1.2 },
];

const seller = {
  authUserId: 'u1', email: 'seller@example.com', companyName: 'ACME', contactName: '张三', phone: '13800000000',
  tier: 'CN_MERCHANT' as const,
};

describe('卖家同步到 ERP 客户档案', () => {
  it('按等级名在 ERP 现有等级里找到对应等级', () => {
    expect(findErpLevelForTier(levels, 'CN_MERCHANT')?.id).toBe('lvl-cn');
    expect(findErpLevelForTier(levels, 'VIP')?.id).toBe('lvl-vip');
    expect(findErpLevelForTier(levels, 'WHOLESALE')).toBeNull();
  });

  it('请求体只带注册收集到的资料，等级写入 custStageId / vipStage', () => {
    expect(buildErpCustomer(seller, levels[1])).toEqual({
      createBy: 'cn-portal', sysOrgCode: 'A02A04', custSource: 'cn-portal',
      custName: 'ACME', custContact: '张三', custTel: '13800000000', custPhone: '13800000000',
      custEmail: 'seller@example.com', custState: 'active', status: 2,
      custStageId: 'lvl-cn', vipStage: '中国商家',
    });
  });
});
