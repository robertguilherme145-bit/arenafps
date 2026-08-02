import { CheckCircle2, Pencil, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

export type AttendanceStatus = "confirmado" | "ausente" | "talvez";

const labels: Record<AttendanceStatus, string> = {
  confirmado: "Presença confirmada",
  ausente: "Ausência informada",
  talvez: "Talvez participe"
};

export function AttendanceResponse({
  value,
  busy = false,
  allowMaybe = true,
  compact = false,
  onChange
}: {
  value?: string | null;
  busy?: boolean;
  allowMaybe?: boolean;
  compact?: boolean;
  onChange: (status: AttendanceStatus) => void;
}) {
  const current = isAttendanceStatus(value) ? value : null;
  const [editing, setEditing] = useState(!current);

  useEffect(() => setEditing(!current), [current]);

  if (current && !editing) {
    return <div className="flex flex-wrap items-center gap-2">
      <Badge tone={current === "ausente" ? "danger" : current === "talvez" ? "info" : "success"}>{labels[current]}</Badge>
      <Button className={compact ? "h-8 px-3 text-xs" : ""} icon={<Pencil className="h-3.5 w-3.5" />} variant="secondary" onClick={() => setEditing(true)}>Alterar resposta</Button>
    </div>;
  }

  return <div className="flex flex-wrap gap-2">
    <Button className={compact ? "h-8 px-3 text-xs" : ""} disabled={busy || current === "confirmado"} icon={<CheckCircle2 className="h-4 w-4" />} loading={busy} onClick={() => onChange("confirmado")}>Confirmar presença</Button>
    {allowMaybe ? <Button className={compact ? "h-8 px-3 text-xs" : ""} disabled={busy || current === "talvez"} variant="secondary" onClick={() => onChange("talvez")}>Talvez</Button> : null}
    <Button className={compact ? "h-8 px-3 text-xs" : ""} disabled={busy || current === "ausente"} icon={<XCircle className="h-4 w-4" />} variant="danger" onClick={() => onChange("ausente")}>Não poderei</Button>
    {current ? <Button className={compact ? "h-8 px-3 text-xs" : ""} disabled={busy} variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button> : null}
  </div>;
}

function isAttendanceStatus(value: string | null | undefined): value is AttendanceStatus {
  return value === "confirmado" || value === "ausente" || value === "talvez";
}
