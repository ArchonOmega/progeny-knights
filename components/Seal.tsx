/** The Order's seal — shield, crossed blades, and the drop within a ring. */
export default function Seal({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <circle cx="60" cy="60" r="56" stroke="var(--gold-dim)" strokeWidth="1.5" />
      <circle cx="60" cy="60" r="50" stroke="var(--gold)" strokeWidth="0.75" opacity="0.6" />
      <g stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" opacity="0.9">
        <path d="M32 30 L84 88" /><path d="M88 30 L36 88" />
        <path d="M28 34 L40 26" /><path d="M92 34 L80 26" />
      </g>
      <path
        d="M60 24 L86 34 V62 C86 80 74 92 60 99 C46 92 34 80 34 62 V34 Z"
        fill="var(--night)" stroke="var(--gold)" strokeWidth="2.5"
      />
      <path
        d="M60 31 L79 38.5 V61 C79 75 70 85 60 91 C50 85 41 75 41 61 V38.5 Z"
        stroke="var(--blood-hi)" strokeWidth="1.2" opacity="0.8"
      />
      <path
        d="M60 44 C60 44 70 58 70 66 C70 72.5 65.5 77 60 77 C54.5 77 50 72.5 50 66 C50 58 60 44 60 44 Z"
        fill="var(--blood)" stroke="var(--blood-hi)" strokeWidth="1"
      />
      <path d="M63 62 C64.5 64 65 66 64.5 68" stroke="var(--bone)" strokeWidth="1" opacity="0.5" strokeLinecap="round" />
    </svg>
  );
}
