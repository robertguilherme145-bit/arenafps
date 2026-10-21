// PIX "copia e cola" (BR Code estatico, padrao EMV do Banco Central), gerado sem API de banco.
// Funciona com a chave PIX de qualquer banco. Sem dependencias: facil de testar.

const KEY_TYPES = ["cpf", "cnpj", "email", "telefone", "aleatoria"];

export function normalizePixKey(type, value) {
  const raw = String(value ?? "").trim();
  if (!KEY_TYPES.includes(type)) throw new Error("Escolha o tipo da chave PIX.");
  if (!raw) throw new Error("Informe a chave PIX.");
  if (type === "cpf") {
    const digits = raw.replace(/\D/g, "");
    if (digits.length !== 11) throw new Error("CPF da chave PIX precisa ter 11 números.");
    return digits;
  }
  if (type === "cnpj") {
    const digits = raw.replace(/\D/g, "");
    if (digits.length !== 14) throw new Error("CNPJ da chave PIX precisa ter 14 números.");
    return digits;
  }
  if (type === "email") {
    const email = raw.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 77) throw new Error("E-mail da chave PIX inválido.");
    return email;
  }
  if (type === "telefone") {
    let digits = raw.replace(/\D/g, "");
    if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
    if (!/^55\d{10,11}$/.test(digits)) throw new Error("Telefone da chave PIX inválido. Use DDD + número.");
    return `+${digits}`;
  }
  const random = raw.toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(random)) throw new Error("Chave aleatória inválida. Copie a chave completa do app do banco.");
  return random;
}

// Nome e cidade no PIX: sem acento, so caracteres simples, no tamanho maximo do padrao.
export function pixText(value, max) {
  return String(value ?? "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 .-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .trim();
}

// Identificador que aparece no extrato de quem recebe (ate 25 letras e numeros).
export function pixTxid(value) {
  const txid = String(value ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 25);
  return txid || "***";
}

function field(id, value) {
  const text = String(value);
  return `${id}${String(text.length).padStart(2, "0")}${text}`;
}

export function crc16(payload) {
  let crc = 0xffff;
  for (let index = 0; index < payload.length; index += 1) {
    crc ^= payload.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// key ja normalizada; amount em reais (opcional); txid opcional.
export function buildPixCode({ key, name, city, amount = null, txid = "***", description = "" }) {
  const merchantName = pixText(name, 25);
  const merchantCity = pixText(city, 15);
  if (!key) throw new Error("Chave PIX não configurada.");
  if (!merchantName) throw new Error("Informe o nome de quem recebe o PIX.");
  if (!merchantCity) throw new Error("Informe a cidade de quem recebe o PIX.");

  const info = pixText(description, 40);
  const account = field("00", "br.gov.bcb.pix") + field("01", key) + (info ? field("02", info) : "");
  const value = amount === null || amount === undefined ? "" : Number(amount);
  if (value !== "" && (!Number.isFinite(value) || value <= 0)) throw new Error("Valor do PIX inválido.");

  const payload =
    field("00", "01") +
    field("26", account) +
    field("52", "0000") +
    field("53", "986") +
    (value === "" ? "" : field("54", value.toFixed(2))) +
    field("58", "BR") +
    field("59", merchantName) +
    field("60", merchantCity) +
    field("62", field("05", pixTxid(txid))) +
    "6304";
  return payload + crc16(payload);
}
