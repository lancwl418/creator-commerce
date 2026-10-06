const CHANNELS: Record<string, { name: string; color: string }> = {
  shopify: { name: 'Shopify', color: 'bg-[#96bf48]' },
  etsy: { name: 'Etsy', color: 'bg-[#F1641E]' },
  tiktok_shop: { name: 'TikTok Shop', color: 'bg-black' },
};

export function getChannelInfo(platform: string) {
  return CHANNELS[platform] ?? { name: platform, color: 'bg-gray-500' };
}
