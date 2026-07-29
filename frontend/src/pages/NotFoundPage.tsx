import { Compass } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";

export function NotFoundPage() {
  return (
    <section className="flex min-h-[calc(100vh-120px)] items-center px-4 py-12 lg:px-8">
      <Card className="mx-auto w-full max-w-2xl">
        <CardContent className="flex flex-col items-center py-16 text-center">
          <Compass className="h-12 w-12 text-cyan-200" />
          <p className="mt-6 text-xs font-semibold uppercase tracking-[.2em] text-cyan-200">404</p>
          <h1 className="mt-3 font-display text-4xl font-bold">Rota não encontrada</h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-arena-muted">
            A pagina que você tentou abrir não existe na navegacao atual da Arena Camp.
          </p>
          <Link className="mt-8" to="/">
            <Button>Voltar para a home</Button>
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}
