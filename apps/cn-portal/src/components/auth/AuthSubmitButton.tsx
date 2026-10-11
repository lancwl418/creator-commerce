interface AuthSubmitButtonProps {
  pending: boolean;
  label: string;
  pendingLabel: string;
}

export default function AuthSubmitButton({ pending, label, pendingLabel }: AuthSubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
