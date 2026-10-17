import { Tv } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Form";
import { useToast } from "../../hooks/useToast";
import { updateTournamentStream } from "../../services/api";

// Canal principal da transmissao do torneio. As partidas podem ter link proprio na sala da partida.
export function TournamentStreamField({ tournamentId, initialUrl }: { tournamentId: number; initialUrl: string | null | undefined }) {
  const { success, error } = useToast();
  const [value, setValue] = useState(initialUrl ?? "");
  const [saving, setSaving] = useState(false);
  useEffect(() => setValue(initialUrl ?? ""), [tournamentId, initialUrl]);

  async function save() {
    setSaving(true);
    try {
      const result = await updateTournamentStream(tournamentId, value.trim() || null);
      setValue(result.stream_url ?? "");
      success(result.stream_url ? "Transmissão salva" : "Transmissão removida", result.stream_url ? "O vídeo aparece na página do torneio enquanto ele estiver em andamento." : "A página do torneio não mostra mais o vídeo.");
    } catch (reason) {
      error("Link não aceito", reason instanceof Error ? reason.message : "Use um link da Twitch, YouTube ou Kick.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-arena-line bg-arena-panel2 p-4">
      <label className="text-sm font-semibold" htmlFor={`stream-${tournamentId}`}>Transmissão do torneio</label>
      <p className="mt-1 text-sm text-arena-muted">Canal oficial na Twitch, YouTube ou Kick. Uma partida pode usar outro link na sala da partida.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input id={`stream-${tournamentId}`} placeholder="twitch.tv/canal, youtube.com/watch?v=... ou kick.com/canal" value={value} onChange={(event) => setValue(event.target.value)} />
        <Button icon={<Tv className="h-4 w-4" />} loading={saving} onClick={() => void save()} variant="secondary">Salvar</Button>
      </div>
    </div>
  );
}
