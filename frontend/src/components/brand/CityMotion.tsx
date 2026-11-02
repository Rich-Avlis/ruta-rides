/**
 * Capa de movimiento urbano para RUTA RIDES.
 * Luces de vehículos, ruta punteada en marcha y ventanas que parpadean.
 * Todo CSS/SVG, sin JavaScript en el cliente.
 */
export default function CityMotion({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`pointer-events-none ${className}`}
      viewBox="0 0 390 120"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="rutaTrail" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FD7624" stopOpacity="0" />
          <stop offset="55%" stopColor="#FD7624" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#FD7624" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="rutaLamp" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#FD7624" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FD7624" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Ruta en movimiento */}
      <path
        d="M-20 98C50 98 66 58 128 58s74-24 128-24 62 10 154 10"
        stroke="#FD7624"
        strokeOpacity="0.45"
        strokeWidth="2"
        strokeDasharray="5 12"
        className="motion-dash"
      />

      {/* Luces de vehículos */}
      <rect x="-60" y="96" width="52" height="3" rx="1.5" fill="url(#rutaTrail)" className="motion-car motion-car-1" />
      <rect x="-60" y="78" width="34" height="2.5" rx="1.2" fill="url(#rutaTrail)" className="motion-car motion-car-2" />
      <rect x="-60" y="62" width="24" height="2" rx="1" fill="url(#rutaTrail)" className="motion-car motion-car-3" />

      {/* Luces de calle */}
      <g fill="#FD7624">
        <rect x="34" y="46" width="2" height="4" className="motion-blink motion-blink-1" />
        <rect x="104" y="40" width="2" height="4" className="motion-blink motion-blink-2" />
        <rect x="186" y="34" width="2" height="4" className="motion-blink motion-blink-3" />
        <rect x="268" y="42" width="2" height="4" className="motion-blink motion-blink-1" />
        <rect x="332" y="52" width="2" height="4" className="motion-blink motion-blink-2" />
      </g>

      {/* Faro central */}
      <circle cx="196" cy="30" r="16" fill="url(#rutaLamp)" className="motion-lamp" />
      <circle cx="196" cy="30" r="3" fill="#FD7624" className="motion-blink motion-blink-2" />
    </svg>
  );
}
