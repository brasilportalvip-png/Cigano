import type { Request, Response } from 'express';
import crypto from 'crypto';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { requireAuth, type AuthenticatedRequest } from '../serverlib/middleware/auth.js';
import { firestore } from '../serverlib/_firebaseAdmin.js';
import { logger } from '../serverlib/services/logger.js';
import { checkRateLimit } from '../serverlib/services/rateLimiter.js';
import { getSpecialPlan } from '../serverlib/specialPlans.js';
import { SPECIAL_ORDERS } from '../serverlib/services/specialPlanService.js';

/**
 * Plano Especial (jogo de tarot com o Cigano): mesmo processo dos Planos Prata/Ouro/Diamante
 * — conta + Mercado Pago. O preço vem do servidor. Não credita créditos; depois de pago,
 * a pessoa envia o comprovante no WhatsApp para agendar (jogo em até 3 dias).
 */
export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

  const authReq = req as AuthenticatedRequest;
  if (!(await requireAuth(authReq, res))) return;
  const user = authReq.user!;

  const rate = await checkRateLimit(`pay_special_${user.uid}`, 10, 60000);
  if (!rate.allowed) return res.status(429).json({ error: 'Muitas tentativas. Aguarde um minuto.', code: 'RATE_LIMIT_EXCEEDED' });

  const plan = getSpecialPlan(String(req.body?.planId || ''));
  if (!plan) return res.status(400).json({ error: 'Plano inválido.' });
  if (!firestore) return res.status(503).json({ error: 'Banco de dados indisponível.', code: 'SERVICE_UNAVAILABLE' });

  const orderId = `esp_${crypto.randomUUID().replace(/-/g, '')}`;
  const now = new Date().toISOString();
  try {
    await firestore.collection(SPECIAL_ORDERS).doc(orderId).set({
      orderId, uid: user.uid, userEmail: user.email, planId: plan.id, planName: plan.title,
      expectedAmount: plan.price, currency: 'BRL', status: 'pending', createdAt: now, updatedAt: now,
    });
  } catch (err: any) {
    logger.error('FAIL-CLOSED: special order could not be saved', { orderId, error: String(err) });
    return res.status(500).json({ error: 'Não foi possível registrar o pedido. O pagamento foi interrompido com segurança.' });
  }

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  const siteUrl = process.env.PUBLIC_SITE_URL || process.env.APP_BASE_URL || 'http://localhost:3000';
  const isTestEnv = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
  const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
  const back = (st: string) => `${siteUrl}/?especial=${orderId}&pagamento=${st}`;

  if (!accessToken || accessToken === 'MY_ACCESS_TOKEN') {
    if (!isProduction && (isTestEnv || process.env.ENABLE_MOCK_PAYMENT === 'true')) {
      return res.status(200).json({ orderId, init_point: back('pendente'), isMock: true });
    }
    return res.status(503).json({ error: 'Gateway de pagamentos do Mercado Pago temporariamente indisponível.', code: 'GATEWAY_CONFIG_MISSING' });
  }

  try {
    const pref = await new Preference(new MercadoPagoConfig({ accessToken })).create({
      body: {
        items: [{ id: plan.id, title: `${plan.badge} — ${plan.title}`, quantity: 1, currency_id: 'BRL', unit_price: plan.price }],
        payer: { email: user.email, name: user.fullName || 'Consulente' },
        metadata: { orderId, userId: user.uid, planId: plan.id, kind: 'special_plan' },
        external_reference: orderId,
        notification_url: `${siteUrl}/api/mercadopago-webhook`,
        back_urls: { success: back('sucesso'), failure: back('falhou'), pending: back('pendente') },
        auto_return: 'approved',
      },
    });
    await firestore.collection(SPECIAL_ORDERS).doc(orderId).set({ providerPreferenceId: pref.id, updatedAt: new Date().toISOString() }, { merge: true });
    return res.status(200).json({ orderId, init_point: pref.init_point });
  } catch (err: any) {
    logger.error('Error creating special Mercado Pago preference', err);
    return res.status(500).json({ error: 'Não foi possível gerar o pagamento no momento. Tente novamente mais tarde.' });
  }
}
