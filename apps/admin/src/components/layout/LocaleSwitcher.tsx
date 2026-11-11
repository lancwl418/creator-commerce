'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setLocaleAction } from '@/lib/i18n/actions';
import { useLocale, useT } from '@/lib/i18n/client';
import { LOCALES, type Locale } from '@/lib/i18n/messages';

const LABELS: Record<Locale, string> = { en: 'EN', zh: '中文' };

/** 中 / 英切换。tone=dark 用在登录页的深色背景上。 */
export function LocaleSwitcher({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useT();
  const [isPending, startTransition] = useTransition();

  function change(next: Locale) {
    if (next === locale) return;
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  }

  const base = tone === 'dark' ? 'border-white/15 text-white/60' : 'border-border-light text-gray-500';
  const active = tone === 'dark' ? 'bg-white/15 text-white' : 'bg-gray-900 text-white';

  return (
    <div role="group" aria-label={t('common.language')} className={`inline-flex rounded-lg border p-0.5 text-xs ${base}`}>
      {LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => change(option)}
          disabled={isPending}
          aria-pressed={option === locale}
          className={`rounded-md px-2 py-1 font-medium transition-colors disabled:opacity-60 ${option === locale ? active : ''}`}
        >
          {LABELS[option]}
        </button>
      ))}
    </div>
  );
}
