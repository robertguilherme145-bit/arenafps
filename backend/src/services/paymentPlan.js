// O que fazer quando alguem pede para pagar, conforme a forma de recebimento atual e o pagamento
// que ja existe para essa inscricao. Regra pura (testada); quem executa e o servico de pagamento.
//
// Resultados:
//   create         - nao ha pagamento: gerar um novo
//   reuse          - devolver o pagamento atual como esta
//   refresh        - PIX proprio pendente: gerar de novo e trocar so se o codigo mudou
//   replace        - trocar o pagamento atual por um novo (recusado, cancelado ou de outra forma)
//   check-gateway  - PIX do Mercado Pago pendente: conferir no Mercado Pago, cancelar e so entao trocar

export function planPayment(mode, existing) {
  if (!existing) return "create";
  if (existing.status === "aprovado") throw new Error("Esta inscricao ja esta paga.");
  const pending = existing.status === "pendente";

  if (mode === "pix_manual") {
    if (existing.provider === "pix_manual") {
      if (!pending) return "replace";
      return existing.declared_at ? "reuse" : "refresh";
    }
    if (existing.provider === "mercadopago" && pending && existing.gateway_id) return "check-gateway";
    return "replace";
  }

  // Mercado Pago
  if (existing.provider === "mercadopago") return pending ? "reuse" : "replace";
  if (existing.provider === "pix_manual" && pending && existing.declared_at) {
    throw new Error("Voce ja informou o pagamento pelo PIX. Aguarde a organizacao confirmar.");
  }
  return "replace";
}
