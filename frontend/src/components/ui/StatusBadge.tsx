import { tournamentStatusLabel } from "../../lib/tournamentStatus";
import { Badge } from "./Badge";

export function TournamentStatusBadge({ status, className }: { status: string; className?: string }) {
  const { label, tone } = tournamentStatusLabel(status);
  return <Badge className={className} tone={tone}>{label}</Badge>;
}
