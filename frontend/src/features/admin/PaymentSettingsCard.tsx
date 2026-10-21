import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark, Save, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { Input, Label, Select } from "../../components/ui/Form";
import { Skeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../hooks/useToast";
import { getAdminPaymentSettings, saveAdminPaymentSettings, type AdminPaymentSettings, type PaymentMode } from "../../services/api";
import { cn } from "../../utils/cn";

type Form = Omit<AdminPaymentSettings, "manual_ready" | "mercadopago_ready">;

const KEY_TYPES: Array<{ value: Form["pix_key_type"]; label: string; placeholder: string }> = [
  { value:"cpf", label:"CPF", placeholder:"000.000.000-00" },
  { value:"cnpj", label:"CNPJ", placeholder:"00.000.000/0000-00" },
  { value:"email", label:"E-mail", placeholder:"voce@exemplo.com" },
  { value:"telefone", label:"Celular", placeholder:"(11) 98765-4321" },
  { value:"aleatoria", label:"Chave aleatória", placeholder:"123e4567-e89b-12d3-a456-426614174000" }
];

// Forma de recebimento das inscricoes: muda na hora, vale para os proximos PIX gerados.
export function PaymentSettingsCard() {
  const toast = useToast();
  const client = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey:["admin-payment-settings"], queryFn:getAdminPaymentSettings });
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm({ mode:data.mode, pix_key_type:data.pix_key_type, pix_key:data.pix_key, receiver_name:data.receiver_name, receiver_city:data.receiver_city, instructions:data.instructions });
  }, [data]);

  if (isLoading || !form || !data) return <Skeleton className="h-64" />;
  const keyType = KEY_TYPES.find((item) => item.value === form.pix_key_type);
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((current) => current ? { ...current, [key]:value } : current);

  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      const saved = await saveAdminPaymentSettings(form);
      client.setQueryData(["admin-payment-settings"], saved);
      await client.invalidateQueries({ queryKey:["admin-today"] });
      toast.success("Forma de recebimento salva", saved.mode === "pix_manual" ? "Os próximos PIX usam a sua chave. Você confirma cada pagamento aqui." : "Os próximos PIX passam pelo Mercado Pago e confirmam sozinhos.");
    } catch (reason) {
      toast.error("Não foi possível salvar", reason instanceof Error ? reason.message : "Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <h2 className="font-display text-xl font-semibold">Forma de recebimento</h2>
        <p className="mt-1 text-sm text-arena-muted">Pode trocar quando quiser. Vale para os próximos PIX gerados; o que já foi pago continua valendo.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2" role="radiogroup" aria-label="Forma de recebimento">
          <ModeOption active={form.mode === "pix_manual"} description="Sua chave PIX, de qualquer banco. O site gera o copia e cola com o valor; você confirma cada pagamento." icon={<Landmark className="h-5 w-5" />} label="PIX próprio" onSelect={() => set("mode", "pix_manual")} />
          <ModeOption active={form.mode === "mercadopago"} description={data.mercadopago_ready ? "PIX gerado pelo Mercado Pago, com confirmação automática." : "Indisponível: falta configurar o Mercado Pago no servidor."} disabled={!data.mercadopago_ready} icon={<Zap className="h-5 w-5" />} label="Mercado Pago" onSelect={() => set("mode", "mercadopago")} />
        </div>

        <div className="grid gap-4 border-t border-arena-line pt-5 md:grid-cols-2">
          <div className="md:col-span-2"><p className="font-semibold">Dados do PIX próprio</p><p className="text-sm text-arena-muted">Ficam guardados mesmo usando o Mercado Pago, para você trocar rápido se precisar.</p></div>
          <div><Label>Tipo da chave</Label><Select value={form.pix_key_type} onChange={(event) => set("pix_key_type", event.target.value as Form["pix_key_type"])}><option value="">Escolha</option>{KEY_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></div>
          <div><Label>Chave PIX</Label><Input autoComplete="off" placeholder={keyType?.placeholder ?? "Escolha o tipo primeiro"} value={form.pix_key} onChange={(event) => set("pix_key", event.target.value)} /></div>
          <div><Label>Nome de quem recebe</Label><Input maxLength={25} placeholder="Como aparece no banco" value={form.receiver_name} onChange={(event) => set("receiver_name", event.target.value)} /></div>
          <div><Label>Cidade</Label><Input maxLength={15} placeholder="Ex.: Sao Paulo" value={form.receiver_city} onChange={(event) => set("receiver_city", event.target.value)} /></div>
          <div className="md:col-span-2"><Label>Recado para quem paga (opcional)</Label><Input maxLength={300} placeholder="Ex.: Depois de pagar, clique em Já paguei. Confirmamos em até 2 horas." value={form.instructions} onChange={(event) => set("instructions", event.target.value)} /></div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button icon={<Save className="h-4 w-4" />} loading={saving} onClick={() => void save()}>Salvar</Button>
          <p className="text-sm text-arena-muted">Agora: <strong className="text-arena-text">{data.mode === "pix_manual" ? "PIX próprio" : "Mercado Pago"}</strong>{data.mode === "pix_manual" && !data.manual_ready ? " · falta cadastrar a chave" : ""}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ModeOption({ active, disabled = false, icon, label, description, onSelect }: { active: boolean; disabled?: boolean; icon: React.ReactNode; label: string; description: string; onSelect: () => void }) {
  return (
    <button aria-checked={active} className={cn("flex gap-3 border p-4 text-left transition", active ? "border-arena-amber bg-arena-amber/10" : "border-arena-line hover:border-arena-muted", disabled && "cursor-not-allowed opacity-50")} disabled={disabled} onClick={onSelect} role="radio" type="button">
      <span className={cn("mt-0.5", active ? "text-arena-amber" : "text-arena-muted")}>{icon}</span>
      <span><span className="block font-semibold">{label}</span><span className="mt-1 block text-sm text-arena-muted">{description}</span></span>
    </button>
  );
}

export type { PaymentMode };
