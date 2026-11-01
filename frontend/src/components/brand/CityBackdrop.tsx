import Image from 'next/image';

/**
 * Fondo de ciudad RUTA RIDES.
 *
 * Se muestra completo, sin recortes: la imagen se ajusta al ancho disponible y
 * conserva su proporción. En superficies oscuras se invierte para que el trazo
 * se vea blanco; en superficies claras se usa tal cual.
 */
export default function CityBackdrop({
  tone = 'light',
  opacity,
  className = '',
  priority = false,
}: {
  tone?: 'light' | 'dark';
  opacity?: number;
  className?: string;
  priority?: boolean;
}) {
  const resolvedOpacity = opacity ?? (tone === 'dark' ? 0.18 : 0.55);

  return (
    <div
      className={`pointer-events-none select-none ${className}`}
      aria-hidden="true"
      style={{ opacity: resolvedOpacity }}
    >
      <Image
        src="/brand/ciudad.png"
        alt=""
        width={1537}
        height={405}
        sizes="100vw"
        priority={priority}
        className={`h-auto w-full ${tone === 'dark' ? 'invert' : ''}`}
      />
    </div>
  );
}
