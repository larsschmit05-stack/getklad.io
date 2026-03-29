export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Klad
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            AI canvas for solo builders
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
