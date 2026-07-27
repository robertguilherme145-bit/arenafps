import { KeyRound, Lock, LogOut, Monitor, QrCode, Save, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { Input, Select } from "../../components/ui/Form";
import { Modal } from "../../components/ui/Modal";
import { useAuth } from "../../contexts/AuthContext";
import {
  changePlayerWorkspacePassword,
  confirmPlayerTwoFactor,
  disablePlayerTwoFactor,
  revokePlayerSession,
  setupPlayerTwoFactor,
  updatePlayerWorkspaceSettings
} from "../../services/api";
import { Field, StatusBadge, formatDate, type PlayerModuleProps } from "./playerWorkspaceShared";

export function PlayerSecurityModule({ data, busy, run }: PlayerModuleProps) {
  const { logout } = useAuth();
  const [preferences, setPreferences] = useState({ ...data.profile.preferences });
  const [password, setPassword] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [setup, setSetup] = useState<{ qr_code: string; manual_key: string } | null>(null);
  const [code, setCode] = useState("");
  const [disableForm, setDisableForm] = useState({ password: "", code: "" });

  async function savePassword() {
    const ok = await run("password", () => changePlayerWorkspacePassword(password), "Senha alterada", false);
    if (ok) setPassword({ current_password: "", new_password: "", confirm_password: "" });
  }
  async function startTwoFactor() {
    await run("2fa-setup", async () => setSetup(await setupPlayerTwoFactor()), "QR Code gerado", false);
  }
  async function confirmTwoFactor() {
    const ok = await run("2fa-confirm", () => confirmPlayerTwoFactor(code), "Autenticacao em duas etapas ativada");
    if (ok) { setSetup(null); setCode(""); }
  }
  async function turnOffTwoFactor() {
    const ok = await run("2fa-disable", () => disablePlayerTwoFactor(disableForm.password, disableForm.code), "Autenticacao em duas etapas desativada");
    if (ok) setDisableForm({ password: "", code: "" });
  }

  return <div className="grid gap-5 xl:grid-cols-2">
    <Card><CardHeader><div className="flex items-center gap-3"><Save className="h-5 w-5 text-cyan-200" /><div><h2 className="font-display text-xl font-semibold">Preferencias</h2><p className="text-sm text-arena-muted">Tema, idioma, privacidade e notificacoes.</p></div></div></CardHeader><CardContent className="space-y-4"><Field label="Tema"><Select value={preferences.theme} onChange={(event) => setPreferences({ ...preferences, theme: event.target.value as typeof preferences.theme })}><option value="dark">Escuro</option><option value="light">Claro</option><option value="system">Usar configuracao do sistema</option></Select></Field><Field label="Idioma"><Select value={preferences.language} onChange={(event) => setPreferences({ ...preferences, language: event.target.value })}><option value="pt-BR">Portugues (Brasil)</option><option value="en-US">English</option><option value="es-ES">Espanol</option></Select></Field><Toggle label="Perfil publico" description="Permitir que outros usuarios consultem sua carreira." checked={preferences.profile_public} onChange={(value) => setPreferences({ ...preferences, profile_public: value })} /><Toggle label="Notificacoes por e-mail" description="Receber avisos importantes no e-mail cadastrado." checked={preferences.email_notifications} onChange={(value) => setPreferences({ ...preferences, email_notifications: value })} /><Toggle label="Notificacoes no Discord" description="Receber integracoes quando houver um Discord vinculado." checked={preferences.discord_notifications} onChange={(value) => setPreferences({ ...preferences, discord_notifications: value })} /><Button loading={busy === "preferences"} icon={<Save className="h-4 w-4" />} onClick={() => void run("preferences", () => updatePlayerWorkspaceSettings(preferences), "Preferencias atualizadas")}>Salvar preferencias</Button></CardContent></Card>
    <div className="space-y-5"><Card><CardHeader><div className="flex items-center gap-3"><KeyRound className="h-5 w-5 text-cyan-200" /><div><h2 className="font-display text-xl font-semibold">Alterar senha</h2><p className="text-sm text-arena-muted">Use pelo menos oito caracteres.</p></div></div></CardHeader><CardContent className="space-y-4"><Field label="Senha atual"><Input autoComplete="current-password" type="password" value={password.current_password} onChange={(event) => setPassword({ ...password, current_password: event.target.value })} /></Field><Field label="Nova senha"><Input autoComplete="new-password" type="password" value={password.new_password} onChange={(event) => setPassword({ ...password, new_password: event.target.value })} /></Field><Field label="Confirmar nova senha"><Input autoComplete="new-password" type="password" value={password.confirm_password} onChange={(event) => setPassword({ ...password, confirm_password: event.target.value })} /></Field><Button loading={busy === "password"} disabled={password.new_password.length < 8 || password.new_password !== password.confirm_password} icon={<Lock className="h-4 w-4" />} onClick={() => void savePassword()}>Atualizar senha</Button></CardContent></Card>
      <Card><CardHeader><div className="flex items-center gap-3"><QrCode className="h-5 w-5 text-cyan-200" /><div><h2 className="font-display text-xl font-semibold">Autenticacao em duas etapas</h2><p className="text-sm text-arena-muted">Proteja o login com um codigo TOTP.</p></div></div></CardHeader><CardContent>{data.security.two_factor_enabled ? <div className="space-y-4"><div className="flex items-center justify-between border border-emerald-500/30 bg-emerald-500/10 p-3"><span className="text-sm font-semibold text-emerald-200">Protecao ativa</span><Badge tone="success">Ativada</Badge></div><Field label="Senha atual"><Input type="password" value={disableForm.password} onChange={(event) => setDisableForm({ ...disableForm, password: event.target.value })} /></Field><Field label="Codigo do autenticador"><Input inputMode="numeric" maxLength={6} value={disableForm.code} onChange={(event) => setDisableForm({ ...disableForm, code: digits(event.target.value) })} /></Field><Button variant="danger" loading={busy === "2fa-disable"} disabled={!disableForm.password || disableForm.code.length !== 6} onClick={() => void turnOffTwoFactor()}>Desativar 2FA</Button></div> : <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="font-semibold">Protecao adicional desativada</p><p className="text-sm text-arena-muted">Compativel com Google Authenticator, Authy e outros apps TOTP.</p></div><Button loading={busy === "2fa-setup"} icon={<QrCode className="h-4 w-4" />} onClick={() => void startTwoFactor()}>Configurar</Button></div>}</CardContent></Card></div>
    <Card className="xl:col-span-2"><CardHeader><div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-cyan-200" /><div><h2 className="font-display text-xl font-semibold">Sessoes da conta</h2><p className="text-sm text-arena-muted">Revise os dispositivos conectados e encerre acessos desconhecidos.</p></div></div></CardHeader><CardContent className="space-y-3">{data.security.sessions.map((session) => <div className="flex flex-col justify-between gap-4 border border-arena-line p-4 sm:flex-row sm:items-center" key={session.id}><div className="flex gap-3">{session.user_agent?.toLowerCase().includes("mobile") ? <Smartphone className="mt-1 h-5 w-5 text-cyan-200" /> : <Monitor className="mt-1 h-5 w-5 text-cyan-200" />}<div><p className="font-semibold">{browserLabel(session.user_agent)} {session.is_current ? "(esta sessao)" : ""}</p><p className="text-xs text-arena-muted">IP {session.ip_address || "nao identificado"} · ultimo acesso {formatDate(session.last_seen_at)}</p></div></div><div className="flex items-center gap-2"><StatusBadge value={session.active ? "ativo" : "cancelado"} />{session.is_current ? <Button variant="danger" icon={<LogOut className="h-4 w-4" />} onClick={logout}>Sair</Button> : session.active ? <Button variant="danger" loading={busy === `session-${session.id}`} icon={<Trash2 className="h-4 w-4" />} onClick={() => void run(`session-${session.id}`, () => revokePlayerSession(session.id), "Sessao encerrada")}>Revogar</Button> : null}</div></div>)}{!data.security.sessions.length ? <div className="flex flex-col justify-between gap-4 border border-arena-line p-4 sm:flex-row sm:items-center"><div><p className="font-semibold">Sessao atual</p><p className="text-sm text-arena-muted">Sessao anterior ao controle individual de dispositivos.</p></div><Button variant="danger" icon={<LogOut className="h-4 w-4" />} onClick={logout}>Encerrar</Button></div> : null}</CardContent></Card>
    <Modal open={Boolean(setup)} title="Ativar autenticacao em duas etapas" description="Escaneie o QR Code e confirme o primeiro codigo do aplicativo." onClose={() => setSetup(null)}><div className="space-y-4">{setup ? <><img alt="QR Code TOTP" className="mx-auto h-56 w-56 bg-white p-2" src={setup.qr_code} /><div className="border border-arena-line bg-black/20 p-3 text-center"><p className="text-xs uppercase text-arena-muted">Chave manual</p><p className="mt-1 break-all font-mono text-sm">{setup.manual_key}</p></div></> : null}<Field label="Codigo de seis digitos"><Input autoComplete="one-time-code" className="text-center font-mono text-xl" inputMode="numeric" maxLength={6} placeholder="000000" value={code} onChange={(event) => setCode(digits(event.target.value))} /></Field><Button className="w-full" loading={busy === "2fa-confirm"} disabled={code.length !== 6} onClick={() => void confirmTwoFactor()}>Confirmar e ativar</Button></div></Modal>
  </div>;
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex cursor-pointer items-center justify-between gap-4 border border-arena-line p-3"><span><span className="block text-sm font-semibold">{label}</span><span className="block text-xs text-arena-muted">{description}</span></span><input className="h-4 w-4 accent-cyan-400" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>;
}

function digits(value: string) { return value.replace(/\D/g, "").slice(0, 6); }
function browserLabel(userAgent: string | null) { const value = String(userAgent || ""); if (value.includes("Edg/")) return "Microsoft Edge"; if (value.includes("Chrome/")) return "Google Chrome"; if (value.includes("Firefox/")) return "Mozilla Firefox"; if (value.includes("Safari/")) return "Safari"; return "Navegador web"; }
