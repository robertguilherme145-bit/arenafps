import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Card, CardHeader } from "../../../components/ui/Card";
import { DataTable } from "../../../components/ui/DataTable";
import type { AdminPayment } from "../../../types/api";
import { formatCurrency, paymentTone } from "../adminShared";

type Props = { payments: AdminPayment[]; onStatus: (paymentId: number, status: "aprovado" | "pendente" | "cancelado") => void };

// Financeiro: pagamentos das inscricoes, com aprovacao manual quando a conciliacao nao resolve sozinha.
export function FinanceSection({ payments, onStatus }: Props) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <h2 className="font-display text-xl font-semibold">Pagamentos</h2>
        <p className="mt-1 text-sm text-arena-muted">PIX confirmados chegam sozinhos. Use os botões só quando precisar corrigir.</p>
      </CardHeader>
      <DataTable
        data={payments}
        empty={<div className="p-6 text-sm text-arena-muted">Nenhum pagamento encontrado.</div>}
        columns={[
          { header:"Equipe", cell:(item) => item.team_name },
          { header:"Torneio", cell:(item) => item.tournament_name },
          { header:"Valor", cell:(item) => formatCurrency(item.valor) },
          { header:"Pagamento", cell:(item) => <Badge tone={paymentTone(item.status)}>{item.status}</Badge> },
          { header:"Inscrição", cell:(item) => <Badge tone={item.entry_payment_status === "pago" ? "success" : "warning"}>{item.entry_payment_status}</Badge> },
          {
            header:"Ações",
            cell:(item) => (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => onStatus(item.id, "aprovado")}>Aprovar</Button>
                <Button variant="secondary" onClick={() => onStatus(item.id, "pendente")}>Pendente</Button>
                <Button variant="danger" onClick={() => { if (window.confirm(`Cancelar o pagamento de ${item.team_name}?`)) onStatus(item.id, "cancelado"); }}>Cancelar</Button>
              </div>
            )
          }
        ]}
      />
    </Card>
  );
}
