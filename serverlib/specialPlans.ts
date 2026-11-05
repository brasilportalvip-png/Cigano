/**
 * Planos Especiais (serviço de um profissional, fora dos planos de anúncio).
 * Fluxo: a pessoa compra pelo Mercado Pago no site → envia o comprovante no WhatsApp
 * para agendar → o jogo é realizado em até 3 dias.
 * O PREÇO usado na cobrança é sempre este (o servidor não aceita preço vindo do navegador).
 */
export interface SpecialPlan {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  professional: string;
  details: string[];
  price: number;
  priceLabel: string;
  deliveryDays: number;
  whatsapp: string; // só dígitos, com DDI 55
  note: string;
}

export const TAROT_PLAN: SpecialPlan = {
  id: 'tarot-marselha',
  badge: 'Plano Especial',
  title: 'Magia do Tarot: o Reino Encantado das Cartas',
  subtitle: 'Faça um jogo com um profissional',
  professional: 'Jogo com o Cigano',
  details: [
    'Tarot de Marselha completo, com as 78 cartas',
    'Tempo: 1 hora de consulta',
    'Por chamada de vídeo no WhatsApp ou por foto e áudio',
  ],
  price: 290,
  priceLabel: 'Jogo completo',
  deliveryDays: 3,
  whatsapp: '5522998579764',
  note: 'Atendimento individual e com sigilo. Você fala direto com o profissional.',
};

export const SPECIAL_PLANS: Record<string, SpecialPlan> = { [TAROT_PLAN.id]: TAROT_PLAN };

export function getSpecialPlan(id: string): SpecialPlan | null {
  return Object.prototype.hasOwnProperty.call(SPECIAL_PLANS, id) ? SPECIAL_PLANS[id] : null;
}

/** Referência do pedido no Mercado Pago: special|<pedido>|<plano> */
export function specialReference(orderId: string, planId: string): string {
  return `special|${orderId}|${planId}`;
}

export function parseSpecialReference(ref: string): { orderId: string; planId: string } | null {
  const [kind, orderId, planId] = String(ref || '').split('|');
  if (kind !== 'special' || !/^[A-Za-z0-9_-]{6,40}$/.test(orderId || '') || !getSpecialPlan(planId || '')) return null;
  return { orderId, planId };
}

export function formatBRL(v: number): string {
  return v.toFixed(2).replace('.', ',');
}

/** (22) 99857-9764 */
export function formatWhatsapp(digits: string): string {
  const d = digits.replace(/\D/g, '').replace(/^55/, '');
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d;
}

/**
 * Mensagem de agendamento: já vai com os dados do comprovante (pedido e número do
 * pagamento no Mercado Pago) e pede para anexar o print do comprovante.
 */
export function bookingMessage(plan: SpecialPlan, info: { orderId?: string | null; paymentId?: string | null; name?: string | null } = {}): string {
  const lines = [
    `Olá! ${info.name ? `Sou ${info.name}. ` : ''}Comprei pelo site do Reino de Maria Padilha o ${plan.priceLabel} — ${plan.title} (${plan.professional}, Tarot de Marselha 78 cartas, 1 hora) por R$ ${formatBRL(plan.price)}.`,
    'COMPROVANTE DO PAGAMENTO:',
    info.paymentId ? `• Pagamento Mercado Pago nº ${info.paymentId}` : '• Segue o comprovante em anexo',
    info.orderId ? `• Pedido no site: ${info.orderId}` : null,
    '(anexo o print do comprovante nesta conversa)',
    `Quero agendar meu jogo. Prefiro: ( ) chamada de vídeo  ( ) foto e áudio. Sei que é realizado em até ${plan.deliveryDays} dias.`,
  ].filter(Boolean);
  return lines.join('\n');
}

export function whatsappLink(plan: SpecialPlan, message: string): string {
  return `https://wa.me/${plan.whatsapp}?text=${encodeURIComponent(message)}`;
}
