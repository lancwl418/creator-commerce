'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function CreatorActions({
  creatorId,
  currentStatus,
}: {
  creatorId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState<string | null>(null);

  async function updateStatus(newStatus: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from('creators')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', creatorId);

    if (error) {
      alert(`Failed to update: ${error.message}`);
      return;
    }

    setShowConfirm(null);
    startTransition(() => {
      router.refresh();
    });
  }

  const actions: { label: string; status: string; style: string; show: boolean }[] = [
    {
      label: 'Approve',
      status: 'active',
      style: 'bg-success-500 text-white hover:bg-success-600',
      show: currentStatus === 'pending',
    },
    {
      label: 'Suspend',
      status: 'suspended',
      style: 'bg-warning-500 text-white hover:bg-warning-600',
      show: currentStatus === 'active',
    },
    {
      label: 'Reactivate',
      status: 'active',
      style: 'bg-success-500 text-white hover:bg-success-600',
      show: currentStatus === 'suspended',
    },
    {
      label: 'Ban',
      status: 'banned',
      style: 'bg-danger-500 text-white hover:bg-danger-600',
      show: currentStatus !== 'banned',
    },
  ];

  const visibleActions = actions.filter(a => a.show);

  return (
    <>
      <div className="flex gap-2">
        {visibleActions.map((action) => (
          <button
            key={action.label}
            onClick={() => setShowConfirm(action.status)}
            disabled={isPending}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${action.style}`}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowConfirm(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900">Confirm Action</h3>
            <p className="text-sm text-gray-500 mt-2">
              Are you sure you want to change this creator&apos;s status to <strong className="capitalize">{showConfirm}</strong>?
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowConfirm(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-border text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => updateStatus(showConfirm)}
                disabled={isPending}
                className="flex-1 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-500 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Updating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
