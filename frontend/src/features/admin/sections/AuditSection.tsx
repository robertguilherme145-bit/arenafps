import { RefreshCw } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Card, CardHeader } from "../../../components/ui/Card";
import { DataTable } from "../../../components/ui/DataTable";
import type { AuditLog } from "../../../types/api";
import { auditActionLabel, formatDateTime, stringifyDetails } from "../adminShared";

type Props = { logs: AuditLog[]; loading: boolean; onReload: () => void };

// Auditoria: quem mudou o que no painel, e quando.
export function AuditSection({ logs, loading, onReload }: Props) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">Histórico de alterações</h2>
          <Button variant="secondary" icon={<RefreshCw className="h-4 w-4" />} onClick={onReload}>Atualizar</Button>
        </div>
      </CardHeader>
      <DataTable
        data={logs}
        empty={<div className="p-6 text-sm text-arena-muted">{loading ? "Carregando histórico..." : "Nenhuma alteração registrada."}</div>}
        columns={[
          { header:"Quando", cell:(item) => formatDateTime(item.created_at) },
          { header:"Quem", cell:(item) => item.actor_name ?? `Usuário ${item.actor_user_id}` },
          { header:"O que", cell:(item) => auditActionLabel(item.action) },
          { header:"Onde", cell:(item) => `${item.entity_type}${item.entity_id ? ` #${item.entity_id}` : ""}` },
          { header:"Detalhes", cell:(item) => <span className="line-clamp-2 text-xs text-arena-muted">{stringifyDetails(item.details)}</span> }
        ]}
      />
    </Card>
  );
}
