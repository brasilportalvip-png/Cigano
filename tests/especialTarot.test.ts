import { describe, it, expect, vi, afterEach } from 'vitest';
import specialPaymentHandler from '../api/special-payment.js';
import specialOrderHandler from '../api/special-order.js';
import webhookHandler from '../api/mercadopago-webhook.js';
import { firestore } from '../serverlib/_firebaseAdmin.js';
import { decideSpecialPayment, SPECIAL_ORDERS } from '../serverlib/services/specialPlanService.js';
import { TAROT_PLAN, bookingMessage, whatsappLink, formatWhatsapp } from '../serverlib/specialPlans.js';

function call(handler: any, req: any) {
  return new Promise<{ status: number; body: any }>((resolve) => {
    let status = 200;
    const res: any = {
      setHeader: () => {},
      status: (c: number) => { status = c; return res; },
      json: (b: any) => { resolve({ status, body: b }); return res; },
    };
    Promise.resolve(handler({ headers: {}, socket: { remoteAddress: '127.0.0.1' }, query: {}, ...req }, res));
  });
}

const auth = (uid: string) => ({ authorization: `Bearer test_token_${uid}` });

afterEach(() => { vi.unstubAllGlobals(); delete process.env.MERCADO_PAGO_ACCESS_TOKEN; });

describe('Plano Especial: Magia do Tarot (jogo com o Cigano)', () => {
  it('dados: 78 cartas, 1 hora, vídeo ou foto e áudio, R$ 290, até 3 dias, WhatsApp (22) 99857-9764', () => {
    expect(TAROT_PLAN.price).toBe(290);
    expect(TAROT_PLAN.deliveryDays).toBe(3);
    expect(TAROT_PLAN.details.join(' ')).toMatch(/78 cartas.*1 hora.*vídeo no WhatsApp.*foto e áudio/);
    expect(formatWhatsapp(TAROT_PLAN.whatsapp)).toBe('(22) 99857-9764');
    const msg = bookingMessage(TAROT_PLAN, { orderId: 'esp_x', paymentId: '123' });
    expect(msg).toMatch(/Maria Padilha/);
    expect(msg).toMatch(/Pagamento Mercado Pago nº 123/);
    expect(whatsappLink(TAROT_PLAN, msg)).toMatch(/^https:\/\/wa\.me\/5522998579764\?text=/);
  });

  it('decisão do pagamento aprovado: paga uma vez; valor ou moeda errados não viram pago', () => {
    const order = { planId: 'tarot-marselha', status: 'pending', expectedAmount: 290 };
    expect(decideSpecialPayment({ currency_id: 'BRL', transaction_amount: 290 }, order, '1')).toBe('paid');
    expect(decideSpecialPayment({ currency_id: 'BRL', transaction_amount: 290 }, { ...order, status: 'paid' }, '1')).toBe('already_processed');
    expect(decideSpecialPayment({ currency_id: 'BRL', transaction_amount: 10 }, order, '1')).toBe('amount_mismatch');
    expect(decideSpecialPayment({ currency_id: 'USD', transaction_amount: 290 }, order, '1')).toBe('currency_mismatch');
    expect(decideSpecialPayment({ currency_id: 'BRL', transaction_amount: 290 }, { ...order, planId: 'falso' }, '1')).toBe('invalid_plan');
  });

  it('sem login não compra; plano inválido é recusado; com login cria o pedido com preço do servidor', async () => {
    expect((await call(specialPaymentHandler, { method: 'POST', body: { planId: 'tarot-marselha' } })).status).toBe(401);
    expect((await call(specialPaymentHandler, { method: 'POST', headers: auth('cli1'), body: { planId: 'ouro' } })).status).toBe(400);
    const ok = await call(specialPaymentHandler, { method: 'POST', headers: auth('cli1'), body: { planId: 'tarot-marselha', price: 1 } });
    expect(ok.status).toBe(200);
    expect(ok.body.orderId).toMatch(/^esp_[a-f0-9]{32}$/);
    const order = (await firestore.collection(SPECIAL_ORDERS).doc(ok.body.orderId).get()).data();
    expect(order.expectedAmount).toBe(290);
    expect(order.uid).toBe('cli1');
    expect(order.status).toBe('pending');
  });

  it('webhook aprovado: marca pago uma única vez, NÃO credita créditos e a tela do comprovante vê o pagamento', async () => {
    const created = await call(specialPaymentHandler, { method: 'POST', headers: auth('cli2'), body: { planId: 'tarot-marselha' } });
    const orderId = created.body.orderId;
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'TEST-local-only';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      id: 777001, status: 'approved', currency_id: 'BRL', transaction_amount: 290, external_reference: orderId, metadata: { order_id: orderId },
    }), { status: 200 })));
    const r1 = await call(webhookHandler, { method: 'POST', body: { type: 'payment', data: { id: '777001' } } });
    expect(r1.status).toBe(200);
    expect(r1.body).toMatchObject({ special: true, credited: false, result: 'paid' });
    const r2 = await call(webhookHandler, { method: 'POST', body: { type: 'payment', data: { id: '777001' } } });
    expect(r2.body.result).toBe('already_processed');
    const st = await call(specialOrderHandler, { method: 'GET', query: { id: orderId } });
    expect(st.body.data).toMatchObject({ paid: true, paymentId: '777001' });
  });

  it('webhook com valor errado não vira pago; pedido inválido é recusado', async () => {
    const created = await call(specialPaymentHandler, { method: 'POST', headers: auth('cli3'), body: { planId: 'tarot-marselha' } });
    const orderId = created.body.orderId;
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'TEST-local-only';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      id: 777002, status: 'approved', currency_id: 'BRL', transaction_amount: 29, external_reference: orderId,
    }), { status: 200 })));
    const r = await call(webhookHandler, { method: 'POST', body: { type: 'payment', data: { id: '777002' } } });
    expect(r.body.result).toBe('amount_mismatch');
    const st = await call(specialOrderHandler, { method: 'GET', query: { id: orderId } });
    expect(st.body.data.paid).toBe(false);
    expect((await call(specialOrderHandler, { method: 'GET', query: { id: '../users' } })).status).toBe(400);
  });
});
