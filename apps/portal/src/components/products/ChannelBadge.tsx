export default function ChannelBadge({ channelType }: { channelType: string }) {
  const config: Record<string, { label: string; style: string }> = {
    marketplace: { label: 'Marketplace', style: 'bg-blue-50 text-blue-700' },
    our_shopify: { label: 'Marketplace', style: 'bg-blue-50 text-blue-700' },
    shopify: { label: 'Shopify', style: 'bg-[#96bf48]/10 text-[#6a8a2e]' },
    etsy: { label: 'Etsy', style: 'bg-orange-50 text-orange-700' },
    tiktok_shop: { label: 'TikTok', style: 'bg-gray-900 text-white' },
    creator_store: { label: 'Shopify', style: 'bg-[#96bf48]/10 text-[#6a8a2e]' },
    creator_shopify: { label: 'Shopify', style: 'bg-[#96bf48]/10 text-[#6a8a2e]' },
    creator_etsy: { label: 'Etsy', style: 'bg-orange-50 text-orange-700' },
    creator_tiktok: { label: 'TikTok', style: 'bg-gray-900 text-white' },
    distributor_shopify: { label: 'Shopify', style: 'bg-[#96bf48]/10 text-[#6a8a2e]' },
    distributor_etsy: { label: 'Etsy', style: 'bg-orange-50 text-orange-700' },
  };

  const c = config[channelType] || { label: channelType, style: 'bg-gray-100 text-gray-600' };

  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${c.style}`}>
      {c.label}
    </span>
  );
}
