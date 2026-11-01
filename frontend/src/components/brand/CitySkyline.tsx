import Image from 'next/image';

/**
 * Skyline de ciudad en trazo, recurso entregado para RUTA RIDES.
 * Se usa como pie gráfico en pantallas claras y como silueta en el hero.
 */
export default function CitySkyline({ className = '' }: { className?: string }) {
  return (
    <Image
      src="/brand/ciudad.png"
      alt=""
      width={1600}
      height={900}
      sizes="(max-width: 768px) 100vw, 720px"
      className={className}
      aria-hidden="true"
    />
  );
}
