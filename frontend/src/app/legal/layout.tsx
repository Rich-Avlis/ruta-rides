import Link from 'next/link';
import type { ReactNode } from 'react';

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          <Link
            href="/profile"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line"
            aria-label="Volver"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <span className="text-sm font-black">RUTA RIDES</span>
        </div>
      </header>
      <article className="prose-ruta mx-auto max-w-2xl px-5 py-6 text-[14px] leading-relaxed text-ink">
        {children}
      </article>
    </main>
  );
}
