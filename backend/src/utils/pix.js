import QRCode from "qrcode";

export function normalizeGatewayPaymentStatus(status) {
  const value = String(status ?? "").toLowerCase();
  if (["approved", "authorized", "aprovado"].includes(value)) return "aprovado";
  if (["cancelled", "cancelado", "refunded", "charged_back"].includes(value)) return "cancelado";
  if (["rejected", "rejeitado"].includes(value)) return "rejeitado";
  return "pendente";
}

export function resolvePaymentStatusTransition(currentStatus, gatewayStatus) {
  const current = normalizeGatewayPaymentStatus(currentStatus);
  const next = normalizeGatewayPaymentStatus(gatewayStatus);

  if (current === "aprovado" && ["pendente", "rejeitado"].includes(next)) return current;
  if (["cancelado", "rejeitado"].includes(current) && next === "pendente") return current;
  return next;
}

export function normalizeBase64Image(value) {
  const image = String(value ?? "").trim();
  if (!image) return null;
  const marker = "base64,";
  const markerIndex = image.indexOf(marker);
  return markerIndex >= 0 ? image.slice(markerIndex + marker.length) : image;
}

export async function preparePixData(payment) {
  const transaction = payment?.point_of_interaction?.transaction_data ?? {};
  const code = String(transaction.qr_code ?? "").trim() || null;
  let image = normalizeBase64Image(transaction.qr_code_base64);

  if (!image && code) {
    const dataUrl = await QRCode.toDataURL(code, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 512,
      color: { dark: "#000000", light: "#ffffff" }
    });
    image = normalizeBase64Image(dataUrl);
  }

  return {
    qr_code: code,
    qr_code_base64: image,
    copia_cola: code
  };
}
