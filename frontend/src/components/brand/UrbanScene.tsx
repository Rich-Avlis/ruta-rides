/**
 * Escena urbana original de RUTA RIDES.
 * Ilustración vectorial propia (sin fotografía de terceros): skyline, avenida y
 * trazo de ruta. Se usa en portada, selección de rol y favoritos.
 */
export function UrbanScene({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 390 420"
      fill="none"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="rutaSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0B0B0B" />
          <stop offset="62%" stopColor="#141414" />
          <stop offset="100%" stopColor="#1D1D1D" />
        </linearGradient>
        <linearGradient id="rutaArc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FD7624" />
          <stop offset="100%" stopColor="#E35C0D" />
        </linearGradient>
        <linearGradient id="rutaRoad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2A2A2A" />
          <stop offset="100%" stopColor="#0E0E0E" />
        </linearGradient>
      </defs>

      <rect width="390" height="420" fill="url(#rutaSky)" />

      {/* Arco naranja de marca */}
      <path
        d="M292 -40C392 -30 430 66 414 156c-14 82-84 132-160 120 60-22 96-70 100-128 4-62-24-104-62-130Z"
        fill="url(#rutaArc)"
        opacity="0.92"
      />

      {/* Skyline lejano */}
      <g fill="#202020">
        <rect x="8" y="196" width="26" height="120" rx="3" />
        <rect x="40" y="170" width="18" height="146" rx="3" />
        <rect x="64" y="210" width="34" height="106" rx="3" />
        <rect x="104" y="184" width="22" height="132" rx="3" />
        <rect x="132" y="222" width="30" height="94" rx="3" />
        <rect x="170" y="192" width="20" height="124" rx="3" />
        <rect x="196" y="212" width="28" height="104" rx="3" />
        <rect x="230" y="178" width="22" height="138" rx="3" />
        <rect x="258" y="204" width="32" height="112" rx="3" />
        <rect x="296" y="188" width="20" height="128" rx="3" />
        <rect x="322" y="216" width="30" height="100" rx="3" />
        <rect x="358" y="200" width="24" height="116" rx="3" />
      </g>

      {/* Ventanas encendidas */}
      <g fill="#FD7624" opacity="0.55">
        <rect x="46" y="184" width="3" height="8" />
        <rect x="52" y="200" width="3" height="8" />
        <rect x="110" y="198" width="3" height="8" />
        <rect x="116" y="224" width="3" height="8" />
        <rect x="236" y="192" width="3" height="8" />
        <rect x="242" y="214" width="3" height="8" />
        <rect x="302" y="204" width="3" height="8" />
        <rect x="328" y="230" width="3" height="8" />
      </g>

      {/* Avenida */}
      <path d="M120 420 186 300h18l66 120Z" fill="url(#rutaRoad)" />
      <path d="M192 420l3-22M189 386l4-26M186 344l5-30" stroke="#FD7624" strokeWidth="4" strokeLinecap="round" opacity="0.85" />
      <path d="M120 420 186 300M270 420 204 300" stroke="#2E2E2E" strokeWidth="2" />

      {/* Trazo de ruta */}
      <path
        d="M56 300c34-6 40-42 74-48 26-5 32-26 44-44"
        stroke="#FD7624"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="2 10"
      />
      <circle cx="56" cy="300" r="6" fill="#FD7624" />
      <circle cx="56" cy="300" r="12" stroke="#FD7624" strokeOpacity="0.3" strokeWidth="3" />
    </svg>
  );
}

/** Franja de skyline para el pie de pantallas claras. */
export function SkylineStrip({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 390 120"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d="M0 120V78l18-4v-14l16 3v31l22-5V63l20 4v53Z" fill="#0B0B0B" opacity="0.9" />
      <path d="M78 120V70l14-3v-16l18 4v65Z" fill="#171717" />
      <path d="M112 120V86l26-4V56l22 5v59Z" fill="#0B0B0B" opacity="0.92" />
      <path d="M162 120V74l16 3V48l18-4v76Z" fill="#1D1D1D" />
      <path d="M198 120V88l30-6V62l20 4v54Z" fill="#0B0B0B" opacity="0.9" />
      <path d="M250 120V66l18 4v50Z" fill="#171717" />
      <path d="M270 120V80l26-4v44Z" fill="#0B0B0B" opacity="0.88" />
      <path d="M298 120V58l20 5v57Z" fill="#1D1D1D" />
      <path d="M320 120V84l30-5v41Z" fill="#0B0B0B" opacity="0.9" />
      <path d="M352 120V70l20 4v46Z" fill="#171717" />
      <path d="M374 120V90l16-4v34Z" fill="#0B0B0B" opacity="0.86" />
      <g fill="#FD7624">
        <rect x="24" y="84" width="3" height="6" opacity="0.75" />
        <rect x="126" y="74" width="3" height="6" opacity="0.6" />
        <rect x="176" y="70" width="3" height="6" opacity="0.7" />
        <rect x="306" y="76" width="3" height="6" opacity="0.55" />
      </g>
      <path d="M0 120h390" stroke="#0B0B0B" strokeWidth="1" />
    </svg>
  );
}
