export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(92,124,250,0.15),transparent_50%)]" />
      <div className="w-full max-w-md px-4 relative z-10">{children}</div>
    </div>
  );
}
