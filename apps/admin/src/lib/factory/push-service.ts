import {
  erpConfigFromEnv,
  findProductById,
} from '@creator-commerce/shared/erp';
import { createClient } from '@/lib/supabase/server';
import type { CnOrderRow } from '@/lib/types/cn-order';
import { placeFactoryOrder } from './adapters';
import { buildConsignee, buildItemInput } from './build-input';
import type { FactoryConsignee, FactoryOrderInput, FactoryPushOutcome, FactoryPushPlan, FactorySupplierRow } from './types';

// 推送服务：把一张 CN 采购单按（运营选定的）工厂分组，组装 goodsList 下到工厂「待推送」。
// 预览（弹窗确认）和执行共用同一套组装逻辑；成功一组落一条 cn_factory_pushes，
// 失败的组不落库，错误返回界面可直接重试。

interface PushContextGroup {
  factory: FactorySupplierRow;
  alreadyPushed: boolean;
  itemIndexes: number[];
  input: FactoryOrderInput;
}

interface PushContext {
  order: CnOrderRow;
  consignee: FactoryConsignee;
  groups: PushContextGroup[];
}

/** RIIN 限制卖家备注 ≤20 字符；地址等信息已在收件人字段里，备注超长直接截断 */
function truncateRemark(note: string | null): string | undefined {
  const trimmed = note?.trim();
  if (!trimmed) return undefined;
  const chars = [...trimmed];
  return chars.length <= 20 ? trimmed : chars.slice(0, 20).join('');
}

/**
 * 组装推送上下文：工厂选择用运营在 push_suppliers 的改选，否则产品的 ERP 默认供应商。
 * 预览和真实推送都从这里走，保证确认弹窗看到的就是发出去的。
 */
async function buildPushContext(orderId: string): Promise<{ context?: PushContext; error?: string }> {
  const supabase = await createClient();
  const { data: order, error: orderError } = await supabase
    .from('cn_bulk_orders')
    .select('id, order_number, order_type, status, erp_product_id, product_title, items, subtotal, currency, shipping_address, note, design_files, faces, erp_order_id, push_suppliers, confirmed_at, created_at')
    .eq('id', orderId)
    .maybeSingle<CnOrderRow>();
  if (orderError || !order) return { error: orderError?.message ?? 'Order not found' };
  if (order.status !== 'confirmed') return { error: 'Only confirmed orders can be pushed' };

  const consignee = buildConsignee(order);
  if (!consignee.ok) return { error: consignee.error };

  const [{ data: factories, error: factoriesError }, { data: existingPushes, error: pushesError }] = await Promise.all([
    supabase.from('cn_factory_suppliers').select('*').eq('enabled', true).returns<FactorySupplierRow[]>(),
    supabase.from('cn_factory_pushes').select('factory_supplier_id').eq('order_id', orderId).returns<{ factory_supplier_id: string }[]>(),
  ]);
  if (factoriesError || pushesError) return { error: (factoriesError ?? pushesError)!.message };
  const factoryByErpSupplier = new Map((factories ?? []).filter((f) => f.erp_supplier_id).map((f) => [f.erp_supplier_id!, f]));
  const alreadyPushed = new Set((existingPushes ?? []).map((p) => p.factory_supplier_id));

  // 按产品拉 ERP 数据，确定每个条目的目标工厂
  const cfg = erpConfigFromEnv();
  const productIds = [...new Set(order.items.map((item) => item.erp_product_id ?? order.erp_product_id).filter((id): id is string => !!id))];
  const products = new Map(
    await Promise.all(productIds.map(async (id) => [id, await findProductById(cfg, id)] as const))
  );

  const groups = new Map<string, { factory: FactorySupplierRow; entries: Parameters<typeof buildItemInput>[1][] }>();
  for (const [index, item] of order.items.entries()) {
    const productId = item.erp_product_id ?? order.erp_product_id;
    const product = productId ? products.get(productId) : null;
    if (!productId || !product) {
      return { error: `Item ${index + 1} (${item.sku}) has no ERP product reference, so it can't be routed to a factory` };
    }
    const chosenSupplierId = order.push_suppliers?.[productId]?.supplier_id ?? product.mainSupplierId?.trim() ?? null;
    const factory = chosenSupplierId ? factoryByErpSupplier.get(chosenSupplierId) : undefined;
    if (!factory) {
      return {
        error: `No factory mapping for ERP supplier ${chosenSupplierId ?? '(none)'} (product ${item.product_title ?? order.product_title ?? productId}) — map it in cn_factory_suppliers.erp_supplier_id`,
      };
    }
    const quote = (product.suppliers ?? []).find((q) => q.supplierId?.trim() === chosenSupplierId) ?? null;
    const group = groups.get(factory.id) ?? { factory, entries: [] };
    group.entries.push({ item, index, product, quote });
    groups.set(factory.id, group);
  }

  const context: PushContext = {
    order,
    consignee: consignee.consignee,
    groups: [...groups.values()].map(({ factory, entries }) => ({
      factory,
      alreadyPushed: alreadyPushed.has(factory.id),
      itemIndexes: entries.map((entry) => entry.index),
      input: {
        platformOid: `CN${order.order_number}-${factory.key}`,
        sourceOrderId: `CN${order.order_number}`,
        consignee: consignee.consignee,
        orderTime: new Date(order.created_at),
        sellerRemark: truncateRemark(order.note),
        items: entries.map((entry) => buildItemInput(order, entry)),
      },
    })),
  };
  return { context };
}

/** 推送前预览：给确认弹窗的报文摘要（不发送任何请求到工厂） */
export async function previewCnOrderPush(orderId: string): Promise<{ plan?: FactoryPushPlan; error?: string }> {
  const { context, error } = await buildPushContext(orderId);
  if (!context) return { error };
  const a = context.consignee;
  return {
    plan: {
      orderNumber: context.order.order_number,
      consignee: {
        name: a.name,
        phone: a.phone,
        addressLine: [a.address, a.addressOptional, a.city, a.province, a.postCode, a.country].filter(Boolean).join(', '),
      },
      sellerRemark: context.groups[0]?.input.sellerRemark,
      groups: context.groups.map((group) => ({
        factoryKey: group.factory.key,
        factoryName: group.factory.name,
        platformOid: group.input.platformOid,
        alreadyPushed: group.alreadyPushed,
        items: group.input.items.map((item) => ({
          factorySku: item.factorySku,
          title: item.title,
          spec: [item.colorName, item.sizeName].filter(Boolean).join(' / '),
          quantity: item.quantity,
          price: item.price,
          shouldPrint: item.shouldPrint,
          printPosition: item.printPosition,
          printImages: item.printImageUrls.length,
        })),
      })),
    },
  };
}

/**
 * 推送一张采购单到工厂（只下到「待推送」）。
 * 已推过的工厂跳过（platform_oid 唯一兜底防重复）。
 */
export async function pushCnOrderToFactories(orderId: string): Promise<{ outcomes: FactoryPushOutcome[]; error?: string }> {
  const { context, error } = await buildPushContext(orderId);
  if (!context) return { outcomes: [], error };
  const supabase = await createClient();

  const outcomes: FactoryPushOutcome[] = [];
  for (const group of context.groups) {
    const { platformOid } = group.input;
    if (group.alreadyPushed) {
      outcomes.push({ factoryKey: group.factory.key, factoryName: group.factory.name, platformOid, ok: false, error: 'Already pushed to this factory' });
      continue;
    }

    try {
      const result = await placeFactoryOrder(group.factory, group.input);
      const { error: insertError } = await supabase.from('cn_factory_pushes').insert({
        order_id: context.order.id,
        factory_supplier_id: group.factory.id,
        platform_oid: platformOid,
        item_indexes: group.itemIndexes,
        request_payload: result.requestPayload,
        trace_id: result.traceId ?? null,
      });
      if (insertError) {
        // 工厂侧已下单成功，落库失败必须暴露出来人工核对
        outcomes.push({ factoryKey: group.factory.key, factoryName: group.factory.name, platformOid, ok: false, error: `Placed at factory but failed to record locally: ${insertError.message}` });
      } else {
        outcomes.push({ factoryKey: group.factory.key, factoryName: group.factory.name, platformOid, ok: true });
      }
    } catch (cause) {
      outcomes.push({
        factoryKey: group.factory.key,
        factoryName: group.factory.name,
        platformOid,
        ok: false,
        error: cause instanceof Error ? cause.message : 'Factory push failed',
      });
    }
  }

  return { outcomes };
}
