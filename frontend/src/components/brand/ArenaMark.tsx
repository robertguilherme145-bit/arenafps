type ArenaMarkProps = { size?: number; className?: string };

// Mira de transmissao: anel, quatro tracos com vao no centro e o ponto ambar.
export function ArenaMark({ size = 32, className }: ArenaMarkProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" height={size} viewBox="0 0 32 32" width={size}>
      <circle cx="16" cy="16" r="12.5" stroke="#E9EEF4" strokeWidth="2.5" />
      <path d="M16 1.5v8M16 22.5v8M1.5 16h8M22.5 16h8" stroke="#E9EEF4" strokeLinecap="square" strokeWidth="2.5" />
      <circle cx="16" cy="16" fill="#FFB020" r="3.5" />
    </svg>
  );
}
