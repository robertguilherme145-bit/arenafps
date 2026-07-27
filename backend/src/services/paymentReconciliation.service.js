import { syncPendingPayments } from "./payment.service.js";

let timer = null;
let running = false;

export function startPaymentReconciliation() {
  if (timer) return timer;

  const intervalMs = resolveInterval(process.env.PAYMENT_RECONCILIATION_INTERVAL_MS);
  const reconcile = async () => {
    if (running) return;
    running = true;

    try {
      const result = await syncPendingPayments();
      if (result.updated > 0) {
        console.log(`Pagamentos conciliados automaticamente: ${result.updated}`);
      }
    } catch (error) {
      console.error("Falha na conciliacao automatica de pagamentos:", error.message);
    } finally {
      running = false;
    }
  };

  timer = setInterval(() => void reconcile(), intervalMs);
  timer.unref?.();
  void reconcile();

  return timer;
}

export function stopPaymentReconciliation() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}

function resolveInterval(value) {
  const interval = Number(value);
  return Number.isFinite(interval) && interval >= 5000 ? interval : 15000;
}
