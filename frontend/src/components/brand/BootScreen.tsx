import { ArenaMark } from "./ArenaMark";

// Tela enquanto uma pagina carrega: mesma marca e fundo da tela inicial do index.html.
export function BootScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-arena-bg" role="status">
      <ArenaMark className="animate-pulse" size={44} />
      <span className="sr-only">Carregando Arena Camp</span>
    </div>
  );
}
