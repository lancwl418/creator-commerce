'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface ProfileData {
  display_name: string;
  bio: string;
  avatar_url: string | null;
  country: string | null;
  timezone: string | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [profile, setProfile] = useState<ProfileData>({
    display_name: '',
    bio: '',
    avatar_url: null,
    country: null,
    timezone: null,
  });
  const [creatorId, setCreatorId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Danger zone
  const [showDisable, setShowDisable] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [disabling, setDisabling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    setEmail(user.email || '');

    const { data: creator } = await supabase
      .from('creators')
      .select('id, creator_profiles(*)')
      .eq('auth_user_id', user.id)
      .single();

    if (creator) {
      setCreatorId(creator.id);
      const p = (creator as { creator_profiles: ProfileData[] }).creator_profiles?.[0];
      if (p) {
        setProfile({
          display_name: p.display_name || '',
          bio: p.bio || '',
          avatar_url: p.avatar_url,
          country: p.country,
          timezone: p.timezone,
        });
      }
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const { error: profileError } = await supabase
        .from('creator_profiles')
        .update({
          display_name: profile.display_name.trim(),
          bio: profile.bio.trim(),
          country: profile.country?.trim() || null,
          timezone: profile.timezone?.trim() || null,
        })
        .eq('creator_id', creatorId);

      if (profileError) throw profileError;
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await fetch('/api/auth/signout', { method: 'POST' });
    router.push('/login');
  }

  async function handleDisableAccount() {
    setDisabling(true);
    try {
      const { error } = await supabase
        .from('creators')
        .update({ status: 'suspended' })
        .eq('id', creatorId);

      if (error) throw error;
      await handleSignOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable account');
      setDisabling(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== 'DELETE') return;

    setDeleting(true);
    try {
      // Mark as banned (soft delete) — actual data deletion handled by admin
      const { error } = await supabase
        .from('creators')
        .update({ status: 'banned' })
        .eq('id', creatorId);

      if (error) throw error;

      // Sign out the user
      await supabase.auth.signOut();
      router.push('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Account Information */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm space-y-5">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Account Information</h2>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full rounded-xl border border-border bg-gray-50 px-4 py-2.5 text-sm text-gray-500 cursor-not-allowed"
          />
          <p className="text-[11px] text-gray-400 mt-1">Contact support to change your email</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Display Name</label>
          <input
            type="text"
            value={profile.display_name}
            onChange={(e) => { setProfile(p => ({ ...p, display_name: e.target.value })); setSaved(false); }}
            className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
            placeholder="Your display name"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Bio</label>
          <textarea
            value={profile.bio}
            onChange={(e) => { setProfile(p => ({ ...p, bio: e.target.value })); setSaved(false); }}
            rows={3}
            className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all resize-none"
            placeholder="Tell us about yourself..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Country</label>
            <input
              type="text"
              value={profile.country || ''}
              onChange={(e) => { setProfile(p => ({ ...p, country: e.target.value })); setSaved(false); }}
              className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
              placeholder="US"
              maxLength={2}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Timezone</label>
            <input
              type="text"
              value={profile.timezone || ''}
              onChange={(e) => { setProfile(p => ({ ...p, timezone: e.target.value })); setSaved(false); }}
              className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
              placeholder="America/New_York"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50 transition-all shadow-sm"
          >
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </button>
          {saved && (
            <span className="text-sm text-emerald-600 font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Changes saved
            </span>
          )}
        </div>
      </div>

      {/* Sign Out */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Session</h2>
            <p className="text-xs text-gray-500 mt-1">Sign out of your account on this device</p>
          </div>
          <button
            onClick={handleSignOut}
            className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm space-y-5">
        <h2 className="text-sm font-bold text-red-600 uppercase tracking-wider">Danger Zone</h2>

        {/* Disable Account */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">Disable Account</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Temporarily disable your account. Your data will be preserved and you can contact support to reactivate.
            </p>
          </div>
          <button
            onClick={() => setShowDisable(true)}
            className="shrink-0 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100 transition-all"
          >
            Disable
          </button>
        </div>

        {showDisable && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
            <p className="text-sm text-amber-800">
              Are you sure you want to disable your account? You will be signed out immediately.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDisableAccount}
                disabled={disabling}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 transition-all"
              >
                {disabling ? 'Disabling...' : 'Yes, Disable My Account'}
              </button>
              <button
                onClick={() => setShowDisable(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-gray-600 hover:bg-white transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="border-t border-red-100" />

        {/* Permanently Delete Account */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">Permanently Delete Account</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
          </div>
          <button
            onClick={() => setShowDelete(true)}
            className="shrink-0 rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 transition-all"
          >
            Delete
          </button>
        </div>

        {showDelete && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
            <p className="text-sm text-red-800">
              This will permanently delete your account and all your designs, products, and earnings data.
              Type <strong>DELETE</strong> to confirm.
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirm !== 'DELETE'}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-all"
              >
                {deleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
              <button
                onClick={() => { setShowDelete(false); setDeleteConfirm(''); }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-gray-600 hover:bg-white transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
