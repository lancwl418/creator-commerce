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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* STEP 1 — real flow */}
          <div className="rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 p-5 text-white shadow-lg flex flex-col">
            <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Step 1</p>
            <p className="text-lg font-bold mt-1">
              {publishedCount} of {target} published products
            </p>
            <p className="text-sm text-white/80 mt-1 flex-1">
              Publish your design to your store and start selling.
            </p>
            <Link
              href="/dashboard/catalog"
              className="mt-4 inline-flex items-center justify-center rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/80 transition-colors self-start"
            >
              Add to store
            </Link>
          </div>

          {/* STEP 2 — placeholder, link added later */}
          <PlaceholderStep
            step={2}
            title="Place a test order"
            description="Order a sample to check fit, fabric, and print quality."
            cta="View step"
          />

          {/* STEP 3 — placeholder, link added later */}
          <PlaceholderStep
            step={3}
            title="Get your product in hand"
            description="Order a product for yourself, friends & family or for a client."
            cta="Order now"
          />

          {/* STEP 4 — placeholder, link added later */}
          <PlaceholderStep
            step={4}
            title="Customize your branding"
            description="Add labels, inserts, and finishing details."
            cta="Customize now"
          />
        </div>
      )}
    </div>
  );
}

function PlaceholderStep({
  step,
  title,
  description,
  cta,
}: {
  step: number;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm flex flex-col">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Step {step}</p>
      <p className="text-lg font-bold text-gray-900 mt-1">{title}</p>
      <p className="text-sm text-gray-500 mt-1 flex-1">{description}</p>
      {/* TODO: replace with a real Link/href once the feature exists */}
      <button
        type="button"
        className="mt-4 inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors self-start"
      >
        {cta}
      </button>
    </div>
  );
}
