import type { CreatorProfile } from '@/lib/types/creator';

interface CreatorProfileFormProps {
  email: string;
  profile: CreatorProfile;
  saving: boolean;
  saved: boolean;
  updateProfile: (field: keyof CreatorProfile, value: string) => void;
  handleSave: () => void;
}

export default function CreatorProfileForm({ email, profile, saving, saved, updateProfile, handleSave }: CreatorProfileFormProps) {
  return (
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
          onChange={(e) => { updateProfile('display_name', e.target.value); }}
          className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
          placeholder="Your display name"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Bio</label>
        <textarea
          value={profile.bio}
          onChange={(e) => { updateProfile('bio', e.target.value); }}
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
            onChange={(e) => { updateProfile('country', e.target.value); }}
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
            onChange={(e) => { updateProfile('timezone', e.target.value); }}
            className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
            placeholder="America/New_York"
          />
        </div>
      </div>

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

  );
}
