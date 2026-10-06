'use client';

import { useState } from 'react';
import { t } from '@/lib/i18n';

// 加入购物车 → 下单模块（下单模块尚未开发，此处为占位入口）
export default function AddToCart({ disabled }: { disabled?: boolean }) {
  const [clicked, setClicked] = useState(false);

  return (
    <div>
      <button
        disabled={disabled}
        onClick={() => setClicked(true)}
        className="w-full rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {t('detail.addToCart')}
      </button>
      {clicked && (
        <p className="text-xs text-gray-400 mt-2">{t('detail.cartPending')}</p>
      )}
    </div>
  );
}
