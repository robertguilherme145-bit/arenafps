import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ExternalLink, X } from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Card, CardHeader } from "../../../components/ui/Card";
import { DataTable } from "../../../components/ui/DataTable";
import { useToast } from "../../../hooks/useToast";
import { getAdminMixPayments, updateAdminMixPayment } from "../../../services/api";
import type { AdminPayment } from "../../../types/api";
import { safeHref } from "../../../utils/safeHref";
import { PaymentSettingsCard } from "../PaymentSettingsCard";
import { formatCurrency, formatDateTime, paymentTone } from "../adminShared";

type Status = "aprovado" | "pendente" | "cancelado" | "rejeitado";
type Props = { payments: AdminPayment[]; onStatus: (paymentId: number, status: Status) => void };

const PROVIDER: Record<string, string> = { mercadopago:"Mercado Pago", pix_manual:"PIX próprio", paypal:"PayPal" };
const STATUS: Record<string, string> = { pendente:"Pendente", aprovado:"Confirmado", cancelado:"Cancelado", rejeitado:"Recusado" };

// Financeiro: forma de recebimento, pagamentos das equipes e do Mix, com confirmacao manual do PIX proprio.
export function FinanceSection({ payments, onStatus }: Props) {
  const toast = useToast();
  const client = useQueryClient();
  const { data: mixPayments = [] } = useQuery({ queryKey:["admin-mix-payments"], queryFn:getAdminMixPayments });
  const teamToConfirm = payments.filter((item) => item.status === "pendente" && item.declared_at).length;
  const mixToConfirm = mixPayments.filter((item) => item.status === "pendente" && item.declared_at).length;
  const hint = (count: number) => count ? `${count} pagamento(s) informado(s) esperando você conferir no extrato.` : "No PIX próprio, confira no extrato do banco pelo código da inscrição e confirme aqui.";

  async function decideMix(id: number, status: Status) {
    try {
      await updateAdminMixPayment(id, status);
      await Promise.all([client.invalidateQueries({ queryKey:["admin-mix-payments"] }), client.invalidateQueries({ queryKey:["admin-today"] })]);
      toast.success(status === "aprovado" ? "Pagamento confirmado" : "Pagamento atualizado");
    } catch (reason) {
      toast.error("Não foi possível atualizar", reason instanceof Error ? reason.message : "Tente novamente.");
    }
  }

  return (
    <>
      <PaymentSettingsCard />

      <Card className="mt-6">
        <CardHeader>
          <h2 className="font-display text-xl font-semibold">Inscrições de equipes</h2>
          <p className="mt-1 text-sm text-arena-muted">{hint(teamToConfirm)}</p>
        </CardHeader>
        <DataTable
          data={payments}
          empty={<div className="p-6 text-sm text-arena-muted">Nenhum pagamento ainda.</div>}
          columns={[
            { header:"Equipe", cell:(item) => <div><p className="font-semibold">{item.team_name}</p><p className="text-xs text-arena-muted">{item.tournament_name}</p></div> },
            { header:"Valor", cell:(item) => formatCurrency(item.valor) },
            { header:"Forma", cell:(item) => <div><p>{PROVIDER[item.provider] ?? item.provider}</p>{item.external_reference && item.provider === "pix_manual" ? <p className="font-mono text-xs text-arena-muted">{item.external_reference}</p> : null}</div> },
            { header:"Situação", cell:(item) => <PaymentState declaredAt={item.declared_at} receipt={item.receipt_url} status={item.status} /> },
            { header:"Ações", cell:(item) => <Decision onDecide={(status) => onStatus(item.id, status)} status={item.status} who={item.team_name} /> }
          ]}
        />
      </Card>

      <Card className="mt-6">
        <CardHeader><h2 className="font-display text-xl font-semibold">Inscrições do Mix</h2><p className="mt-1 text-sm text-arena-muted">{hint(mixToConfirm)}</p></CardHeader>
        <DataTable
          data={mixPayments}
          empty={<div className="p-6 text-sm text-arena-muted">Nenhum pagamento de Mix ainda.</div>}
          columns={[
            { header:"Jogador", cell:(item) => <div><p className="font-semibold">{item.player_name}</p><p className="text-xs text-arena-muted">{item.tournament_name}</p></div> },
            { header:"Valor", cell:(item) => formatCurrency(Number(item.valor)) },
            { header:"Forma", cell:(item) => <div><p>{PROVIDER[item.provider] ?? item.provider}</p>{item.external_reference && item.provider === "pix_manual" ? <p className="font-mono text-xs text-arena-muted">{item.external_reference}</p> : null}</div> },
            { header:"Situação", cell:(item) => <PaymentState declaredAt={item.declared_at} receipt={item.receipt_url} status={item.status} /> },
            { header:"Ações", cell:(item) => <Decision onDecide={(status) => void decideMix(item.id, status)} status={item.status} who={item.player_name} /> }
          ]}
        />
      </Card>
    </>
  );
}

function PaymentState({ status, declaredAt, receipt }: { status: string; declaredAt?: string | null; receipt?: string | null }) {
  const link = safeHref(receipt ?? "");
  return (
    <div className="space-y-1">
      <Badge tone={paymentTone(status as AdminPayment["status"])}>{STATUS[status] ?? status}</Badge>
      {status === "pendente" && declaredAt ? <p className="text-xs text-arena-amber">Disse que pagou em {formatDateTime(declaredAt)}</p> : null}
      {link ? <a className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-200 hover:text-cyan-100" href={link} rel="noreferrer" target="_blank">Ver comprovante <ExternalLink className="h-3 w-3" /></a> : null}
    </div>
  );
}

function Decision({ status, who, onDecide }: { status: string; who: string; onDecide: (status: Status) => void }) {
  if (status === "pendente") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button className="h-8 text-xs" icon={<Check className="h-3.5 w-3.5" />} onClick={() => { if (window.confirm(`Confirmar o pagamento de ${who}? Confira antes no extrato do banco.`)) onDecide("aprovado"); }}>Confirmar</Button>
        <Button className="h-8 text-xs" icon={<X className="h-3.5 w-3.5" />} onClick={() => { if (window.confirm(`Recusar o pagamento de ${who}?`)) onDecide("rejeitado"); }} variant="secondary">Recusar</Button>
      </div>
    );
  }
  if (status === "rejeitado" || status === "cancelado") {
    return <Button className="h-8 text-xs" onClick={() => onDecide("pendente")} variant="ghost">Reabrir</Button>;
  }
  return <span className="text-xs text-arena-muted">Concluído</span>;
}
