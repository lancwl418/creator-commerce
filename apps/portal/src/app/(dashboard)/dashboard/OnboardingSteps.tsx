'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface OnboardingStepsProps {
  publishedCount: number;
  /** Target number of published products shown as "X of N". */
  target?: number;
}

const STORAGE_KEY = 'dashboard_onboarding_minimized';

export default function OnboardingSteps({ publishedCount, target = 5 }: OnboardingStepsProps) {
  const [minimized, setMinimized] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setMinimized(localStorage.getItem(STORAGE_KEY) === '1');
    setHydrated(true);
  }, []);

  function toggle() {
    setMinimized((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  }

  // Avoid a flash of the wrong state before localStorage is read
  if (!hydrated) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-gray-900">Get started</h3>
        <button
          onClick={toggle}
          className="flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
        >
          {minimized ? 'Show steps' : 'Minimize steps'}
          <svg
            className={`w-4 h-4 transition-transform ${minimized ? '' : 'rotate-180'}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
          </svg>
        </button>
      </div>

      {!minimized && (
        <div className="max-w-md">
          {/* STEP 1 — real flow */}
          <div className="rounded-2xl bg-ink p-5 text-white shadow-lg flex flex-col">
            <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Step 1</p>
            <p className="text-lg font-bold mt-1">
              {publishedCount} of {target} published products
            </p>
            <p className="text-sm text-white/80 mt-1 flex-1">
              Publish your design to your store and start selling.
            </p>
            <Link
              href="/dashboard/catalog"
              className="mt-4 inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-ink hover:bg-brand-600 transition-colors self-start"
            >
              Add to store
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
