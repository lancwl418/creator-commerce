'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { requestDesignPromotion } from '@/lib/designs/mutations';
import type { PromotionPricingMode, PromotionStep } from '@/lib/types/design';

export function useDesignPromotion(designId: string) {
  const router = useRouter();
  const [step, setStep] = useState<PromotionStep>('closed');
  const [pricingMode, setPricingMode] = useState<PromotionPricingMode>('ideamax');
  const [expectedProfit, setExpectedProfit] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!agreed || loading) return;
    setLoading(true); setError('');
    try { await requestDesignPromotion(designId, pricingMode, expectedProfit); setStep('closed'); router.refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to submit'); }
    finally { setLoading(false); }
  }

  return { step, setStep, pricingMode, setPricingMode, expectedProfit, setExpectedProfit, agreed, setAgreed, loading, error, handleSubmit };
}
