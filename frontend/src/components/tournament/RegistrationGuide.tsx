import { Check, Circle, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import type { Guide } from "../../lib/registrationGuide";
import { cn } from "../../utils/cn";
import { Button } from "../ui/Button";

const STATE_ICON = {
  feito:<Check aria-hidden="true" className="h-4 w-4 text-arena-success" />,
  pendente:<Circle aria-hidden="true" className="h-4 w-4 text-arena-amber" />,
  bloqueado:<Lock aria-hidden="true" className="h-4 w-4 text-arena-muted/60" />
};
const STATE_LABEL = { feito:"feito", pendente:"pendente", bloqueado:"depois" };

// Cartao "Sua inscricao": mostra em que passo a pessoa esta e o botao do proximo passo.
export function RegistrationGuide({ guide }: { guide: Guide }) {
  return (
    <aside aria-label="Sua inscrição" className="w-full border border-arena-line bg-arena-panel p-4 lg:w-80">
      <h2 className="font-display text-lg font-semibold">Sua inscrição</h2>
      {guide.steps.length ? <ol className="mt-3 space-y-1.5">
        {guide.steps.map((step) => (
          <li className="flex items-center justify-between gap-3 text-sm" key={step.label}>
            <span className={cn("flex items-center gap-2", step.state === "bloqueado" && "text-arena-muted")}>{STATE_ICON[step.state]}{step.label}</span>
            <span className={cn("text-xs", step.state === "feito" ? "text-arena-success" : step.state === "pendente" ? "text-arena-amber" : "text-arena-muted")}>{STATE_LABEL[step.state]}</span>
          </li>
        ))}
      </ol> : null}
      {guide.action ? (
        <Link className="mt-4 block" to={guide.action.href}>
          <Button className="w-full" variant={guide.action.tone}>{guide.action.label}</Button>
        </Link>
      ) : null}
      {guide.note ? <p className="mt-3 text-sm text-arena-muted">{guide.note}</p> : null}
    </aside>
  );
}
