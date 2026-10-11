import type { AuthFormState } from '@/lib/types/seller';

export default function AuthFormStatus({ state }: { state: AuthFormState }) {
  if (state.error) {
    return (
      <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
        <p className="text-sm text-red-600">{state.error}</p>
      </div>
    );
  }
  if (state.notice) {
    return (
      <div role="status" className="rounded-lg bg-green-50 border border-green-200 px-3 py-2">
        <p className="text-sm text-green-700">{state.notice}</p>
      </div>
    );
  }
  return null;
}
