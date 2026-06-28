'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/** Read a same-site return path from ?next= (defaults to the dashboard). */
function getSafeNext(): string {
  if (typeof window === 'undefined') return '/dashboard';
  const next = new URLSearchParams(window.location.search).get('next');
  // Only allow relative same-site paths — reject external / protocol-relative URLs.
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
}

/** The ?next= query to forward to the other auth page (empty if none). */
function nextQuery(): string {
  if (typeof window === 'undefined') return '';
  const next = new URLSearchParams(window.location.search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? `?next=${encodeURIComponent(next)}` : '';
}

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push(getSafeNext());
  }

  return (
    <div className="rounded-2xl bg-white p-8 shadow-xl shadow-black/5 border border-border">
      <div className="flex justify-center mb-6">
        <div className="w-12 h-12 rounded-xl bg-ink flex items-center justify-center">
          <svg className="w-6 h-6 text-brand" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
          </svg>
        </div>
      </div>
      <h1 className="text-3xl font-bold text-center mb-1 text-gray-900">Create your account</h1>
      <p className="text-gray-500 text-center mb-8 text-sm">Start selling your designs</p>

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1.5">
            Display name
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            className="w-full rounded-xl bg-white border border-border px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400/60 focus:border-brand-400 transition-all"
            placeholder="Your name"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl bg-white border border-border px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400/60 focus:border-brand-400 transition-all"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-xl bg-white border border-border px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400/60 focus:border-brand-400 transition-all"
            placeholder="At least 6 characters"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-ink hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link href="/login" onClick={(e) => { e.preventDefault(); router.push(`/login${nextQuery()}`); }} className="font-semibold text-gray-900 underline underline-offset-2 hover:text-brand-600 transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
