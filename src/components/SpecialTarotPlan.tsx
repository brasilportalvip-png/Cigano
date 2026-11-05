import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { TAROT_PLAN, whatsappLink, formatWhatsapp, formatBRL, bookingMessage, SpecialPlan } from '../../serverlib/specialPlans.js';
import { useApp } from '../contexts/AppContext.js';

/** Símbolo oficial do WhatsApp (SVG, sem depender de imagem externa). */
export function WhatsAppIcon({ size = 22, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

/** Três cartas desenhadas (sem imagem externa). */
function CardsArt() {
  return (
    <svg viewBox="0 0 220 160" className="w-full max-w-[260px] mx-auto" aria-hidden="true">
      <defs>
        <linearGradient id="tg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F5D67A" /><stop offset="1" stopColor="#B8892A" />
        </linearGradient>
      </defs>
      {[[-14, 40, 30], [0, 85, 16], [14, 130, 30]].map(([rot, x, y], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${rot})`}>
          <rect x="-30" y="0" width="60" height="100" rx="7" fill="#12070f" stroke="url(#tg)" strokeWidth="2.5" />
          <rect x="-24" y="6" width="48" height="88" rx="4" fill="none" stroke="#D4AF37" strokeOpacity=".35" />
          <path d="M0 30 l6 13 14 2-10 10 2 14-12-7-12 7 2-14-10-10 14-2z" fill="url(#tg)" opacity={i === 1 ? 1 : 0.75} />
          <circle cx="0" cy="80" r="4" fill="#ff2d7a" opacity=".85" />
        </g>
      ))}
    </svg>
  );
}

const STEPS = (plan: SpecialPlan) => [
  { n: 1, t: 'Contrate o plano', d: 'Entre na sua conta e pague pelo Mercado Pago, igual aos Planos Prata, Ouro e Diamante.' },
  { n: 2, t: 'Envie o comprovante', d: 'Agende pelo WhatsApp já mandando o comprovante.' },
  { n: 3, t: `Jogo em até ${plan.deliveryDays} dias`, d: 'Por chamada de vídeo ou por foto e áudio.' },
];

function WhatsButton({ href, children, testId, variant = 'solid' }: { href: string; children: ReactNode; testId: string; variant?: 'solid' | 'outline' }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-testid={testId}
      className={`inline-flex w-full sm:w-auto items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs sm:text-sm hover:brightness-110 active:scale-95 transition-all ${
        variant === 'solid' ? 'bg-[#25D366] text-[#073e1d] shadow-lg shadow-[#25D366]/25' : 'border-2 border-[#25D366] text-[#25D366]'
      }`}
    >
      <WhatsAppIcon size={20} /> {children}
    </a>
  );
}

/** "Contratar agora": mesmo processo dos Planos Prata/Ouro/Diamante (conta → Mercado Pago). */
function BuyButton({ plan }: { plan: SpecialPlan }) {
  const { user, apiFetch } = useApp();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const go = async () => {
    setError(null);
    if (!user) { navigate('/auth?tab=login'); return; }
    setBusy(true);
    try {
      const res = await apiFetch('/api/special-payment', { method: 'POST', body: JSON.stringify({ planId: plan.id }) });
      const data: any = await res.json().catch(() => ({}));
      if (!res.ok || !data?.init_point) throw new Error(data?.error || 'Não foi possível abrir o pagamento.');
      window.location.href = data.init_point;
    } catch (e: any) {
      setError(e?.message || 'Tente novamente.');
      setBusy(false);
    }
  };
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={go}
        disabled={busy}
        data-testid="special-plan-buy"
        className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-7 py-4 rounded-2xl border border-[#D4AF37]/40 bg-gradient-to-r from-red-800 to-red-700 text-white font-black uppercase tracking-widest text-sm hover:from-red-700 hover:to-red-600 active:scale-95 transition-all disabled:opacity-60"
      >
        {busy ? 'Abrindo Mercado Pago…' : `Contratar agora — R$ ${formatBRL(plan.price)}`}
      </button>
      <p className="text-[11px] text-gray-400">Pagamento seguro pelo Mercado Pago, como nos Planos Prata, Ouro e Diamante.</p>
      {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
    </div>
  );
}

export default function SpecialTarotPlan({ plan = TAROT_PLAN, variant = 'full' }: { plan?: SpecialPlan; variant?: 'full' | 'banner' }) {
  const alreadyPaid = whatsappLink(plan, bookingMessage(plan));

  if (variant === 'banner') {
    return (
      <section className="px-4 md:px-8 pb-14" aria-label={plan.badge} data-testid="special-plan-banner">
        <div className="max-w-6xl mx-auto rounded-[2rem] border border-[#d4af37]/50 p-[1px] bg-gradient-to-br from-[#d4af37]/60 via-transparent to-[#d4af37]/30">
          <div className="grid md:grid-cols-[1fr_auto] items-center gap-6 bg-[#0b0b12] rounded-[2rem] p-6 md:p-9">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] font-black text-[#D4AF37] mb-2">✨ {plan.badge} · {plan.subtitle}</p>
              <h2 className="text-2xl md:text-3xl font-bold font-serif">{plan.title}</h2>
              <p className="text-sm text-gray-300 mt-2">{plan.professional} · Tarot de Marselha (78 cartas) · 1 hora · vídeo no WhatsApp ou foto e áudio</p>
              <p className="text-xs text-gray-400 mt-2">Compre, envie o comprovante no WhatsApp e seu jogo é feito em até {plan.deliveryDays} dias.</p>
              <p className="mt-3"><span className="text-xs text-gray-400 uppercase font-bold tracking-wider">{plan.priceLabel} </span><span className="text-2xl font-black text-white">R$ {formatBRL(plan.price)}</span></p>
            </div>
            <div className="flex flex-col items-stretch sm:items-end gap-3">
              <BuyButton plan={plan} />
              <WhatsButton href={alreadyPaid} testId="special-plan-whatsapp" variant="outline">Já paguei: enviar comprovante</WhatsButton>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-5xl mx-auto mt-16" aria-label={plan.badge} data-testid="special-plan">
      <div className="rounded-[2rem] border border-[#d4af37]/50 p-[1px] bg-gradient-to-br from-[#d4af37]/60 via-transparent to-[#d4af37]/30 shadow-2xl shadow-[#d4af37]/10">
        <div className="grid md:grid-cols-[1.1fr_1fr] gap-8 items-start bg-[#0b0b12] rounded-[2rem] p-7 md:p-10">
          <div>
            <span className="inline-block bg-gradient-to-r from-[#b8892a] via-[#f5d67a] to-[#d4af37] text-black text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg whitespace-nowrap mb-4">
              ✨ Novo {plan.badge}
            </span>
            <p className="text-[10px] uppercase font-black tracking-widest text-red-400 mb-2">{plan.subtitle}</p>
            <h2 className="text-2xl md:text-4xl font-bold font-serif leading-tight">{plan.title}</h2>
            <p className="text-lg text-[#D4AF37] font-bold mt-3">{plan.professional}</p>
            <ul className="space-y-3 mt-5 mb-6">
              {plan.details.map((d) => (
                <li key={d} className="flex items-start gap-2.5 text-sm text-gray-200">
                  <span className="text-[#D4AF37] mt-0.5">✦</span> {d}
                </li>
              ))}
            </ul>
            <div className="mb-5">
              <p className="text-[10px] uppercase font-black tracking-widest text-gray-500">{plan.priceLabel}</p>
              <span className="text-sm font-bold text-gray-400">R$ </span>
              <span className="text-5xl font-black">{formatBRL(plan.price)}</span>
            </div>
            <BuyButton plan={plan} />
            <div className="mt-4 pt-4 border-t border-white/10">
              <WhatsButton href={alreadyPaid} testId="special-plan-whatsapp" variant="outline">Já paguei: enviar comprovante e agendar</WhatsButton>
              <p className="text-xs text-gray-400 mt-2">WhatsApp {formatWhatsapp(plan.whatsapp)} · {plan.note}</p>
            </div>
          </div>
          <div>
            <CardsArt />
            <ol className="mt-6 space-y-3" data-testid="special-plan-steps">
              {STEPS(plan).map((st) => (
                <li key={st.n} className="flex gap-3 items-start bg-white/5 border border-white/10 rounded-2xl p-3.5">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-r from-[#b8892a] via-[#f5d67a] to-[#d4af37] text-black grid place-items-center text-xs font-black">{st.n}</span>
                  <span><strong className="block text-sm text-white">{st.t}</strong><span className="text-xs text-gray-400">{st.d}</span></span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Volta do Mercado Pago (?especial=<pedido>&pagamento=...): mostra a situação do pagamento
 * e o botão para agendar no WhatsApp já com o comprovante.
 */
export function SpecialOrderReturn({ plan = TAROT_PLAN }: { plan?: SpecialPlan }) {
  const [qs] = useState(() => new URLSearchParams(typeof location !== 'undefined' ? location.search : ''));
  const orderId = qs.get('especial');
  const urlPaymentId = qs.get('payment_id') || qs.get('collection_id');
  const urlStatus = qs.get('pagamento');
  const [status, setStatus] = useState<'loading' | 'paid' | 'pending' | 'failed'>(urlStatus === 'falhou' ? 'failed' : 'loading');
  const [paymentId, setPaymentId] = useState<string | null>(urlPaymentId && /^\d{4,30}$/.test(urlPaymentId) ? urlPaymentId : null);
  const [open, setOpen] = useState(!!orderId);

  useEffect(() => {
    if (!orderId || !/^esp_[a-f0-9]{32}$/.test(orderId)) return;
    let stop = false;
    let tries = 0;
    const check = async () => {
      try {
        const resp = await fetch(`/api/special-order?id=${encodeURIComponent(orderId)}`);
        const body: any = await resp.json().catch(() => ({}));
        if (!resp.ok || !body?.data) throw new Error('status');
        const r = body.data as { status: string; paid: boolean; paymentId: string | null };
        if (stop) return;
        if (r.paymentId) setPaymentId(r.paymentId);
        if (r.paid) { setStatus('paid'); return; }
        if (r.status === 'rejected' || urlStatus === 'falhou') { setStatus('failed'); return; }
        setStatus('pending');
      } catch {
        if (!stop) setStatus(urlStatus === 'sucesso' ? 'pending' : urlStatus === 'falhou' ? 'failed' : 'pending');
      }
      // Pix pode levar alguns minutos para confirmar: confere de novo
      if (++tries < 24 && !stop) window.setTimeout(check, 5000);
    };
    void check();
    return () => { stop = true; };
  }, [orderId, urlStatus]);

  if (!orderId || !open) return null;
  const href = whatsappLink(plan, bookingMessage(plan, { orderId, paymentId }));
  const close = () => {
    setOpen(false);
    try { history.replaceState({}, '', location.pathname); } catch { /* ok */ }
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/85 p-4" role="dialog" aria-modal="true" data-testid="special-order-return">
      <div className="w-full max-w-md rounded-[2rem] border border-[#d4af37]/50 p-[1px] bg-gradient-to-br from-[#d4af37]/60 via-transparent to-[#d4af37]/30">
        <div className="bg-[#0b0b12] rounded-[2rem] p-6 sm:p-8 text-center">
          <p className="text-[10px] uppercase tracking-[0.25em] font-black text-[#D4AF37] mb-2">✨ {plan.badge}</p>
          {status === 'paid' && <h2 className="text-2xl font-bold font-serif">Pagamento aprovado! 🎉</h2>}
          {status === 'pending' && <h2 className="text-2xl font-bold font-serif">Pagamento em confirmação</h2>}
          {status === 'loading' && <h2 className="text-2xl font-bold font-serif">Conferindo o pagamento…</h2>}
          {status === 'failed' && <h2 className="text-2xl font-bold font-serif">Pagamento não concluído</h2>}

          {status === 'failed' ? (
            <>
              <p className="text-sm text-gray-300 mt-3">O Mercado Pago não aprovou o pagamento. Você pode tentar de novo com Pix ou outro cartão.</p>
              <div className="mt-6 flex flex-col gap-3 items-center"><BuyButton plan={plan} /></div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-300 mt-3">
                {status === 'pending' ? 'Se pagou com Pix, a confirmação pode levar alguns minutos. ' : ''}
                Agora agende seu jogo enviando o comprovante no WhatsApp:
              </p>
              <ol className="text-left text-sm text-gray-200 mt-4 space-y-2">
                <li><strong className="text-[#D4AF37]">1.</strong> Tire um print do comprovante do Mercado Pago.</li>
                <li><strong className="text-[#D4AF37]">2.</strong> Toque no botão abaixo: a mensagem já vai com o número do pagamento{paymentId ? ` (nº ${paymentId})` : ''} e do pedido.</li>
                <li><strong className="text-[#D4AF37]">3.</strong> Anexe o print na conversa e envie.</li>
              </ol>
              <div className="mt-6"><WhatsButton href={href} testId="special-order-whatsapp">Enviar comprovante e agendar</WhatsButton></div>
              <p className="text-xs text-gray-400 mt-4">Seu jogo é realizado em até <strong className="text-white">{plan.deliveryDays} dias</strong> após o envio do comprovante. WhatsApp {formatWhatsapp(plan.whatsapp)}.</p>
              <p className="text-[10px] text-gray-500 mt-2 font-mono">Pedido {orderId}</p>
            </>
          )}
          <button onClick={close} className="mt-5 text-xs text-gray-400 underline cursor-pointer">Fechar</button>
        </div>
      </div>
    </div>
  );
}
