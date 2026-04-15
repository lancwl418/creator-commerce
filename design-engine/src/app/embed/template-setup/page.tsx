import { validateEmbedAuthFromParams } from '@/lib/embedAuth';
import TemplateSetupApp from '@/components/embed/TemplateSetupApp';

interface PageProps {
  searchParams: Promise<{ key?: string }>;
}

export default async function TemplateSetupPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const auth = validateEmbedAuthFromParams(params);

  if (!auth.ok) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-8">
        <div className="max-w-md w-full bg-white rounded-xl shadow p-6 border border-red-200">
          <h1 className="text-lg font-semibold text-red-600 mb-2">Unauthorized</h1>
          <p className="text-sm text-gray-600">{auth.reason}</p>
          <p className="text-xs text-gray-400 mt-3">
            This page must be opened from an authorized host with a valid <code>?key=</code> parameter.
          </p>
        </div>
      </div>
    );
  }

  return <TemplateSetupApp embedKey={params.key!} />;
}
