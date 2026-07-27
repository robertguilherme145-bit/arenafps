import { useEffect, useRef, useState } from "react";
import { AtSign, Check, ChevronLeft, ChevronRight, Gamepad2, KeyRound, LoaderCircle, LockKeyhole, LogIn, MailCheck, ShieldCheck, UserRound, Users } from "lucide-react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import { Input, Label } from "../components/ui/Form";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/useToast";
import { completeAccountOnboarding, completeOAuthAccountProfile, getAuthProviders, getGames, getOAuthStartUrl, requestAccountPasswordReset, resetAccountPassword, verifyAccountEmail } from "../services/api";
import type { AuthProviderStatus, Game, RegisterResponse } from "../types/api";

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, loginWithPassword } = useAuth();
  const { error } = useToast();
  const [form, setForm] = useState({ email:"", password:"", remember:true, two_factor_code:"" });
  const [twoFactor, setTwoFactor] = useState(false);
  const [busy, setBusy] = useState(false);
  const [providers, setProviders] = useState<AuthProviderStatus>({ password:true, google:false, discord:false, steam:false });
  const reportedOAuthError = useRef(false);
  const oauthError = params.get("oauth_error");
  useEffect(() => { void getAuthProviders().then(setProviders).catch(() => undefined); }, []);
  useEffect(() => { if (oauthError && !reportedOAuthError.current) { reportedOAuthError.current = true; error("Nao foi possivel entrar", oauthError); } }, [oauthError]);
  if (user) return <Navigate replace to={user.onboarding_completed ? roleHref(user.active_role) : "/onboarding"} />;

  async function submit() {
    setBusy(true);
    try {
      const required = await loginWithPassword({ email:form.email, password:form.password, two_factor_code:form.two_factor_code || undefined });
      if (required) setTwoFactor(true); else navigate("/onboarding");
    } catch (reason) { error("Nao foi possivel entrar", message(reason)); }
    finally { setBusy(false); }
  }

  return <AuthShell eyebrow="Conta Arena Camp" title="Bem-vindo de volta" description="Acesse sua carreira, equipe e competicoes com uma unica conta.">
    <div className="space-y-4">
      {!twoFactor ? <><Field label="Email"><Input autoComplete="email" type="email" value={form.email} onChange={(event) => setForm((state) => ({ ...state, email:event.target.value }))} /></Field><Field label="Senha"><Input autoComplete="current-password" type="password" value={form.password} onChange={(event) => setForm((state) => ({ ...state, password:event.target.value }))} /></Field><div className="flex items-center justify-between gap-3 text-sm"><label className="flex items-center gap-2 text-arena-muted"><input checked={form.remember} type="checkbox" onChange={(event) => setForm((state) => ({ ...state, remember:event.target.checked }))} />Lembrar-me</label><Link className="font-semibold text-cyan-200 hover:underline" to="/recuperar-senha">Esqueci minha senha</Link></div></> : <Field label="Codigo de autenticacao"><Input autoComplete="one-time-code" inputMode="numeric" maxLength={6} placeholder="000000" value={form.two_factor_code} onChange={(event) => setForm((state) => ({ ...state, two_factor_code:event.target.value.replace(/\D/g, "") }))} /></Field>}
      <Button className="w-full" disabled={!form.email || !form.password || (twoFactor && form.two_factor_code.length !== 6)} loading={busy} icon={<KeyRound className="h-4 w-4" />} onClick={() => void submit()}>Entrar</Button>
      <div className="flex items-center gap-3 py-2"><span className="h-px flex-1 bg-arena-line" /><span className="text-xs uppercase text-arena-muted">ou</span><span className="h-px flex-1 bg-arena-line" /></div>
      <div className="grid gap-2 sm:grid-cols-3">{(["google", "discord", "steam"] as const).map((provider) => <Button disabled={!providers[provider]} icon={<LogIn className="h-4 w-4" />} key={provider} variant="secondary" onClick={() => window.location.assign(getOAuthStartUrl(provider))}>{provider === "google" ? "Google" : provider === "discord" ? "Discord" : "Steam"}</Button>)}</div>
      {!providers.google && !providers.discord && !providers.steam ? <p className="text-center text-xs text-arena-muted">Acesso social disponivel assim que as credenciais dos provedores forem configuradas.</p> : null}
      <p className="pt-2 text-center text-sm text-arena-muted">Ainda nao possui conta? <Link className="font-semibold text-cyan-200 hover:underline" to="/criar-conta">Criar conta</Link></p>
    </div>
  </AuthShell>;
}

export function RegisterPage() {
  const { registerAccount } = useAuth();
  const { error } = useToast();
  const [step, setStep] = useState(1);
  const [games, setGames] = useState<Game[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RegisterResponse | null>(null);
  const [form, setForm] = useState({ name:"", nickname:"", email:"", password:"", confirm:"", games:[] as number[], steam:"", discord:"" });
  useEffect(() => { void getGames().then((items) => setGames(items.filter((game) => Boolean(game.ativo)))).catch((reason) => error("Falha ao carregar jogos", message(reason))); }, []);
  const canContinue = step === 1 ? Boolean(form.name && form.nickname && form.email && form.password.length >= 8 && form.password === form.confirm) : step === 2 ? games.length === 0 || form.games.length > 0 : true;

  async function finish() {
    setBusy(true);
    try { setResult(await registerAccount({ name:form.name, nickname:form.nickname, email:form.email, password:form.password, game_ids:form.games, primary_game_id:form.games[0], steam:form.steam, discord:form.discord })); }
    catch (reason) { error("Nao foi possivel criar a conta", message(reason)); }
    finally { setBusy(false); }
  }
  if (result) return <AuthShell eyebrow="Cadastro concluido" title={result.email_sent ? "Confirme seu email" : "Conta criada"} description={result.email_sent ? `Enviamos as instrucoes para ${result.email}.` : "Nao foi possivel enviar o email. Solicite um novo link na tela de acesso."}><div className="space-y-4 text-center"><MailCheck className="mx-auto h-12 w-12 text-cyan-200" /><p className="text-sm leading-6 text-arena-muted">A confirmacao protege sua conta e libera inscricoes, presencas e demais acoes competitivas.</p><Link to="/entrar"><Button className="w-full" variant="secondary">Ir para o login</Button></Link></div></AuthShell>;

  return <AuthShell eyebrow={`Etapa ${step} de 4`} title="Criar sua conta" description="Uma identidade para todos os jogos, equipes e papeis da Arena Camp.">
    <div className="mb-6 grid grid-cols-4 gap-2">{["Conta", "Jogos", "Vinculos", "Revisao"].map((label, index) => <div key={label}><div className={`h-1 ${step >= index + 1 ? "bg-cyan-400" : "bg-white/10"}`} /><p className="mt-2 hidden text-xs text-arena-muted sm:block">{label}</p></div>)}</div>
    {step === 1 ? <div className="grid gap-4 sm:grid-cols-2"><Field label="Nome"><Input value={form.name} onChange={(event) => setForm((state) => ({ ...state, name:event.target.value }))} /></Field><Field label="Nickname"><Input value={form.nickname} onChange={(event) => setForm((state) => ({ ...state, nickname:event.target.value }))} /></Field><div className="sm:col-span-2"><Field label="Email"><Input type="email" value={form.email} onChange={(event) => setForm((state) => ({ ...state, email:event.target.value }))} /></Field></div><Field label="Senha"><Input type="password" value={form.password} onChange={(event) => setForm((state) => ({ ...state, password:event.target.value }))} /></Field><Field label="Confirmar senha"><Input type="password" value={form.confirm} onChange={(event) => setForm((state) => ({ ...state, confirm:event.target.value }))} /></Field></div> : null}
    {step === 2 ? <div className="grid gap-3 sm:grid-cols-2">{games.map((game) => { const selected = form.games.includes(game.id); return <button className={`flex min-h-16 items-center justify-between border p-4 text-left ${selected ? "border-cyan-400 bg-cyan-400/10" : "border-arena-line bg-black/20"}`} key={game.id} onClick={() => setForm((state) => ({ ...state, games:selected ? state.games.filter((id) => id !== game.id) : [...state.games, game.id] }))}><span><span className="block font-semibold">{game.nome}</span><span className="text-xs text-arena-muted">{game.nome_curto}</span></span>{selected ? <Check className="h-5 w-5 text-cyan-200" /> : <Gamepad2 className="h-5 w-5 text-arena-muted" />}</button>; })}{!games.length ? <div className="border border-dashed border-arena-line p-5 sm:col-span-2"><p className="font-semibold">Catalogo em preparacao</p><p className="mt-1 text-sm text-arena-muted">O administrador ainda cadastrara os jogos. Voce pode continuar e escolher seus jogos depois.</p></div> : null}</div> : null}
    {step === 3 ? <div className="space-y-4"><Field label="Steam"><Input placeholder="Perfil ou Steam ID" value={form.steam} onChange={(event) => setForm((state) => ({ ...state, steam:event.target.value }))} /></Field><Field label="Discord"><Input placeholder="Usuario do Discord" value={form.discord} onChange={(event) => setForm((state) => ({ ...state, discord:event.target.value }))} /></Field><p className="text-sm text-arena-muted">Os vinculos sao opcionais e podem ser alterados no perfil.</p></div> : null}
    {step === 4 ? <div className="space-y-3"><Review label="Conta" value={`${form.nickname} - ${form.email}`} /><Review label="Jogos" value={games.filter((game) => form.games.includes(game.id)).map((game) => game.nome_curto).join(", ") || "Selecionar depois"} /><Review label="Steam" value={form.steam || "Vincular depois"} /><Review label="Discord" value={form.discord || "Vincular depois"} /></div> : null}
    <div className="mt-7 flex justify-between gap-3"><Button disabled={step === 1} icon={<ChevronLeft className="h-4 w-4" />} variant="secondary" onClick={() => setStep((value) => Math.max(1, value - 1))}>Voltar</Button>{step < 4 ? <Button disabled={!canContinue} onClick={() => setStep((value) => Math.min(4, value + 1))}>Continuar <ChevronRight className="h-4 w-4" /></Button> : <Button loading={busy} icon={<ShieldCheck className="h-4 w-4" />} onClick={() => void finish()}>Criar conta</Button>}</div>
  </AuthShell>;
}

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const verificationStarted = useRef(false);
  useEffect(() => {
    if (verificationStarted.current) return;
    verificationStarted.current = true;
    if (!token) { setState("error"); return; }
    void verifyAccountEmail(token).then(() => setState("success")).catch(() => setState("error"));
  }, [token]);
  return <AuthShell eyebrow="Seguranca da conta" title={state === "loading" ? "Confirmando email" : state === "success" ? "Email confirmado" : "Link invalido"} description={state === "success" ? "Sua conta esta pronta para usar todas as funcoes da plataforma." : state === "error" ? "O link expirou ou ja foi utilizado." : "Aguarde enquanto validamos sua confirmacao."}><div className="text-center"><MailCheck className="mx-auto h-12 w-12 text-cyan-200" />{state !== "loading" ? <Link to="/entrar"><Button className="mt-6 w-full">Entrar na Arena Camp</Button></Link> : null}</div></AuthShell>;
}

export function PasswordRecoveryPage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const { success, error } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() { setBusy(true); try { if (token) { await resetAccountPassword(token, password); success("Senha atualizada", "Entre novamente com sua nova senha."); } else { const response = await requestAccountPasswordReset(email); success("Solicitacao recebida", response.mensagem); } } catch (reason) { error("Nao foi possivel continuar", message(reason)); } finally { setBusy(false); } }
  return <AuthShell eyebrow="Recuperacao de acesso" title={token ? "Crie uma nova senha" : "Recupere sua conta"} description={token ? "A nova senha encerrara as outras sessoes ativas." : "Informe seu email para receber um link seguro e temporario."}><div className="space-y-4">{token ? <><Field label="Nova senha"><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field><Field label="Confirmar senha"><Input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} /></Field></> : <Field label="Email"><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>}<Button className="w-full" disabled={token ? password.length < 8 || password !== confirm : !email} loading={busy} icon={<LockKeyhole className="h-4 w-4" />} onClick={() => void submit()}>{token ? "Atualizar senha" : "Enviar instrucoes"}</Button><Link className="block text-center text-sm font-semibold text-cyan-200" to="/entrar">Voltar para o login</Link></div></AuthShell>;
}

export function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithOAuthCode } = useAuth();
  const { error } = useToast();
  const exchangeStarted = useRef(false);
  useEffect(() => {
    if (exchangeStarted.current) return;
    exchangeStarted.current = true;
    const code = params.get("code");
    if (!code) { navigate("/entrar?oauth_error=Codigo%20social%20ausente", { replace:true }); return; }
    void loginWithOAuthCode(code)
      .then(() => navigate("/onboarding", { replace:true }))
      .catch((reason) => { error("Nao foi possivel concluir", message(reason)); navigate("/entrar", { replace:true }); });
  }, []);
  return <AuthShell eyebrow="Acesso social" title="Conectando sua conta" description="Estamos validando sua identidade e preparando o contexto correto."><div className="flex items-center justify-center py-8"><LoaderCircle className="h-10 w-10 animate-spin text-cyan-200" /></div></AuthShell>;
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user, token, refreshSession, updateGames } = useAuth();
  const { error, success } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [availableGames, setAvailableGames] = useState<Game[]>([]);
  const [gamesLoaded, setGamesLoaded] = useState(false);
  const [selectedGames, setSelectedGames] = useState<number[]>([]);
  const [contact, setContact] = useState({ email:"", nickname:"" });
  useEffect(() => { void getGames().then((items) => setAvailableGames(items.filter((game) => Boolean(game.ativo)))).catch(() => undefined).finally(() => setGamesLoaded(true)); }, []);
  useEffect(() => { if (user) setContact((state) => ({ email:user.needs_email ? state.email : user.email, nickname:state.nickname || user.nickname || "" })); }, [user?.id, user?.needs_email]);
  if (!token) return <Navigate replace to="/entrar" />;
  const options = [{ role:"jogador" as const, title:"Sou jogador", description:"Construa sua carreira, encontre equipes e acompanhe partidas.", icon:<UserRound className="h-6 w-6" /> }, { role:"lider" as const, title:"Sou lider de equipe", description:"Crie e gerencie elenco, lineups e inscricoes.", icon:<Users className="h-6 w-6" /> }];
  async function choose(role: typeof options[number]["role"]) { setBusy(role); try { await completeAccountOnboarding(role); await refreshSession(); navigate(roleHref(role)); } catch (reason) { error("Nao foi possivel concluir", message(reason)); } finally { setBusy(null); } }
  if (user?.onboarding_completed) return <Navigate replace to={roleHref(user.active_role)} />;
  if (!user) return <AuthShell eyebrow="Primeiro acesso" title="Preparando sua conta" description="Carregando seus contextos e permissoes."><div className="flex justify-center py-8"><LoaderCircle className="h-9 w-9 animate-spin text-cyan-200" /></div></AuthShell>;
  if (!gamesLoaded) return <AuthShell eyebrow="Primeiro acesso" title="Preparando sua conta" description="Carregando o catalogo competitivo."><div className="flex justify-center py-8"><LoaderCircle className="h-9 w-9 animate-spin text-cyan-200" /></div></AuthShell>;
  if (user.needs_email) {
    async function saveContact() {
      setBusy("contact");
      try {
        const result = await completeOAuthAccountProfile(contact);
        success("Email salvo", result.mensagem);
        await refreshSession();
      } catch (reason) { error("Nao foi possivel salvar", message(reason)); }
      finally { setBusy(null); }
    }
    return <AuthShell eyebrow="Primeiro acesso" title="Complete seu perfil" description="A Steam nao compartilha email. Informe um endereco valido para proteger e recuperar sua conta."><div className="space-y-4"><Field label="Email"><Input autoComplete="email" type="email" value={contact.email} onChange={(event) => setContact((state) => ({ ...state, email:event.target.value }))} /></Field><Field label="Nickname"><Input value={contact.nickname} onChange={(event) => setContact((state) => ({ ...state, nickname:event.target.value }))} /></Field><Button className="w-full" disabled={!/^\S+@\S+\.\S+$/.test(contact.email)} loading={busy === "contact"} icon={<AtSign className="h-4 w-4" />} onClick={() => void saveContact()}>Salvar e continuar</Button></div></AuthShell>;
  }
  if (!user.games.length && availableGames.length) {
    async function saveGames() {
      setBusy("games");
      try { await updateGames(selectedGames, selectedGames[0]); success("Jogos salvos", "Seu painel sera filtrado pelos jogos selecionados."); }
      catch (reason) { error("Nao foi possivel salvar", message(reason)); }
      finally { setBusy(null); }
    }
    return <AuthShell eyebrow="Primeiro acesso" title="Quais jogos voce compete?" description="Voce pode selecionar mais de um e alternar o contexto em qualquer painel."><div className="grid gap-3 sm:grid-cols-2">{availableGames.map((game) => { const selected = selectedGames.includes(game.id); return <button className={`flex min-h-16 items-center justify-between border p-4 text-left ${selected ? "border-cyan-400 bg-cyan-400/10" : "border-arena-line bg-black/20"}`} key={game.id} onClick={() => setSelectedGames((items) => selected ? items.filter((id) => id !== game.id) : [...items, game.id])}><span><span className="block font-semibold">{game.nome}</span><span className="text-xs text-arena-muted">{game.nome_curto}</span></span>{selected ? <Check className="h-5 w-5 text-cyan-200" /> : <Gamepad2 className="h-5 w-5 text-arena-muted" />}</button>; })}</div><Button className="mt-6 w-full" disabled={!selectedGames.length} loading={busy === "games"} icon={<Gamepad2 className="h-4 w-4" />} onClick={() => void saveGames()}>Salvar jogos</Button></AuthShell>;
  }
  return <AuthShell eyebrow="Primeiro acesso" title="Como voce quer comecar?" description="A conta e unica. Novos papeis aparecem automaticamente conforme suas permissoes."><div className="space-y-3">{options.map((option) => <button className="flex w-full items-center gap-4 border border-arena-line bg-black/20 p-4 text-left transition hover:border-cyan-400/50 hover:bg-cyan-400/[.06]" disabled={Boolean(busy)} key={option.role} onClick={() => void choose(option.role)}><span className="flex h-11 w-11 shrink-0 items-center justify-center border border-cyan-400/30 bg-cyan-400/10 text-cyan-200">{option.icon}</span><span className="min-w-0 flex-1"><span className="block font-semibold">{option.title}</span><span className="mt-1 block text-sm text-arena-muted">{option.description}</span></span>{busy === option.role ? <Badge tone="info">Salvando</Badge> : <ChevronRight className="h-5 w-5 text-arena-muted" />}</button>)}</div></AuthShell>;
}

function AuthShell({ eyebrow, title, description, children }: { eyebrow:string; title:string; description:string; children:React.ReactNode }) { return <section className="flex min-h-[calc(100vh-7rem)] items-center justify-center px-4 py-10"><Card className="w-full max-w-xl"><CardHeader><p className="text-xs font-semibold uppercase text-cyan-200">{eyebrow}</p><h1 className="mt-2 font-display text-3xl font-bold">{title}</h1><p className="mt-2 text-sm leading-6 text-arena-muted">{description}</p></CardHeader><CardContent>{children}</CardContent></Card></section>; }
function Field({ label, children }: { label:string; children:React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div>; }
function Review({ label, value }: { label:string; value:string }) { return <div className="flex items-start justify-between gap-4 border-b border-arena-line py-3"><span className="text-sm text-arena-muted">{label}</span><span className="text-right text-sm font-semibold">{value}</span></div>; }
function roleHref(role:string) { return role === "lider" ? "/lider" : role === "capitao" ? "/capitao" : role === "admin" ? "/admin" : "/jogador"; }
function message(reason:unknown) { return reason instanceof Error ? reason.message : "Tente novamente."; }
