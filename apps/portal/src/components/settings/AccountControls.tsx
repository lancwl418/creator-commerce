import { useState } from 'react';

interface AccountControlsProps {
  disabling: boolean;
  deleting: boolean;
  handleDisableAccount: () => void;
  handleDeleteAccount: () => void;
}

export default function AccountControls({ disabling, deleting, handleDisableAccount, handleDeleteAccount }: AccountControlsProps) {
  const [showDisable, setShowDisable] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  return (
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
              onClick={() => { if (deleteConfirm === 'DELETE') handleDeleteAccount(); }}
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
  );
}
