import { useState } from "react";
import { KeyRound, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../hooks/useToast";
import { useSessionStore } from "../../stores/sessionStore";
import { Button } from "../ui/Button";
import { Input, Label, Select } from "../ui/Form";
import { Modal } from "../ui/Modal";

export function AuthDialog() {
  const open = useSessionStore((state) => state.authModalOpen);
  const setOpen = useSessionStore((state) => state.setAuthModalOpen);
  const { loginWithPassword, registerAccount } = useAuth();
  const { error, success } = useToast();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [submitting, setSubmitting] = useState(false);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    cpf: "",
    role: "",
    two_factor_code: ""
  });

  async function handleSubmit() {
    setSubmitting(true);

    try {
      if (mode === "login") {
        const required = await loginWithPassword({
          email: form.email,
          password: form.password,
          two_factor_code: form.two_factor_code || undefined
        });
        if (required) setTwoFactorRequired(true);
        else setTwoFactorRequired(false);
      } else {
        await registerAccount({
          name: form.name,
          email: form.email,
          cpf: form.cpf,
          password: form.password,
          intended_role: form.role === "lider" ? "lider" : "jogador"
        });
        setMode("login");
        success("Cadastro salvo", "Use o mesmo email e senha para entrar.");
      }
    } catch (err) {
      error("Falha na autenticacao", err instanceof Error ? err.message : "Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title={mode === "login" ? "Entrar na Arena Camp" : "Criar conta"}
      description="Use a conta do banco atual ou cadastre um novo usuario para testar os fluxos autenticados."
      onClose={() => setOpen(false)}
    >
      <div className="space-y-4">
        {mode === "register" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nome">
              <Input value={form.name} onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))} />
            </Field>
            <Field label="CPF">
              <Input value={form.cpf} onChange={(event) => setForm((state) => ({ ...state, cpf: event.target.value }))} />
            </Field>
            <Field label="Perfil">
              <Select value={form.role} onChange={(event) => setForm((state) => ({ ...state, role: event.target.value }))}>
                <option value="">Jogador</option>
                <option value="lider">Quero criar uma equipe</option>
              </Select>
            </Field>
          </div>
        ) : null}
        {!twoFactorRequired ? <><Field label="Email">
          <Input type="email" value={form.email} onChange={(event) => setForm((state) => ({ ...state, email: event.target.value }))} />
        </Field>
        <Field label="Senha">
          <Input type="password" value={form.password} onChange={(event) => setForm((state) => ({ ...state, password: event.target.value }))} />
        </Field></> : <Field label="Codigo de autenticacao"><Input autoComplete="one-time-code" inputMode="numeric" maxLength={6} placeholder="000000" value={form.two_factor_code} onChange={(event) => setForm((state) => ({ ...state, two_factor_code: event.target.value.replace(/\D/g, "") }))} /></Field>}
        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            loading={submitting}
            icon={twoFactorRequired ? <KeyRound className="h-4 w-4" /> : mode === "login" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            onClick={() => void handleSubmit()}
          >
            {twoFactorRequired ? "Validar codigo" : mode === "login" ? "Entrar" : "Cadastrar"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => { setTwoFactorRequired(false); setMode((state) => (state === "login" ? "register" : "login")); }}
          >
            {mode === "login" ? "Criar conta" : "Ja tenho conta"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
