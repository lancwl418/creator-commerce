'use client';

import CreatorProfileForm from './CreatorProfileForm';
import AccountControls from './AccountControls';
import type { CreatorProfile } from '@/lib/types/creator';
import { useCreatorSettings } from '@/hooks/settings/useCreatorSettings';

interface SettingsClientProps {
  creatorId: string;
  email: string;
  initialProfile: CreatorProfile;
}

export default function SettingsClient({ creatorId, email, initialProfile }: SettingsClientProps) {
  const { profile, saving, saved, error, disabling, deleting, updateProfile, handleSave, handleSignOut, handleDisableAccount, handleDeleteAccount } = useCreatorSettings(creatorId, initialProfile);
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <CreatorProfileForm email={email} profile={profile} saving={saving} saved={saved} updateProfile={updateProfile} handleSave={handleSave} />

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

      <AccountControls disabling={disabling} deleting={deleting} handleDisableAccount={handleDisableAccount} handleDeleteAccount={handleDeleteAccount} />
    </div>
  );
}
