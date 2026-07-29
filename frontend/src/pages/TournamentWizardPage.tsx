import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Map as MapIcon,
  Plus,
  Rocket,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  Trophy
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import { Input, Label, Select } from "../components/ui/Form";
import { PageHeader } from "../components/ui/PageHeader";
import { ImageUploadField } from "../components/ui/ImageUploadField";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/useToast";
import {
  createTournament,
  getAdminCompetitionGames,
  getGameMaps,
  updateTournamentCompetition
  ,configureMixTournament
} from "../services/api";
import type { AdminCompetitionGame, GameMap, VetoStep } from "../types/api";
import { cn } from "../utils/cn";

const schema = z.object({
  nome: z.string().trim().min(3, "Informe o nome do torneio."),
  game: z.string().min(1, "Selecione o jogo."),
  descricao: z.string().trim().min(10, "Descreva a proposta do torneio."),
  inicio: z.string().min(1, "Informe o inicio."),
  fim: z.string().min(1, "Informe o encerramento."),
  valor: z.coerce.number().min(0),
  tournament_mode: z.enum(["team","mix"]),
  payment_mode: z.enum(["free","paid"]),
  max_teams: z.coerce.number().int().min(2),
  titulares: z.coerce.number().int().min(1),
  reservas: z.coerce.number().int().min(0),
  registration_approval: z.enum(["automatic", "manual"]),
  formato: z.enum(["single_elimination", "double_elimination", "swiss", "round_robin", "group_playoffs", "league", "custom", "mix_single_elimination"]),
  best_of: z.enum(["bo1", "bo3", "bo5"]),
  seed_mode: z.enum(["automatic", "manual"]),
  overtime_enabled: z.boolean(),
  initial_side: z.string().min(1),
  pause_minutes: z.coerce.number().int().min(0),
  walkover_minutes: z.coerce.number().int().min(0),
  tiebreakers: z.string().trim().min(3),
  pick_ban_enabled: z.boolean(),
  auto_decider: z.boolean(),
  premiacao: z.string().trim().min(1, "Informe a premiacao."),
  banner: z.string().trim().optional()
}).refine((data) => new Date(data.inicio) < new Date(data.fim), {
  path: ["fim"],
  message: "O fim deve ser posterior ao inicio."
}).refine((data) => data.payment_mode === "free" || data.valor > 0, { path:["valor"], message:"Informe o valor da inscricao." });

type WizardFormInput = z.input<typeof schema>;
type WizardForm = z.output<typeof schema>;

const steps = [
  { title: "Informacoes", description: "Identidade e jogo" },
  { title: "Datas", description: "Periodo da competicao" },
  { title: "Inscricoes", description: "Vagas, lineup e pagamento" },
  { title: "Formato", description: "Estrutura e series" },
  { title: "Regras", description: "Operacao da partida" },
  { title: "Map Pool", description: "Mapas e ordem de veto" },
  { title: "Premiacao", description: "Premios e apresentacao" },
  { title: "Resumo", description: "Revisao completa" },
  { title: "Publicacao", description: "Criar na plataforma" }
];

const stepFields: Array<Array<keyof WizardForm>> = [
  ["nome", "game", "descricao"],
  ["inicio", "fim"],
  ["tournament_mode", "payment_mode", "valor", "max_teams", "titulares", "reservas", "registration_approval"],
  ["formato", "best_of", "seed_mode"],
  ["initial_side", "pause_minutes", "walkover_minutes", "tiebreakers"],
  ["pick_ban_enabled", "auto_decider"],
  ["premiacao", "banner"],
  [],
  []
];

const DRAFT_KEY = "arena-camp:tournament-draft:v2";

const initialValues: WizardForm = {
  nome: "",
  game: "",
  descricao: "",
  inicio: "",
  fim: "",
  valor: 0,
  tournament_mode: "team",
  payment_mode: "free",
  max_teams: 16,
  titulares: 5,
  reservas: 1,
  registration_approval: "manual",
  formato: "single_elimination",
  best_of: "bo3",
  seed_mode: "automatic",
  overtime_enabled: true,
  initial_side: "knife",
  pause_minutes: 5,
  walkover_minutes: 15,
  tiebreakers: "Pontos, confronto direto, percentual de vitorias, saldo medio de rounds por mapa, rounds medios por mapa",
  pick_ban_enabled: true,
  auto_decider: true,
  premiacao: "",
  banner: ""
};

export function TournamentWizardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedGameId = searchParams.get("game");
  const { user } = useAuth();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [games, setGames] = useState<AdminCompetitionGame[]>([]);
  const [maps, setMaps] = useState<GameMap[]>([]);
  const [selectedMapIds, setSelectedMapIds] = useState<number[]>([]);
  const [vetoOrder, setVetoOrder] = useState<VetoStep[]>([]);
  const [vetoTouched, setVetoTouched] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [furthestStep, setFurthestStep] = useState(0);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const {
    register,
    watch,
    reset,
    getValues,
    setValue,
    trigger,
    handleSubmit,
    formState: { errors }
  } = useForm<WizardFormInput, unknown, WizardForm>({ resolver: zodResolver(schema), defaultValues: initialValues });

  const values = watch() as WizardForm;
  const selectedGame = games.find((game) => String(game.id) === values.game) ?? null;
  const requiredMaps = Number(values.best_of.replace("bo", ""));
  const isMix = values.tournament_mode === "mix";

  useEffect(() => {
    if (!isMix) return;
    setValue("formato", "mix_single_elimination"); setValue("best_of", "bo1"); setValue("pick_ban_enabled", false); setValue("auto_decider", true); setValue("reservas", 0); setValue("registration_approval", "automatic");
  }, [isMix,setValue]);

  useEffect(() => { if(values.payment_mode === "free") setValue("valor",0); },[values.payment_mode,setValue]);

  useEffect(() => {
    async function initializeWizard() {
      const loadedGames = await loadGames();
      const saved = window.localStorage.getItem(DRAFT_KEY);
      if (!saved) {
        if (requestedGameId && loadedGames.some((game) => String(game.id) === requestedGameId)) {
          reset({ ...initialValues, game: requestedGameId });
        }
        return;
      }

      try {
        const parsed = JSON.parse(saved) as { data: WizardForm; mapIds: number[]; vetoOrder: VetoStep[]; savedAt: string };
        reset(parsed.data);
        setSelectedMapIds(parsed.mapIds ?? []);
        setVetoOrder(parsed.vetoOrder ?? []);
        setVetoTouched(Boolean(parsed.vetoOrder?.length));
        setLastSavedAt(parsed.savedAt);
      } catch {
        window.localStorage.removeItem(DRAFT_KEY);
      }
    }

    void initializeWizard();
  }, [requestedGameId, reset]);

  useEffect(() => {
    if (!values.game) {
      setMaps([]);
      return;
    }
    void loadMaps(Number(values.game));
  }, [values.game]);

  useEffect(() => {
    if (!vetoTouched) setVetoOrder(buildDefaultVetoOrder(values.best_of, selectedMapIds.length));
  }, [values.best_of, selectedMapIds.length, vetoTouched]);

  async function loadGames(): Promise<AdminCompetitionGame[]> {
    try {
      const activeGames = (await getAdminCompetitionGames()).filter((game) => Boolean(game.ativo));
      setGames(activeGames);
      return activeGames;
    } catch (error) {
      toast.error("Falha ao carregar jogos", messageOf(error));
      return [];
    }
  }

  async function loadMaps(gameId: number) {
    try {
      const data = await getGameMaps(gameId, false);
      setMaps(data);
      setSelectedMapIds((current) => current.filter((id) => data.some((map) => map.id === id)));
    } catch (error) {
      toast.error("Falha ao carregar mapas", messageOf(error));
    }
  }

  async function nextStep() {
    const valid = await trigger(stepFields[step]);
    if (!valid) {
      toast.warning("Revise esta etapa", "Corrija os campos indicados antes de continuar.");
      return;
    }
    if (step === 5 && values.pick_ban_enabled) {
      if (selectedMapIds.length < requiredMaps) {
        toast.warning("Map pool incompleto", `Uma serie ${values.best_of.toUpperCase()} exige ao menos ${requiredMaps} mapas.`);
        return;
      }
      const selectedActions = vetoOrder.filter((item) => item.action !== "ban").length;
      const completedOrder = completeAutomaticVetoOrder(vetoOrder, values.best_of, values.auto_decider);
      if (selectedActions > requiredMaps || (!values.auto_decider && selectedActions !== requiredMaps)) {
        toast.warning("Ordem de veto invalida", `A sequencia precisa selecionar exatamente ${requiredMaps} mapas.`);
        return;
      }
      if (completedOrder.length > selectedMapIds.length) {
        toast.warning("Ordem de veto invalida", "Nao restam mapas suficientes para completar a serie automaticamente.");
        return;
      }
      if (completedOrder.length !== vetoOrder.length) setVetoOrder(completedOrder);
    }
    if (step === 5 && isMix && selectedMapIds.length < 1) { toast.warning("Map pool vazio", "O Mix precisa de ao menos um mapa para o sorteio automatico."); return; }
    const next = Math.min(steps.length - 1, step + 1);
    setPublishError(null);
    setFurthestStep((current) => Math.max(current, next));
    setStep(next);
  }

  function saveDraft() {
    const data = getValues();
    const savedAt = new Date().toISOString();
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ data, mapIds: selectedMapIds, vetoOrder, savedAt }));
    setLastSavedAt(savedAt);
    toast.success("Rascunho salvo", "Campos, map pool e veto foram salvos neste navegador.");
  }

  function clearDraft() {
    window.localStorage.removeItem(DRAFT_KEY);
    reset({
      ...initialValues,
      game: requestedGameId && /^\d+$/.test(requestedGameId) ? requestedGameId : ""
    });
    setSelectedMapIds([]);
    setVetoOrder([]);
    setVetoTouched(false);
    setLastSavedAt(null);
    setFurthestStep(0);
    setPublishError(null);
    setStep(0);
  }

  function handleInvalidPublish(validationErrors: FieldErrors<WizardFormInput>) {
    const invalidField = Object.keys(validationErrors)[0] as keyof WizardFormInput | undefined;
    const invalidStep = invalidField
      ? stepFields.findIndex((fields) => fields.includes(invalidField as keyof WizardForm))
      : -1;
    const fieldError = invalidField ? validationErrors[invalidField] : undefined;
    const message = typeof fieldError?.message === "string"
      ? fieldError.message
      : "Existem campos obrigatorios ou invalidos em uma etapa anterior.";

    setPublishError(message);
    if (invalidStep >= 0) setStep(invalidStep);
    toast.warning("Nao foi possivel publicar", message);
  }

  async function publishTournament(data: WizardForm) {
    if (user?.role !== "admin") {
      toast.warning("Permissao necessaria", "Entre com uma conta de administrador para publicar.");
      return;
    }
    if (data.pick_ban_enabled && selectedMapIds.length < Number(data.best_of.replace("bo", ""))) {
      setStep(5);
      toast.warning("Map pool incompleto", "Revise os mapas antes de publicar.");
      return;
    }
    if(data.tournament_mode === "mix" && selectedMapIds.length < 1){setStep(5);toast.warning("Map pool vazio","Selecione ao menos um mapa para o Mix.");return;}

    const publishVetoOrder = data.pick_ban_enabled
      ? completeAutomaticVetoOrder(vetoOrder, data.best_of, data.auto_decider)
      : [];

    setPublishing(true);
    setPublishError(null);
    try {
      const tournament = await createTournament({
        nome: data.nome,
        descricao: data.descricao,
        game: data.game,
        valor: data.valor,
        max_teams: data.max_teams,
        titulares: data.titulares,
        reservas: data.reservas,
        premiacao: data.premiacao,
        banner: data.banner || null,
        inicio: toApiDate(data.inicio),
        fim: toApiDate(data.fim)
      });

      await updateTournamentCompetition(tournament.id, {
        game_id: Number(data.game),
        format: data.formato,
        best_of: data.best_of,
        pick_ban_enabled: data.pick_ban_enabled,
        veto_order: publishVetoOrder,
        auto_decider: data.auto_decider,
        overtime_enabled: data.overtime_enabled,
        initial_side: data.initial_side,
        pause_minutes: data.pause_minutes,
        walkover_minutes: data.walkover_minutes,
        tiebreakers: data.tiebreakers,
        seed_mode: data.seed_mode,
        registration_approval: data.registration_approval,
        map_ids: selectedMapIds
      });

      if (data.tournament_mode === "mix") await configureMixTournament(tournament.id, { payment_mode:data.payment_mode, price_per_player:data.valor, team_count:data.max_teams, players_per_team:data.titulares });

      window.localStorage.removeItem(DRAFT_KEY);
      toast.success("Torneio publicado", `${tournament.nome} foi criado com regulamento e map pool.`);
      navigate(data.tournament_mode === "mix" ? `/admin/mix/${tournament.id}` : `/admin?module=competitions&game=${data.game}`);
    } catch (error) {
      const message = messageOf(error);
      setPublishError(message);
      toast.error("Falha ao publicar", message);
    } finally {
      setPublishing(false);
    }
  }

  const previewItems = useMemo(() => [
    ["Jogo", selectedGame?.nome ?? "Nao selecionado"],
    ["Modalidade", isMix ? "Mix Individual" : "Equipes"],
    ["Formato", formatLabel(values.formato)],
    ["Serie", values.best_of.toUpperCase()],
    ["Equipes", String(values.max_teams)],
    [isMix ? "Jogadores por equipe" : "Lineup", isMix ? String(values.titulares) : `${values.titulares} titulares + ${values.reservas} reservas`],
    ["Inscricao", values.payment_mode === "free" ? "Gratuita" : `R$ ${Number(values.valor).toFixed(2).replace(".",",")} por jogador`],
    ["Map pool", `${selectedMapIds.length} mapas`],
    ["Pick & Ban", values.pick_ban_enabled ? `${vetoOrder.length} etapas` : "Desativado"]
  ], [selectedGame, selectedMapIds.length, values, vetoOrder.length,isMix]);

  return (
    <section className="px-4 pb-12 lg:px-8">
      <PageHeader eyebrow="Competicoes" title="Criar torneio" description="Configure cada regra antes da publicacao. Nenhum formato ou mapa e fixo no sistema." />
      <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        <Card className="self-start xl:sticky xl:top-20">
          <CardContent className="p-3">
            {steps.map((item, index) => (
              <button className={cn("flex w-full items-center gap-3 border-l-2 px-3 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-40", index === step ? "border-cyan-300 bg-cyan-400/10 text-white" : index < furthestStep ? "border-green-400/50 text-arena-text" : "border-transparent text-arena-muted hover:bg-white/[.04]")} disabled={index > furthestStep} key={item.title} onClick={() => { setPublishError(null); setStep(index); }} type="button">
                <span className={cn("flex h-7 w-7 items-center justify-center border text-xs font-bold", index < furthestStep ? "border-green-400/40 bg-green-400/10 text-green-300" : "border-arena-line")}>{index < furthestStep ? <Check className="h-4 w-4" /> : index + 1}</span>
                <span><span className="block text-sm font-semibold">{item.title}</span><span className="block text-xs text-arena-muted">{item.description}</span></span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><p className="text-xs font-semibold uppercase text-cyan-200">Etapa {step + 1} de {steps.length}</p><h2 className="mt-2 font-display text-xl font-semibold">{steps[step].title}</h2><p className="mt-1 text-sm text-arena-muted">{steps[step].description}</p></CardHeader>
          <CardContent className="min-h-[430px] space-y-5">
            {step === 0 ? <GeneralStep games={games} register={register} errors={errors} /> : null}
            {step === 1 ? <DatesStep register={register} errors={errors} /> : null}
            {step === 2 ? <RegistrationStep register={register} errors={errors} values={values} /> : null}
            {step === 3 ? <FormatStep disabled={isMix} register={register} /> : null}
            {step === 4 ? <RulesStep register={register} /> : null}
            {step === 5 ? <MapPoolStep autoDecider={values.auto_decider} bestOf={values.best_of} maps={maps} pickBanEnabled={values.pick_ban_enabled} register={register} selectedMapIds={selectedMapIds} vetoOrder={vetoOrder} onMapsChange={(ids) => { setSelectedMapIds(ids); if (!vetoTouched) setVetoOrder(buildDefaultVetoOrder(values.best_of, ids.length)); }} onVetoChange={(order) => { setVetoTouched(true); setVetoOrder(order); }} onResetVeto={() => { setVetoTouched(false); setVetoOrder(buildDefaultVetoOrder(values.best_of, selectedMapIds.length)); }} /> : null}
            {step === 6 ? <PrizeStep register={register} errors={errors} banner={values.banner} onBanner={(url)=>setValue("banner", url, { shouldDirty:true })} /> : null}
            {step === 7 ? <ReviewStep items={previewItems} maps={maps.filter((map) => selectedMapIds.includes(map.id))} values={values} /> : null}
            {step === 8 ? <PublishStep error={publishError} mapCount={selectedMapIds.length} tournamentName={values.nome} userRole={user?.role ?? null} /> : null}
          </CardContent>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-arena-line p-5">
            <div className="flex gap-2"><Button disabled={step === 0} icon={<ArrowLeft className="h-4 w-4" />} variant="secondary" onClick={() => { setPublishError(null); setStep((current) => Math.max(0, current - 1)); }}>Voltar</Button><Button icon={<Save className="h-4 w-4" />} variant="ghost" onClick={saveDraft}>Salvar rascunho</Button></div>
            {step < steps.length - 1 ? <Button icon={<ArrowRight className="h-4 w-4" />} onClick={() => void nextStep()}>Continuar</Button> : <Button loading={publishing} icon={<Rocket className="h-4 w-4" />} onClick={handleSubmit(publishTournament, handleInvalidPublish)}>Publicar torneio</Button>}
          </div>
        </Card>

        <Card className="self-start xl:sticky xl:top-20">
          <CardHeader><h2 className="font-display text-lg font-semibold">Resumo ao vivo</h2></CardHeader>
          <CardContent className="space-y-4">
            <div className="border border-cyan-400/25 bg-cyan-400/10 p-4"><Trophy className="h-7 w-7 text-cyan-200" /><h3 className="mt-4 font-display text-xl font-bold">{values.nome || "Novo torneio"}</h3><p className="mt-2 text-sm text-arena-muted">{values.descricao || "A descricao aparecera aqui."}</p></div>
            <div className="divide-y divide-arena-line border-y border-arena-line">{previewItems.map(([label, value]) => <div className="flex justify-between gap-4 py-3 text-sm" key={label}><span className="text-arena-muted">{label}</span><span className="text-right font-semibold">{value}</span></div>)}</div>
            {lastSavedAt ? <p className="text-xs text-arena-muted">Rascunho salvo em {new Date(lastSavedAt).toLocaleString("pt-BR")}</p> : null}
            <Button className="w-full" icon={<RotateCcw className="h-4 w-4" />} variant="ghost" onClick={clearDraft}>Limpar configuracao</Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

type Register = UseFormRegister<WizardFormInput>;
type Errors = FieldErrors<WizardFormInput>;

function GeneralStep({ games, register, errors }: { games: AdminCompetitionGame[]; register: Register; errors: Errors }) { return <div className="grid gap-4 md:grid-cols-2"><Field label="Nome do torneio" error={errors.nome?.message}><Input placeholder="Ex.: Arena Camp Masters" {...register("nome")} /></Field><Field label="Jogo" error={errors.game?.message}><Select {...register("game")}><option value="">Selecione o jogo</option>{games.map((game) => <option key={game.id} value={game.id}>{game.nome} ({game.active_maps_count} mapas)</option>)}</Select></Field><div className="md:col-span-2"><Field label="Descricao" error={errors.descricao?.message}><textarea className="min-h-32 w-full resize-y rounded-arena border border-arena-line bg-black/25 p-3 text-sm text-arena-text focus:border-arena-cyan" placeholder="Apresente a competicao, publico e objetivo." {...register("descricao")} /></Field></div></div>; }
function DatesStep({ register, errors }: { register: Register; errors: Errors }) { return <div className="grid gap-4 md:grid-cols-2"><Field label="Inicio" error={errors.inicio?.message}><Input type="datetime-local" {...register("inicio")} /></Field><Field label="Encerramento" error={errors.fim?.message}><Input type="datetime-local" {...register("fim")} /></Field></div>; }
function RegistrationStep({ register, errors, values }: { register: Register; errors: Errors; values:WizardForm }) { const mix=values.tournament_mode==="mix";return <div className="grid gap-4 md:grid-cols-2"><Field label="Tipo de torneio"><Select {...register("tournament_mode")}><option value="team">Inscricao por equipes</option><option value="mix">Mix Individual - equipes sorteadas</option></Select></Field><Field label="Modelo de inscricao"><Select {...register("payment_mode")}><option value="free">Gratuita</option><option value="paid">Paga</option></Select></Field>{values.payment_mode==="paid"?<Field label={mix?"Valor por jogador":"Valor da inscricao"} error={errors.valor?.message}><Input min="0.01" step="0.01" type="number" {...register("valor")} /></Field>:null}<Field label={mix?"Quantidade de equipes":"Maximo de equipes"} error={errors.max_teams?.message}>{mix?<Select {...register("max_teams")}><option value="2">2 equipes</option><option value="4">4 equipes</option><option value="8">8 equipes</option><option value="16">16 equipes</option></Select>:<Input min="2" type="number" {...register("max_teams")} />}</Field><Field label={mix?"Jogadores por equipe":"Titulares"} error={errors.titulares?.message}><Input min="1" max={mix?10:undefined} type="number" {...register("titulares")} /></Field>{!mix?<Field label="Reservas" error={errors.reservas?.message}><Input min="0" type="number" {...register("reservas")} /></Field>:null}{!mix?<Field label="Aprovacao"><Select {...register("registration_approval")}><option value="manual">Manual pelo administrador</option><option value="automatic">Automatica</option></Select></Field>:<div className="border border-cyan-400/30 bg-cyan-400/10 p-4 text-sm text-cyan-100"><strong>{Number(values.max_teams)*Number(values.titulares)} vagas individuais.</strong><p className="mt-1 text-arena-muted">MD1, eliminacao simples, mapa e equipes sorteados automaticamente.</p></div>}</div>; }
function FormatStep({ register, disabled=false }: { register: Register; disabled?:boolean }) { return <div className="grid gap-4 md:grid-cols-2"><Field label="Formato"><Select disabled={disabled} {...register("formato")}><option value="mix_single_elimination">Mix Individual</option><option value="single_elimination">Eliminacao simples</option><option value="double_elimination">Eliminacao dupla</option><option value="swiss">Sistema suico</option><option value="round_robin">Todos contra todos</option><option value="group_playoffs">Fase de grupos + eliminatorias</option><option value="league">Liga</option><option value="custom">Personalizado</option></Select></Field><Field label="Serie"><Select disabled={disabled} {...register("best_of")}><option value="bo1">MD1</option><option value="bo3">MD3</option><option value="bo5">MD5</option></Select></Field><Field label="Seed"><Select disabled={disabled} {...register("seed_mode")}><option value="automatic">Automatico</option><option value="manual">Manual</option></Select></Field>{disabled?<p className="text-sm text-arena-muted md:col-span-2">No Mix, formato, serie, mapa e seed sao controlados automaticamente.</p>:null}</div>; }
function RulesStep({ register }: { register: Register }) { return <div className="grid gap-4 md:grid-cols-2"><Field label="Side inicial"><Select {...register("initial_side")}><option value="knife">Knife round</option><option value="random">Sorteio</option><option value="higher_seed">Melhor seed</option><option value="home_team">Equipe A</option></Select></Field><Field label="Tempo de pausa (min)"><Input min="0" type="number" {...register("pause_minutes")} /></Field><Field label="Tempo para W.O. (min)"><Input min="0" type="number" {...register("walkover_minutes")} /></Field><Field label="Criterios oficiais de desempate"><Input readOnly {...register("tiebreakers")} /><p className="mt-1 text-xs text-arena-muted">Protegidos pelo motor; mapas nao disputados nao contam.</p></Field><label className="flex items-center gap-3 text-sm font-semibold"><input className="h-4 w-4 accent-cyan-400" type="checkbox" {...register("overtime_enabled")} />Overtime permitido</label></div>; }

function MapPoolStep({ maps, selectedMapIds, vetoOrder, pickBanEnabled, autoDecider, bestOf, register, onMapsChange, onVetoChange, onResetVeto }: { maps: GameMap[]; selectedMapIds: number[]; vetoOrder: VetoStep[]; pickBanEnabled: boolean; autoDecider: boolean; bestOf: WizardForm["best_of"]; register: Register; onMapsChange: (ids: number[]) => void; onVetoChange: (order: VetoStep[]) => void; onResetVeto: () => void }) {
  function move(index: number, direction: -1 | 1) { const next = [...vetoOrder]; const target = index + direction; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; onVetoChange(next); }
  return <div className="space-y-6"><div className="flex flex-wrap gap-6"><label className="flex items-center gap-3 text-sm font-semibold"><input className="h-4 w-4 accent-cyan-400" type="checkbox" {...register("pick_ban_enabled")} />Ativar Pick & Ban</label><label className="flex items-center gap-3 text-sm font-semibold"><input className="h-4 w-4 accent-cyan-400" type="checkbox" {...register("auto_decider")} />Decider automatico</label></div><div><div className="mb-3 flex items-center justify-between"><div><h3 className="font-semibold">Mapas permitidos</h3><p className="text-sm text-arena-muted">{selectedMapIds.length} selecionados para {bestOf.toUpperCase()}</p></div><Badge tone={selectedMapIds.length >= Number(bestOf.replace("bo", "")) ? "success" : "warning"}>{selectedMapIds.length} mapas</Badge></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{maps.map((map) => { const checked = selectedMapIds.includes(map.id); return <label className={cn("flex cursor-pointer items-center gap-3 border p-3", checked ? "border-cyan-400/50 bg-cyan-400/10" : "border-arena-line bg-black/20")} key={map.id}><input checked={checked} className="h-4 w-4 accent-cyan-400" onChange={() => onMapsChange(checked ? selectedMapIds.filter((id) => id !== map.id) : [...selectedMapIds, map.id])} type="checkbox" /><MapIcon className="h-4 w-4 text-cyan-200" /><span><span className="block text-sm font-semibold">{map.nome}</span><span className="text-xs text-arena-muted">#{map.id}</span></span></label>; })}</div>{!maps.length ? <div className="border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">Este jogo ainda nao possui mapas. Cadastre-os em Admin → Operacoes → Jogos e mapas.</div> : null}</div>{pickBanEnabled ? <div><div className="mb-3 flex items-center justify-between"><div><h3 className="font-semibold">Sequencia do veto</h3><p className="text-sm text-arena-muted">{autoDecider ? "O ultimo mapa restante sera o decider." : "O decider sera escolhido manualmente."}</p></div><Button className="h-9" icon={<RotateCcw className="h-4 w-4" />} variant="secondary" onClick={onResetVeto}>Gerar padrao</Button></div><div className="space-y-2">{vetoOrder.map((item, index) => <div className="grid items-center gap-2 border border-arena-line bg-black/20 p-2 sm:grid-cols-[36px_1fr_1fr_auto]" key={`${index}-${item.action}-${item.team}`}><span className="text-center font-bold text-arena-muted">{index + 1}</span><Select value={item.action} onChange={(event) => { const next = [...vetoOrder]; next[index] = { action: event.target.value as VetoStep["action"], team: event.target.value === "decider" ? "SYSTEM" : item.team === "SYSTEM" ? "A" : item.team }; onVetoChange(next); }}><option value="ban">Ban</option><option value="pick">Pick</option><option value="decider">Decider</option></Select><Select disabled={item.action === "decider"} value={item.team} onChange={(event) => { const next = [...vetoOrder]; next[index] = { ...item, team: event.target.value as VetoStep["team"] }; onVetoChange(next); }}><option value="A">Equipe A</option><option value="B">Equipe B</option><option value="SYSTEM">Sistema</option></Select><div className="flex"><IconButton label="Subir" onClick={() => move(index, -1)}><ChevronUp className="h-4 w-4" /></IconButton><IconButton label="Descer" onClick={() => move(index, 1)}><ChevronDown className="h-4 w-4" /></IconButton><IconButton label="Remover" onClick={() => onVetoChange(vetoOrder.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-4 w-4" /></IconButton></div></div>)}</div><div className="mt-3 flex gap-2"><Button className="h-9" icon={<Plus className="h-4 w-4" />} variant="secondary" onClick={() => onVetoChange([...vetoOrder, { action: "ban", team: "A" }])}>Ban</Button><Button className="h-9" icon={<Plus className="h-4 w-4" />} variant="secondary" onClick={() => onVetoChange([...vetoOrder, { action: "pick", team: "A" }])}>Pick</Button><Button className="h-9" icon={<Plus className="h-4 w-4" />} variant="secondary" onClick={() => onVetoChange([...vetoOrder, { action: "decider", team: "SYSTEM" }])}>Decider</Button></div></div> : null}</div>;
}

function PrizeStep({ register, errors, banner, onBanner }: { register:Register; errors:Errors; banner?:string; onBanner:(url:string)=>void }) { return <div className="grid gap-4 md:grid-cols-2"><Field label="Premiacao" error={errors.premiacao?.message}><Input placeholder="Ex.: R$ 5.000 + trofeu" {...register("premiacao")} /></Field><Field label="Banner do torneio"><Input placeholder="URL ou envie uma imagem abaixo" {...register("banner")} /><div className="mt-2"><ImageUploadField value={banner} onChange={onBanner} label="Enviar banner" /></div></Field></div>; }
function ReviewStep({ items, maps, values }: { items: string[][]; maps: GameMap[]; values: WizardForm }) { return <div className="space-y-5"><div className="grid gap-3 md:grid-cols-2">{items.map(([label, value]) => <div className="border border-arena-line bg-black/20 p-4" key={label}><p className="text-xs uppercase text-arena-muted">{label}</p><p className="mt-2 font-semibold">{value}</p></div>)}</div><div><p className="mb-2 text-xs font-semibold uppercase text-arena-muted">Map pool</p><div className="flex flex-wrap gap-2">{maps.map((map) => <Badge key={map.id} tone="info">{map.nome}</Badge>)}</div></div><div className="border border-arena-line p-4"><p className="font-semibold">{values.premiacao || "Premiacao pendente"}</p><p className="mt-2 text-sm text-arena-muted">{new Date(values.inicio || Date.now()).toLocaleString("pt-BR")} ate {new Date(values.fim || Date.now()).toLocaleString("pt-BR")}</p></div></div>; }
function PublishStep({ tournamentName, mapCount, userRole, error }: { tournamentName: string; mapCount: number; userRole: string | null; error: string | null }) { return <div className="mx-auto max-w-xl py-8 text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center border border-cyan-400/30 bg-cyan-400/10"><Rocket className="h-7 w-7 text-cyan-200" /></div><h3 className="mt-5 font-display text-2xl font-bold">Pronto para publicar</h3><p className="mt-3 text-arena-muted">{tournamentName || "O torneio"} sera criado com {mapCount} mapas e todas as regras desta configuracao.</p><div className="mt-6 flex justify-center gap-3"><Badge tone={userRole === "admin" ? "success" : "warning"}>{userRole === "admin" ? "Admin autenticado" : "Login admin necessario"}</Badge><Badge tone="info"><ShieldCheck className="mr-1 h-3 w-3" />Competition Engine</Badge></div>{error ? <div className="mt-6 flex items-start gap-3 border border-red-500/35 bg-red-500/10 p-3 text-left text-sm text-red-100"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="font-semibold">A publicacao nao foi concluida</p><p className="mt-1 opacity-85">{error}</p></div></div> : null}</div>; }

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}{error ? <p className="text-xs text-red-300">{error}</p> : null}</div>; }
function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) { return <button aria-label={label} className="flex h-9 w-9 items-center justify-center text-arena-muted hover:bg-white/[.07] hover:text-white" onClick={onClick} title={label} type="button">{children}</button>; }

function buildDefaultVetoOrder(bestOf: WizardForm["best_of"], mapCount: number): VetoStep[] { if (mapCount <= 0) return []; const seriesMaps = Math.min(Number(bestOf.replace("bo", "")), Math.max(1, mapCount)); const totalBans = Math.max(0, mapCount - seriesMaps); const preBans = bestOf === "bo1" ? totalBans : Math.min(2, totalBans); const order: VetoStep[] = []; for (let index = 0; index < preBans; index += 1) order.push({ action: "ban", team: index % 2 === 0 ? "A" : "B" }); for (let index = 0; index < Math.max(0, seriesMaps - 1); index += 1) order.push({ action: "pick", team: index % 2 === 0 ? "A" : "B" }); for (let index = preBans; index < totalBans; index += 1) order.push({ action: "ban", team: index % 2 === 0 ? "A" : "B" }); order.push({ action: "decider", team: "SYSTEM" }); return order; }
function completeAutomaticVetoOrder(order: VetoStep[], bestOf: WizardForm["best_of"], autoDecider: boolean): VetoStep[] { if (!autoDecider) return order; const requiredMaps = Number(bestOf.replace("bo", "")); const selectedMaps = order.filter((item) => item.action !== "ban").length; const missingMaps = Math.max(0, requiredMaps - selectedMaps); return [...order, ...Array.from({ length: missingMaps }, (): VetoStep => ({ action: "decider", team: "SYSTEM" }))]; }
function formatLabel(value: WizardForm["formato"]) { return { mix_single_elimination:"Mix Individual",single_elimination: "Eliminacao simples", double_elimination: "Eliminacao dupla", swiss: "Sistema suico", round_robin: "Todos contra todos", group_playoffs: "Fase de grupos + eliminatorias", league: "Liga", custom: "Personalizado" }[value]; }
function toApiDate(value: string) { return new Date(value).toISOString().slice(0, 19).replace("T", " "); }
function messageOf(error: unknown) { return error instanceof Error ? error.message : "Tente novamente."; }
