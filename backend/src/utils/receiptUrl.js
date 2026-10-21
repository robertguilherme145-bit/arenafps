// Comprovante de PIX: so o endereco privado do proprio site, com codigo aleatorio de 32 caracteres.
const RECEIPT_URL = /^\/payment\/receipts\/([0-9a-f]{32})$/;

export function receiptToken(value) {
  const match = String(value ?? "").trim().match(RECEIPT_URL);
  return match ? match[1] : null;
}

export function receiptUrlFor(token) {
  return `/payment/receipts/${token}`;
}
