import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, RefreshCw, Server, ShieldAlert } from "lucide-react";
import { getAdminDiscordStatus, setupAdminDiscordServer } from "../../services/api";
import type { DiscordServerStatus, DiscordSetupResult } from "../../types/api";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { useToast } from "../../hooks/useToast";

export function DiscordServerWorkspace() {
  const toast = useToast();
  const [status,setStatus] = useState<DiscordServerStatus | null>(null);
  const [report,setReport] = useState<DiscordSetupResult | null>(null);
  const [loading,setLoading] = useState(false);
  const ready = useMemo(()=>status?.blueprint?.every((category)=>category.ready && category.channels.every((channel)=>channel.ready)) ?? false,[status]);

  async function load() {
    setLoading(true);
    try { setStatus(await getAdminDiscordStatus()); }
    catch (error) { toast.error("Falha ao verificar Discord",error instanceof Error ? error.message : "Tente novamente."); }
    finally { setLoading(false); }
  }

  async function sync() {
    setLoading(true);
    try {
      const result = await setupAdminDiscordServer();
      setReport(result);
      toast.success("Servidor sincronizado",`${result.created.length} itens criados e ${result.reused.length} reaproveitados.`);
      setStatus(await getAdminDiscordStatus());
    } catch (error) { toast.error("Falha ao sincronizar Discord",error instanceof Error ? error.message : "Confira as permissoes do bot."); }
    finally { setLoading(false); }
  }

  useEffect(()=>{ void load(); },[]);

  return <Card className="mt-6">
    <CardHeader>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Server className="h-5 w-5 text-cyan-200" />
          <div><h2 className="font-display text-xl font-semibold">Discord oficial</h2><p className="text-sm text-arena-muted">Estrutura da comunidade, avisos e salas automáticas de partidas.</p></div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={status?.connected ? "success" : "danger"}>{status?.connected ? "Conectado" : "Desconectado"}</Badge>
          <Button aria-label="Atualizar estado do Discord" icon={<RefreshCw className="h-4 w-4" />} loading={loading} variant="secondary" onClick={()=>void load()}>Verificar</Button>
          <Button disabled={!status?.connected} loading={loading} icon={<Server className="h-4 w-4" />} onClick={()=>void sync()}>Sincronizar servidor</Button>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-5">
      {status?.guild ? <div className="flex flex-wrap items-center justify-between border border-arena-line bg-arena-panel/40 p-4"><div><p className="font-semibold">{status.guild.name}</p><p className="text-xs text-arena-muted">Servidor {status.guild.id}</p></div><Badge tone={ready ? "success" : "warning"}>{ready ? "Estrutura completa" : "Sincronização pendente"}</Badge></div> : <div className="flex items-center gap-3 border border-red-400/30 bg-red-400/[.05] p-4 text-sm"><ShieldAlert className="h-5 w-5 text-red-300" />Confira token, ID do servidor e permissões do bot.</div>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{status?.blueprint?.map((category)=><div className="border border-arena-line p-4" key={category.name}><div className="mb-3 flex items-center justify-between"><strong className="text-sm">{category.name}</strong>{category.ready ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <ShieldAlert className="h-4 w-4 text-amber-300" />}</div><div className="space-y-2">{category.channels.map((channel)=><div className="flex items-center justify-between text-xs text-arena-muted" key={channel.name}><span>#{channel.name}</span><span>{channel.ready ? "Pronto" : "Pendente"}</span></div>)}</div></div>)}</div>
      {report ? <p className="text-sm text-arena-muted">Última sincronização: {report.created.length} criados, {report.reused.length} reaproveitados e {report.messages.length} mensagens institucionais publicadas.</p> : null}
    </CardContent>
  </Card>;
}
