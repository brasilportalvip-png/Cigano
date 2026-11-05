import { getSpecialPlan } from '../specialPlans.js';

/**
 * Plano Especial (jogo de tarot com profissional): pedido avulso pago pelo Mercado Pago.
 * NÃO credita créditos. Depois de pago, a pessoa envia o comprovante no WhatsApp para
 * agendar (jogo em até 3 dias). Cada pagamento é processado uma única vez.
 */
export const SPECIAL_ORDERS = 'special_orders';

export type SpecialDecision = 'paid' | 'already_processed' | 'amount_mismatch' | 'currency_mismatch' | 'invalid_plan';

/** Decide o que fazer com um pagamento APROVADO (puro, testável). */
export function decideSpecialPayment(
  payment: { currency_id?: string; transaction_amount?: number },
  order: { planId?: string; status?: string; expectedAmount?: number; providerPaymentId?: string } | null,
  paymentId: string,
): SpecialDecision {
  const plan = getSpecialPlan(String(order?.planId || ''));
  if (!plan) return 'invalid_plan';
  if (order?.status === 'paid') return 'already_processed';
  if (payment.currency_id !== 'BRL') return 'currency_mismatch';
  const amount = Number(payment.transaction_amount);
  if (!Number.isFinite(amount) || Math.abs(amount - plan.price) > 0.01 || Math.abs(Number(order?.expectedAmount) - plan.price) > 0.01) {
    return 'amount_mismatch';
  }
  void paymentId;
  return 'paid';
}

export async function settleSpecialOrder(firestore: any, orderId: string, paymentId: string, payment: any): Promise<SpecialDecision | 'order_missing'> {
  const orderRef = firestore.collection(SPECIAL_ORDERS).doc(orderId);
  return firestore.runTransaction(async (t: any) => {
    const snap = await t.get(orderRef);
    if (!snap.exists) return 'order_missing';
    const order = snap.data() || {};
    const decision = decideSpecialPayment(payment, order, paymentId);
    const now = new Date().toISOString();
    if (decision === 'paid') {
      await t.set(orderRef, { ...order, status: 'paid', providerPaymentId: paymentId, paidAt: now, updatedAt: now });
    } else if (decision === 'amount_mismatch' || decision === 'currency_mismatch') {
      await t.set(orderRef, { ...order, status: decision, providerPaymentId: paymentId, updatedAt: now });
    }
    return decision;
  });
}
