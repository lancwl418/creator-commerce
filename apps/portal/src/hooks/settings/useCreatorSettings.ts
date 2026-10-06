'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CreatorProfile } from '@/lib/types/creator';
import { saveCreatorProfile, setCreatorStatus } from '@/lib/creators/mutations';
import { signOut } from '@/lib/api/auth';

export function useCreatorSettings(creatorId: string, initialProfile: CreatorProfile) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [disabling, setDisabling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    setSaving(true); setSaved(false); setError('');
    try { await saveCreatorProfile(creatorId, profile); setSaved(true); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to save'); }
    finally { setSaving(false); }
  }

  async function handleSignOut() {
    try { await signOut(); router.push('/login'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to sign out'); }
  }

  async function deactivate(status: 'suspended' | 'banned') {
    const setBusy = status === 'suspended' ? setDisabling : setDeleting;
    setBusy(true); setError('');
    try { await setCreatorStatus(creatorId, status); await signOut(); router.push('/login'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to update account'); }
    finally { setBusy(false); }
  }

  return {
    profile, saving, saved, error, disabling, deleting, handleSave, handleSignOut,
    updateProfile: (field: keyof CreatorProfile, value: string) => { setProfile(previous => ({ ...previous, [field]: value })); setSaved(false); },
    handleDisableAccount: () => deactivate('suspended'), handleDeleteAccount: () => deactivate('banned')
  };
}
