export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-secondary">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,209,102,0.22),transparent_55%)]" />
      <div className="w-full max-w-md px-4 relative z-10">{children}</div>
    </div>
  );
}
