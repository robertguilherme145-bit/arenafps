// Forma de recebimento escolhida pela organizacao: Mercado Pago (automatico) ou PIX proprio (manual).
// Regras puras aqui; leitura e gravacao no banco ficam em paymentSettings.service.js.
import QRCode from "qrcode";
import { buildPixCode, normalizePixKey, pixText } from "../utils/brCode.js";

export const PAYMENT_MODES = ["mercadopago", "pix_manual"];

// Sem nada salvo, comeca no PIX proprio (decisao do dono para o primeiro campeonato).
export const DEFAULT_PAYMENT_SETTINGS = Object.freeze({
  mode:"pix_manual",
  pix_key_type:"",
  pix_key:"",
  receiver_name:"",
  receiver_city:"",
  instructions:""
});

export function mergePaymentSettings(saved) {
  return { ...DEFAULT_PAYMENT_SETTINGS, ...(saved && typeof saved === "object" ? saved : {}) };
}

export function isManualPixReady(settings) {
  return Boolean(settings.pix_key && settings.pix_key_type && settings.receiver_name && settings.receiver_city);
}

// Valida o que veio do painel. O PIX proprio so pode ficar ativo com a chave completa.
export function validatePaymentSettings(payload) {
  const mode = String(payload?.mode ?? "");
  if (!PAYMENT_MODES.includes(mode)) throw new Error("Escolha Mercado Pago ou PIX próprio.");
  const hasKey = String(payload?.pix_key ?? "").trim() !== "";
  const settings = {
    mode,
    pix_key_type:hasKey ? String(payload.pix_key_type ?? "") : "",
    pix_key:hasKey ? normalizePixKey(String(payload.pix_key_type ?? ""), payload.pix_key) : "",
    receiver_name:pixText(payload?.receiver_name, 25),
    receiver_city:pixText(payload?.receiver_city, 15),
    instructions:String(payload?.instructions ?? "").trim().slice(0, 300)
  };
  if (mode === "pix_manual") {
    if (!settings.pix_key) throw new Error("Para receber pelo PIX próprio, informe a chave PIX.");
    if (!settings.receiver_name) throw new Error("Informe o nome de quem recebe (como aparece no banco).");
    if (!settings.receiver_city) throw new Error("Informe a cidade de quem recebe.");
  }
  return settings;
}

// Codigo e QR de um PIX proprio, com valor e identificador da inscricao.
export async function buildManualPix(settings, { amount, txid, description }) {
  if (!isManualPixReady(settings)) throw new Error("A organização ainda não configurou o PIX para receber. Fale com a organização.");
  const code = buildPixCode({ key:settings.pix_key, name:settings.receiver_name, city:settings.receiver_city, amount, txid, description });
  const dataUrl = await QRCode.toDataURL(code, { errorCorrectionLevel:"M", margin:2, width:512, color:{ dark:"#000000", light:"#ffffff" } });
  return { qr_code:code, copia_cola:code, qr_code_base64:dataUrl.slice(dataUrl.indexOf("base64,") + 7) };
}
