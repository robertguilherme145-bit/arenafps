import { RefreshCw } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";

// Quando os dados da Minha Arena nao carregam: aviso claro e um jeito de tentar de novo.
export function LoadFailed({ onRetry }: { onRetry: () => void }) {
  return <EmptyState title="Não foi possível carregar seus dados" description="Verifique a conexão e tente de novo. Se continuar, fale com o suporte." action={<Button icon={<RefreshCw className="h-4 w-4" />} onClick={onRetry} variant="secondary">Tentar de novo</Button>} />;
}
