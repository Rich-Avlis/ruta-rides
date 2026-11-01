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
      <rect x="4" y="4" width="16" height="16" rx="4" stroke="currentColor" strokeWidth="2" />
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
  pin: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.6" fill="currentColor" />
    </svg>
  ),
};

type Item = { href: string; label: string; icon: string; center?: boolean };

export default function BottomNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const isDriver = role === 'DRIVER';

  const items: Item[] = isDriver
    ? [
        { href: '/driver', label: 'Inicio', icon: 'home' },
        { href: '/dashboard', label: 'Viajes', icon: 'trips' },
        { href: '/driver/earnings', label: 'Ingresos', icon: 'money' },
        { href: '/profile', label: 'Perfil', icon: 'user' },
      ]
    : [
        { href: '/passenger', label: 'Inicio', icon: 'home' },
        { href: '/dashboard', label: 'Viajes', icon: 'trips' },
        { href: '/passenger', label: 'Pedir', icon: 'pin', center: true },
        { href: '/favorites', label: 'Favoritos', icon: 'heart' },
        { href: '/profile', label: 'Perfil', icon: 'user' },
      ];

  return (
    <nav className={`bottom-nav ${isDriver ? '' : 'bottom-nav--five'}`} aria-label="Navegación inferior">
      <div className={`bottom-nav-inner ${isDriver ? '' : 'grid-cols-5'}`}>
        {items.map((item) => {
          const active =
            item.href === '/passenger'
              ? pathname === '/passenger' || pathname.startsWith('/passenger/')
              : pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));

          if (item.center) {
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className="bottom-nav-center"
              >
                <span className="bottom-nav-center__button">{ICONS[item.icon]}</span>
                <span className="sr-only">{item.label}</span>
              </Link>
            );
          }

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
