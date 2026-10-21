import { useQuery } from "@tanstack/react-query";
import { Check, ClipboardCopy, Clock3 } from "lucide-react";
import { useState } from "react";
import { getPaymentInfo } from "../../services/api";
import { useToast } from "../../hooks/useToast";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { ImageUploadField } from "../ui/ImageUploadField";

type PixPayment = {
  provider: string;
  status: string;
  valor: number | string | null;
  qr_code_base64: string | null;
  copia_cola: string | null;
  external_reference?: string | null;
  declared_at?: string | null;
};

// Cartao do PIX para quem paga: QR, copia e cola e, no PIX proprio, o botao "Ja paguei".
export function PixPaymentCard({ title, payment, onDeclare }: { title: string; payment: PixPayment; onDeclare: (receiptUrl: string | null) => Promise<unknown> }) {
  const { success, error } = useToast();
  const manual = payment.provider === "pix_manual";
  const { data: info } = useQuery({ queryKey:["payment-info"], queryFn:getPaymentInfo, enabled:manual, staleTime:300_000 });
  const [receipt, setReceipt] = useState("");
  const [sending, setSending] = useState(false);

  async function copy() {
    try { await navigator.clipboard.writeText(payment.copia_cola ?? ""); success("Código copiado", "Cole no app do seu banco, na opção PIX copia e cola."); }
    catch { error("Não foi possível copiar", "Selecione o código e copie manualmente."); }
  }

  async function declare() {
    setSending(true);
    try { await onDeclare(receipt || null); }
    finally { setSending(false); }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-xl font-semibold">PIX · {title}</h2>
        <p className="mt-1 text-sm text-arena-muted">
          {Number(payment.valor ?? 0).toLocaleString("pt-BR", { style:"currency", currency:"BRL" })}
          {manual && info?.receiver_name ? <> · para <strong className="text-arena-text">{info.receiver_name}</strong></> : null}
        </p>
      </CardHeader>
      <CardContent className="grid gap-5 md:grid-cols-[180px_1fr]">
        {payment.qr_code_base64 ? <img alt="QR Code do PIX" className="aspect-square w-full max-w-[220px] bg-white p-2" src={`data:image/png;base64,${payment.qr_code_base64}`} /> : null}
        <div className="min-w-0 space-y-3">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-arena-muted">
            <li>Abra o app do seu banco e escolha <strong className="text-arena-text">PIX copia e cola</strong> (ou leia o QR Code).</li>
            <li>Confira o valor e o nome de quem recebe.</li>
            <li>{manual ? <>Depois de pagar, volte aqui e clique em <strong className="text-arena-text">Já paguei</strong>.</> : "A confirmação chega sozinha em alguns segundos."}</li>
          </ol>
          <div className="break-all border border-arena-line bg-black/20 p-3 font-mono text-xs">{payment.copia_cola}</div>
          <Button icon={<ClipboardCopy className="h-4 w-4" />} onClick={() => void copy()} variant="secondary">Copiar código</Button>
          {manual && info?.instructions ? <p className="border-l-2 border-arena-amber pl-3 text-sm text-arena-muted">{info.instructions}</p> : null}
          {manual && payment.external_reference ? <p className="text-xs text-arena-muted">Código da inscrição: <span className="font-mono text-arena-text">{payment.external_reference}</span></p> : null}

          {manual ? payment.declared_at ? (
            <p className="flex items-center gap-2 border border-arena-line bg-arena-panel2 p-3 text-sm"><Clock3 className="h-4 w-4 shrink-0 text-arena-amber" />Você informou o pagamento. A organização vai conferir no extrato e confirmar; você recebe um aviso aqui no site.</p>
          ) : (
            <div className="space-y-3 border-t border-arena-line pt-3">
              <p className="text-sm text-arena-muted">Comprovante (opcional): ajuda a organização a confirmar mais rápido.</p>
              <ImageUploadField label="Enviar comprovante" value={receipt} onChange={setReceipt} />
              <Button icon={<Check className="h-4 w-4" />} loading={sending} onClick={() => void declare()}>Já paguei</Button>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
