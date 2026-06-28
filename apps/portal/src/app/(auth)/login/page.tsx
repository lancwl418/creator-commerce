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

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
          </svg>
        </div>
      </div>
      <h1 className="text-3xl font-bold text-center mb-1 text-gray-900">Welcome back</h1>
      <p className="text-gray-500 text-center mb-8 text-sm">Sign in to your creator account</p>

      <form onSubmit={handleLogin} className="space-y-4">
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
            className="w-full rounded-xl bg-white border border-border px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400/60 focus:border-brand-400 transition-all"
            placeholder="Enter your password"
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
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Don&apos;t have an account?{' '}
        <Link href="/register" onClick={(e) => { e.preventDefault(); router.push(`/register${nextQuery()}`); }} className="font-semibold text-gray-900 underline underline-offset-2 hover:text-brand-600 transition-colors">
          Sign up
        </Link>
      </p>
    </div>
  );
}
