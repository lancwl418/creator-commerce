interface AuthFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string;
  label: string;
}

export default function AuthField({ name, label, ...input }: AuthFieldProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        id={name}
        name={name}
        required
        className="w-full rounded-xl bg-white border border-border px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-500 transition-all"
        {...input}
      />
    </div>
  );
}
