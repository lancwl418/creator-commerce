import { RiinClient, type RiinGoodsItem, type RiinImage, type RiinPlaceOrderParams } from './riin-client';
import {
  createOrder as linmiaoCreateOrder,
  type LinmiaoCreateOrderParams,
  type LinmiaoGoodsItem,
  type LinmiaoImage,
} from './linmiao-client';
import {
  formatOrderTime,
  noPrintMarkerUrl,
  type FactoryOrderInput,
  type FactoryOrderResult,
  type FactorySupplierRow,
} from './types';

// 两家工厂的 payload 构造（纯函数，可测）+ 适配器。移植自 order-workbench，
// 推送时机按本项目决策：只下单到「待推送」，不调 pushOrder 直推生产。

/** RIIN placeOrder 报文。白板条目用协议的 "[不打印]" type-1 标记 + 最多两张效果图。 */
export function buildRiinPlaceOrderParams(input: FactoryOrderInput, platformType: number): RiinPlaceOrderParams {
  const goodsList: RiinGoodsItem[] = input.items.map((item, idx) => {
    const imageList: RiinImage[] = [];
    if (item.shouldPrint) {
      for (const [i, url] of item.printImageUrls.entries()) {
        imageList.push({ type: 1, imageUrl: url, imageCode: `${item.orderItemId}_print_${i}`, imageName: `${item.orderItemId}_print_${i}` });
      }
    } else {
      imageList.push({ type: 1, imageUrl: noPrintMarkerUrl(item), imageCode: '[不打印]', imageName: 'noprint' });
    }
    for (const [i, url] of item.effectImageUrls.slice(0, 2).entries()) {
      imageList.push({ type: 2, imageUrl: url, imageCode: `${item.orderItemId}_effect_${i}`, imageName: `${item.orderItemId}_effect_${i}` });
    }

    return {
      platformOid: input.platformOid,
      platformOllId: `${input.platformOid}-${idx + 1}`,
      goodsType: 1 as const,
      title: item.title,
      specification: [item.colorName || item.colorCode, item.sizeName || item.sizeCode].filter(Boolean).join(' '),
      goodsStatus: 'NOT_SHIPPED' as const,
      refundStatus: 'NO_REFUND' as const,
      sizeCode: item.sizeCode,
      sizeName: item.sizeName || item.sizeCode,
      colorCode: item.colorCode,
      colorName: item.colorName || item.colorCode,
      styleCode: item.styleCode || item.factorySku,
      styleName: item.styleName || item.styleCode || item.factorySku,
      craftType: item.craftType,
      num: item.quantity,
      platformSpuId: item.ourSku || undefined,
      platformSkuId: item.factorySku,
      price: item.price,
      sellPrice: item.price,
      printPosition: item.shouldPrint ? item.printPosition : undefined,
      imageList,
    };
  });

  return {
    platformType,
    sourcePlatformOid: input.sourceOrderId,
    platformOrderStatus: 'NOT_SHIPPED',
    platformRefundStatus: 'NO_REFUND',
    platformOid: input.platformOid,
    consigneeName: input.consignee.name,
    phone: input.consignee.phone,
    address: input.consignee.address,
    addressOptional: input.consignee.addressOptional,
    receiverCountry: input.consignee.country,
    receiverProvince: input.consignee.province,
    receiverCity: input.consignee.city,
    receiverDistrict: input.consignee.district,
    receiverTown: input.consignee.town,
    postCode: input.consignee.postCode,
    orderTime: formatOrderTime(input.orderTime),
    sellerRemark: input.sellerRemark,
    goodsList,
  };
}

/** Linmiao create-order 报文。image code 不能含 "-"、"+"、"&"、空格（OPEN_API 文档）。 */
export function buildLinmiaoCreateOrderParams(input: FactoryOrderInput, platformType: number): LinmiaoCreateOrderParams {
  const goodsList: LinmiaoGoodsItem[] = input.items.map((item, idx) => {
    let imageList: LinmiaoImage[];
    let printPosition: string | undefined;
    if (item.shouldPrint) {
      printPosition = item.printPosition;
      imageList = item.printImageUrls.map((url, i) => ({
        type: 1 as const,
        imageUrl: url,
        imageCode: `${item.orderItemId}_print_${i}`,
        imageName: `${item.orderItemId}_print_${i}`,
      }));
    } else {
      imageList = [
        { type: 1 as const, imageUrl: noPrintMarkerUrl(item), imageCode: '[不打印]', imageName: 'noprint' },
        ...item.effectImageUrls.slice(0, 2).map((url, i) => ({
          type: 2 as const,
          imageUrl: url,
          imageCode: `${item.orderItemId}_effect_${i}`,
          imageName: `${item.orderItemId}_effect_${i}`,
        })),
      ];
    }

    return {
      pfOrderId: input.platformOid,
      pfSubOrderId: `${input.platformOid}-${idx + 1}`,
      goodsType: 1 as const,
      title: item.title,
      specification: item.factorySku,
      subOrderStatus: 'NOT_SHIPPED' as const,
      subOrderRefundStatus: 'NO_REFUND' as const,
      sizeCode: item.sizeCode,
      sizeName: item.sizeName || item.sizeCode,
      colorCode: item.colorCode,
      colorName: item.colorName || item.colorCode,
      styleCode: item.styleCode || item.factorySku,
      styleName: item.styleName || item.styleCode || item.factorySku,
      craftType: item.craftType,
      num: item.quantity,
      spuId: item.ourSku || undefined,
      skuId: item.factorySku,
      price: item.price,
      sellPrice: item.price,
      printPosition,
      imageList,
    };
  });

  return {
    platformType,
    sourceOrderId: input.sourceOrderId,
    pfOrderStatus: 'NOT_SHIPPED',
    pfRefundStatus: 'NO_REFUND',
    pfOrderId: input.platformOid,
    consignee: {
      name: input.consignee.name,
      phone: input.consignee.phone,
      address: input.consignee.address,
      alternateAddress: input.consignee.addressOptional,
      country: input.consignee.country,
      province: input.consignee.province,
      city: input.consignee.city,
      district: input.consignee.district,
      town: input.consignee.town,
      postCode: input.consignee.postCode,
    },
    orderTime: formatOrderTime(input.orderTime),
    postCode: input.consignee.postCode,
    goodsList,
    sellerRemark: input.sellerRemark,
  };
}

/**
 * 下单到工厂（只到「待推送」，不推进生产）。
 * - RIIN：placeOrder，之后人工在 RIIN 后台核对再推工厂；
 * - Linmiao：create-order 本身就停在待推送（面单要在其后台上传后才能推）。
 * 返回报文一并给出，落库 request_payload 便于排查。
 */
export async function placeFactoryOrder(
  supplier: FactorySupplierRow,
  input: FactoryOrderInput
): Promise<FactoryOrderResult & { requestPayload: unknown }> {
  if (!supplier.enabled) throw new Error(`Factory ${supplier.key} is disabled`);

  if (supplier.adapter_type === 'riin') {
    const secretKey = process.env[supplier.secret_key_env];
    if (!secretKey) {
      throw new Error(`Env var ${supplier.secret_key_env} is not set — configure the secret key for factory ${supplier.key}`);
    }
    const client = new RiinClient({ secretKey, baseUrl: supplier.base_url });
    const params = buildRiinPlaceOrderParams(input, supplier.platform_type);
    const placed = await client.placeOrder(params);
    return { platformOid: input.platformOid, traceId: placed.traceId, pushed: false, raw: placed.data, requestPayload: params };
  }

  const params = buildLinmiaoCreateOrderParams(input, supplier.platform_type);
  const result = await linmiaoCreateOrder(params);
  return { platformOid: input.platformOid, traceId: result.traceId, pushed: false, raw: result.data, requestPayload: params };
}
