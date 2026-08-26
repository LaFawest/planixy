// Planixy Logo — Icon (Blattgrundriss mit "P") + Wordmark
// Nutzung in der Topbar z.B.: <PlanixyLogo size={32} />
// Nutzung ohne Schriftzug (z.B. sehr schmale mobile Ansicht): <PlanixyLogo size={32} showWordmark={false} />

export function PlanixyIcon({ size = 32, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
    >
      <circle cx="50" cy="50" r="46" fill="#2F4B39" />
      <circle
        cx="50"
        cy="50"
        r="40"
        fill="none"
        stroke="#C9A66B"
        strokeWidth="1.4"
        opacity="0.85"
      />
      <path
        d="M50 86 C33 79 24 60 27 43 C29 27 38 16 50 12 C62 16 71 27 73 43 C76 60 67 79 50 86 Z"
        fill="#F2E9D8"
      />
      <g
        stroke="#2F4B39"
        strokeWidth="4.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M50 78 L50 18" />
        <path d="M50 50 A16 16 0 0 0 50 18" />
        <path d="M50 62 L36 48" />
      </g>
      <line
        x1="50"
        y1="86"
        x2="50"
        y2="92"
        stroke="#C9A66B"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function PlanixyLogo({ size = 32, showWordmark = true, className = '' }) {
  return (
    <span
      className={`planixy-logo ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.28 }}
    >
      <PlanixyIcon size={size} />
      {showWordmark && (
        <span
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontWeight: 600,
            fontSize: size * 0.62,
            color: '#1F3327',
            letterSpacing: '0.005em',
            lineHeight: 1,
          }}
        >
          Planixy
        </span>
      )}
    </span>
  );
}

// Auf dunklem Grund (z.B. dunkle Topbar): Wordmark-Farbe auf #F2E9D8 setzen,
// entweder per className + CSS-Override oder eine "dark"-Variante der
// style-Farbe #1F3327 -> #F2E9D8 ergänzen, falls die App einen Dark-Mode hat.
