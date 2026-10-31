import Image from 'next/image';
import Link from 'next/link';

/**
 * Logo final sobre fondo claro. El archivo está recortado sin deformarse.
 */
export function RutaWordmark({ size = 30 }: { size?: number }) {
  return (
    <Image
      src="/brand/ruta-logo-black.png"
      alt="ruta RIDES"
      width={2872}
      height={1380}
      priority
      style={{ height: size, width: 'auto' }}
    />
  );
}

export default function RutaLogo({
  href = '/',
  size = 30,
}: {
  href?: string | null;
  size?: number;
}) {
  if (!href) return <RutaWordmark size={size} />;

  return (
    <Link href={href} className="inline-flex items-center rounded-2xl">
      <RutaWordmark size={size} />
    </Link>
  );
}
