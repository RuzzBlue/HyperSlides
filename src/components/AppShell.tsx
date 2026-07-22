import type { ReactNode } from 'react';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col bg-[linear-gradient(180deg,var(--chrome-top)_0%,var(--chrome)_100%)]">
      {children}
    </div>
  );
}
