import Link from 'next/link';

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  switchText: string;
  switchLabel: string;
  switchHref: string;
}

export default function AuthCard({ title, subtitle, children, switchText, switchLabel, switchHref }: AuthCardProps) {
  return (
    <div className="rounded-2xl bg-white p-8 shadow-xl shadow-black/5 border border-border">
      <h1 className="text-2xl font-bold text-center mb-1 text-gray-900">{title}</h1>
      <p className="text-gray-500 text-center mb-8 text-sm">{subtitle}</p>
      {children}
      <p className="mt-6 text-center text-sm text-gray-500">
        {switchText}{' '}
        <Link href={switchHref} className="font-semibold text-gray-900 underline underline-offset-2">
          {switchLabel}
        </Link>
      </p>
    </div>
  );
}
