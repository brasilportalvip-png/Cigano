import type { Request, Response } from 'express';
import { firestore } from '../serverlib/_firebaseAdmin.js';
import { SPECIAL_ORDERS } from '../serverlib/services/specialPlanService.js';

/** Situação do pedido especial (tela "envie o comprovante"). Sem dados pessoais. */
export default async function handler(req: Request, res: Response) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });
  const id = String(req.query?.id || '');
  if (!/^esp_[a-f0-9]{32}$/.test(id)) return res.status(400).json({ error: 'Pedido inválido.' });
  if (!firestore) return res.status(503).json({ error: 'Banco de dados indisponível.' });
  const snap = await firestore.collection(SPECIAL_ORDERS).doc(id).get();
  if (!snap.exists) return res.status(404).json({ error: 'Pedido não encontrado.' });
  const o = snap.data() || {};
  return res.status(200).json({ success: true, data: { orderId: id, planId: o.planId, status: o.status, paid: o.status === 'paid', paymentId: o.providerPaymentId || null } });
}
