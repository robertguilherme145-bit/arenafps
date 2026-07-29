import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { ExternalLink, PencilLine, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input, Label, Select } from "../../components/ui/Form";
import { ImageUploadField } from "../../components/ui/ImageUploadField";
import { useToast } from "../../hooks/useToast";
import {
  deleteAdminOfficialMatch,
  deleteAdminOfficialTournament,
  getAdminOfficialTournament,
  getAdminOfficialTournaments,
  saveAdminOfficialMatch,
  saveAdminOfficialTournament,
} from "../../services/api";
import type { OfficialMatch, OfficialTournament } from "../../types/api";

const emptyEvent = { name: "", organizer: "", game_name: "", logo_url: "", banner_url: "", description: "", location: "", prize_pool: "", format_label: "", official_url: "", starts_at: "", ends_at: "", status: "anunciado", featured: false, published: true };
const emptyMatch = { stage_label: "", team_a: "", team_a_logo: "", team_b: "", team_b_logo: "", score_a: "", score_b: "", best_of: "bo3", map_summary: "", scheduled_at: "", status: "agendada", stream_url: "" };

export function OfficialTournamentsWorkspace() {
  const toast = useToast();
  const [events, setEvents] = useState<OfficialTournament[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [eventForm, setEventForm] = useState(emptyEvent);
  const [matchForm, setMatchForm] = useState(emptyMatch);
  const [editingMatchId, setEditingMatchId] = useState<number | null>(null);
  const [matches, setMatches] = useState<OfficialMatch[]>([]);
  const [busy, setBusy] = useState(false);

  async function reload(selectId = selectedId) {
    const list = await getAdminOfficialTournaments();
    setEvents(list);
    if (selectId) {
      const detail = await getAdminOfficialTournament(selectId);
      setMatches(detail.matches || []);
    }
  }
  useEffect(() => { void reload(null); }, []);

  async function selectEvent(item: OfficialTournament) {
    const detail = await getAdminOfficialTournament(item.id);
    setSelectedId(item.id);
    setEventForm({
      name: detail.name, organizer: detail.organizer, game_name: detail.game_name,
      logo_url: detail.logo_url || "", banner_url: detail.banner_url || "", description: detail.description || "",
      location: detail.location || "", prize_pool: detail.prize_pool || "", format_label: detail.format_label || "",
      official_url: detail.official_url || "", starts_at: localDate(detail.starts_at), ends_at: localDate(detail.ends_at),
      status: detail.status, featured: detail.featured, published: detail.published,
    });
    setMatches(detail.matches || []);
    setEditingMatchId(null);
    setMatchForm(emptyMatch);
  }
  function newEvent() { setSelectedId(null); setEventForm(emptyEvent); setMatches([]); setEditingMatchId(null); setMatchForm(emptyMatch); }

  async function saveEvent() {
    setBusy(true);
    try {
      const saved = await saveAdminOfficialTournament(selectedId, eventForm);
      setSelectedId(saved.id);
      await reload(saved.id);
      toast.success("Campeonato salvo", eventForm.published ? "O evento está disponivel no portal público." : "O evento ficou como rascunho.");
    } catch (error) { toast.error("Falha ao salvar campeonato", message(error)); }
    finally { setBusy(false); }
  }
  async function removeEvent() {
    if (!selectedId || !window.confirm("Excluir este campeonato oficial e todas as partidas cadastradas?")) return;
    setBusy(true);
    try { await deleteAdminOfficialTournament(selectedId); newEvent(); await reload(null); toast.success("Campeonato excluido", "O evento saiu do portal."); }
    catch (error) { toast.error("Falha ao excluir", message(error)); }
    finally { setBusy(false); }
  }
  function editMatch(item: OfficialMatch) {
    setEditingMatchId(item.id);
    setMatchForm({ stage_label: item.stage_label || "", team_a: item.team_a, team_a_logo: item.team_a_logo || "", team_b: item.team_b, team_b_logo: item.team_b_logo || "", score_a: item.score_a === null ? "" : String(item.score_a), score_b: item.score_b === null ? "" : String(item.score_b), best_of: item.best_of, map_summary: item.map_summary || "", scheduled_at: localDate(item.scheduled_at), status: item.status, stream_url: item.stream_url || "" });
  }
  async function saveMatch() {
    if (!selectedId) return;
    setBusy(true);
    try { await saveAdminOfficialMatch(selectedId, editingMatchId, matchForm); setEditingMatchId(null); setMatchForm(emptyMatch); await reload(selectedId); toast.success("Partida salva", "Placar e vencedor foram atualizados no portal."); }
    catch (error) { toast.error("Falha ao salvar partida", message(error)); }
    finally { setBusy(false); }
  }
  async function removeMatch(id: number) {
    if (!selectedId || !window.confirm("Excluir está partida do evento?")) return;
    try { await deleteAdminOfficialMatch(selectedId, id); await reload(selectedId); toast.success("Partida excluida", "A grade pública foi atualizada."); }
    catch (error) { toast.error("Falha ao excluir partida", message(error)); }
  }

  return <div className="mt-6 space-y-5">
    <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div><h2 className="font-display text-xl font-semibold">Circuito oficial</h2><p className="mt-1 text-sm text-arena-muted">BLAST, IEM e outros eventos externos.</p></div>
          <Button className="px-3" icon={<Plus className="h-4 w-4" />} onClick={newEvent}>Novo</Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {events.length ? events.map((item) => <button key={item.id} onClick={() => void selectEvent(item)} className={`w-full border p-3 text-left transition ${selectedId === item.id ? "border-cyan-400 bg-cyan-400/10" : "border-arena-line hover:bg-white/[.04]"}`}>
            <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{item.name}</p><p className="mt-1 text-xs text-arena-muted">{item.organizer} · {item.game_name}</p></div><span className="text-xs text-arena-muted">{item.matches_count || 0} partidas</span></div>
            <p className="mt-2 text-xs uppercase text-cyan-200">{statusLabel(item.status)}{item.published ? " · publicado" : " · rascunho"}</p>
          </button>) : <EmptyState title="Nenhum evento oficial" description="Cadastre o primeiro campeonato externo para o público acompanhar." />}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><h2 className="font-display text-xl font-semibold">{selectedId ? "Editar campeonato" : "Novo campeonato oficial"}</h2><p className="mt-1 text-sm text-arena-muted">Este cadastro e informativo e não aceita inscrições ou pagamentos.</p></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">{field("Nome", "name", eventForm, setEventForm)}{field("Organizadora", "organizer", eventForm, setEventForm)}{field("Jogo", "game_name", eventForm, setEventForm)}</div>
          <div className="grid gap-4 md:grid-cols-2"><div><Label>Logo</Label><div className="mt-2"><ImageUploadField label="Enviar logo" value={eventForm.logo_url} onChange={(logo_url) => setEventForm((state) => ({ ...state, logo_url }))} /></div></div><div><Label>Banner público</Label><div className="mt-2"><ImageUploadField label="Enviar banner" value={eventForm.banner_url} onChange={(banner_url) => setEventForm((state) => ({ ...state, banner_url }))} /></div></div></div>
          <div><Label>Descrição</Label><textarea className="mt-2 min-h-24 w-full border border-arena-line bg-black/25 p-3 text-sm" value={eventForm.description} onChange={(event) => setEventForm((state) => ({ ...state, description: event.target.value }))} /></div>
          <div className="grid gap-4 md:grid-cols-4">{field("Local", "location", eventForm, setEventForm)}{field("Premiação", "prize_pool", eventForm, setEventForm)}{field("Formato", "format_label", eventForm, setEventForm)}{field("Site oficial", "official_url", eventForm, setEventForm, "url")}</div>
          <div className="grid gap-4 md:grid-cols-3"><div><Label>Inicio</Label><Input className="mt-2" type="datetime-local" value={eventForm.starts_at} onChange={(event) => setEventForm((state) => ({ ...state, starts_at: event.target.value }))} /></div><div><Label>Fim</Label><Input className="mt-2" type="datetime-local" value={eventForm.ends_at} onChange={(event) => setEventForm((state) => ({ ...state, ends_at: event.target.value }))} /></div><div><Label>Status</Label><Select className="mt-2" value={eventForm.status} onChange={(event) => setEventForm((state) => ({ ...state, status: event.target.value }))}><option value="anunciado">Anunciado</option><option value="em_andamento">Em andamento</option><option value="finalizado">Finalizado</option><option value="cancelado">Cancelado</option></Select></div></div>
          <div className="flex flex-wrap gap-5 border border-arena-line p-3 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={eventForm.featured} onChange={(event) => setEventForm((state) => ({ ...state, featured: event.target.checked }))} />Destacar no portal</label><label className="flex items-center gap-2"><input type="checkbox" checked={eventForm.published} onChange={(event) => setEventForm((state) => ({ ...state, published: event.target.checked }))} />Publicar para o público</label></div>
          <div className="flex flex-wrap gap-3"><Button loading={busy} icon={<Save className="h-4 w-4" />} onClick={() => void saveEvent()}>Salvar campeonato</Button>{selectedId ? <Button loading={busy} variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => void removeEvent()}>Excluir campeonato</Button> : null}</div>
        </CardContent>
      </Card>
    </div>
    {selectedId ? <Card><CardHeader><h2 className="font-display text-xl font-semibold">Partidas e resultados</h2><p className="mt-1 text-sm text-arena-muted">Cadastre agenda, transmissao e placares. O vencedor e calculado automaticamente.</p></CardHeader><CardContent className="space-y-5">
      <div className="grid gap-3 lg:grid-cols-4">{field("Fase", "stage_label", matchForm, setMatchForm)}{field("Equipe A", "team_a", matchForm, setMatchForm)}{field("Equipe B", "team_b", matchForm, setMatchForm)}<div><Label>Serie</Label><Select className="mt-2" value={matchForm.best_of} onChange={(event) => setMatchForm((state) => ({ ...state, best_of: event.target.value }))}><option value="bo1">MD1</option><option value="bo3">MD3</option><option value="bo5">MD5</option></Select></div></div>
      <div className="grid gap-3 lg:grid-cols-4"><div><Label>Placar A</Label><Input className="mt-2" min="0" type="number" value={matchForm.score_a} onChange={(event) => setMatchForm((state) => ({ ...state, score_a: event.target.value }))} /></div><div><Label>Placar B</Label><Input className="mt-2" min="0" type="number" value={matchForm.score_b} onChange={(event) => setMatchForm((state) => ({ ...state, score_b: event.target.value }))} /></div><div><Label>Horario</Label><Input className="mt-2" type="datetime-local" value={matchForm.scheduled_at} onChange={(event) => setMatchForm((state) => ({ ...state, scheduled_at: event.target.value }))} /></div><div><Label>Status</Label><Select className="mt-2" value={matchForm.status} onChange={(event) => setMatchForm((state) => ({ ...state, status: event.target.value }))}><option value="agendada">Agendada</option><option value="ao_vivo">Ao vivo</option><option value="finalizada">Finalizada</option><option value="cancelada">Cancelada</option></Select></div></div>
      <div className="grid gap-3 md:grid-cols-2">{field("Mapas / resumo", "map_summary", matchForm, setMatchForm)}{field("Link da transmissao", "stream_url", matchForm, setMatchForm, "url")}</div>
      <div className="flex gap-3"><Button loading={busy} icon={<Save className="h-4 w-4" />} onClick={() => void saveMatch()}>{editingMatchId ? "Atualizar partida" : "Adicionar partida"}</Button>{editingMatchId ? <Button variant="secondary" onClick={() => { setEditingMatchId(null); setMatchForm(emptyMatch); }}>Cancelar edicao</Button> : null}</div>
      <div className="space-y-2">{matches.length ? matches.map((item) => <div key={item.id} className="grid items-center gap-3 border border-arena-line p-3 md:grid-cols-[1fr_auto_auto]">
        <div><p className="font-semibold">{item.team_a} <span className="mx-2 text-cyan-200">{item.score_a ?? "-"} x {item.score_b ?? "-"}</span> {item.team_b}</p><p className="mt-1 text-xs text-arena-muted">{item.stage_label || "Fase não informada"} · {item.best_of.toUpperCase()} · {statusLabel(item.status)}{item.winner_name ? ` · Vencedor: ${item.winner_name}` : ""}</p></div>
        {item.stream_url ? <a className="inline-flex items-center gap-2 text-sm text-cyan-200" href={item.stream_url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />Transmissao</a> : <span />}
        <div className="flex gap-2"><Button className="px-3" variant="secondary" icon={<PencilLine className="h-4 w-4" />} onClick={() => editMatch(item)} aria-label="Editar partida" /><Button className="px-3" variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => void removeMatch(item.id)} aria-label="Excluir partida" /></div>
      </div>) : <EmptyState title="Nenhuma partida cadastrada" description="Adicione a agenda ou os resultados deste evento." />}</div>
    </CardContent></Card> : null}
  </div>;
}

function field<T extends Record<string, string | boolean>>(label: string, key: keyof T & string, form: T, setForm: Dispatch<SetStateAction<T>>, type = "text") {
  return <div><Label>{label}</Label><Input className="mt-2" type={type} value={String(form[key] || "")} onChange={(event) => setForm((state) => ({ ...state, [key]: event.target.value }))} /></div>;
}
function localDate(value?: string | null) { if (!value) return ""; const date = new Date(value); const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000); return shifted.toISOString().slice(0, 16); }
function statusLabel(value: string) { return ({ anunciado: "Anunciado", em_andamento: "Em andamento", finalizado: "Finalizado", cancelado: "Cancelado", agendada: "Agendada", ao_vivo: "Ao vivo", finalizada: "Finalizada" } as Record<string, string>)[value] || value; }
function message(error: unknown) { return error instanceof Error ? error.message : "Tente novamente."; }
