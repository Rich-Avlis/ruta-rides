'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { UserRole } from '@/lib/types';

const ICONS: Record<string, React.ReactNode> = {
  home: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  ),
  trips: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  heart: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 20s-7-4.3-7-9.3A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7 3.7c0 5-7 9.3-7 9.3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  ),
  user: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M4 21a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  money: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
};

export default function BottomNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const isDriver = role === 'DRIVER';

  const items = isDriver
    ? [
        { href: '/driver', label: 'Inicio', icon: 'home' },
        { href: '/dashboard', label: 'Viajes', icon: 'trips' },
        { href: '/driver/earnings', label: 'Ingresos', icon: 'money' },
        { href: '/profile', label: 'Perfil', icon: 'user' },
      ]
    : [
        { href: '/passenger', label: 'Inicio', icon: 'home' },
        { href: '/dashboard', label: 'Viajes', icon: 'trips' },
        { href: '/favorites', label: 'Favoritos', icon: 'heart' },
        { href: '/profile', label: 'Perfil', icon: 'user' },
      ];

  return (
    <nav className="bottom-nav" aria-label="Navegación inferior">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
            >
              {ICONS[item.icon]}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
