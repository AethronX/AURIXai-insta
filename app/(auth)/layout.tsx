export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-brand text-sm font-bold text-brand-foreground">
            A
          </div>
          <span className="text-lg font-semibold tracking-tight">AURIX Social AI</span>
        </div>
        {children}
      </div>
    </div>
  );
}
