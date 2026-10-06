import Link from 'next/link';

interface FlowErrorProps {
  title: string;
  error: string;
}

export default function FlowError({ title, error }: FlowErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <p className="text-red-600 font-medium mb-2">{title}</p>
      <p role="alert" className="text-gray-500 text-sm mb-4">{error}</p>
      <Link href="/dashboard/products" className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-500">
        Go to Products
      </Link>
    </div>
  );
}
