/**
 * Baralho do Cigano: as 78 cartas com as imagens do dono (arte do Tarô de Thoth) e os NOMES TRADICIONAIS
 * que todo mundo conhece (Paus, Copas, Espadas, Ouros; Valete, Cavaleiro, Rainha, Rei).
 * As traduções vêm do Tarô da Maria Padilha (oráculo tarot-supremo: tradução, significado, luz, sombra,
 * ensinamento, conselho, alerta e o orixá/entidade de cada arcano maior), com o motor de tarô como reserva.
 * O dono pode trocar cada interpretação pela sua (fica no Firestore e tem prioridade). Só do servidor.
 */
import { FULL_DECK, secureShuffle, cutDeck } from '../oraculos/tarotEngine.js';
import { ARCANOS } from '../oraculos/tarot-supremo.js';
import type { CartaCigano } from './metodo.js';

const ROMANOS = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];

const NUMERAIS = ['', 'Ás', 'Dois', 'Três', 'Quatro', 'Cinco', 'Seis', 'Sete', 'Oito', 'Nove', 'Dez'];
const CORTE_SUPREMO: Record<number, string> = { 1: 'as', 11: 'valete', 12: 'cavaleiro', 13: 'rainha', 14: 'rei' };

/** O Louco completo (a carta 0), no estilo das traduções do dono. */
const LOUCO_COMPLETO = {
  traducao:
    'A pessoa está diante de um recomeço de vida: livre, corajosa e pronta para arriscar. É a carta do salto de fé — quem tira O Louco vai viver algo que ainda não conhece, e a espiritualidade abre o caminho para quem confia e não tem medo do novo.',
  significado:
    'O Louco é a carta zero: o começo antes de tudo, quando tudo ainda é possível. Fala de recomeço, viagem, mudança de rumo, ideias que chegam de repente, coragem para arriscar e desapego do que ficou para trás. No amor: relação nova, leve e sem rótulo, ou alguém que foge de compromisso. No trabalho e no dinheiro: mudança de área, projeto novo e risco — cuidado com gastos por impulso. No espiritual: pede movimento, ar livre e cabeça leve.',
  luz: 'liberdade, coragem, recomeço, fé no desconhecido, criatividade, leveza, viagens e oportunidades que chegam de surpresa.',
  sombra: 'imprudência, irresponsabilidade, fuga dos compromissos, instabilidade, ingenuidade e decisões sem pensar nas consequências.',
  ensinamento: 'o zero não é o vazio: é tudo o que ainda pode ser. Quem se apega demais ao que conhece não deixa o novo entrar.',
  conselho: 'dê o primeiro passo com fé, mas olhe onde pisa: confie na intuição, solte o que pesa e aceite o novo.',
  alerta: 'cuidado com a pressa, com promessas sem base e com quem se aproveita da sua boa-fé; não largue tudo sem um plano mínimo.',
};

function chaveSupremo(c: { arcana: string; number: number; suit?: string }): string {
  if (c.arcana === 'major') return `maior_${String(c.number).padStart(2, '0')}`;
  const n = CORTE_SUPREMO[c.number] || String(c.number).padStart(2, '0');
  return `${c.suit}_${n}`;
}

const SUPREMO = new Map<string, any>();
for (const a of ARCANOS as any[]) {
  const id = String(a.id || '');
  const k = id.startsWith('maior_') ? id.slice(0, 8) : id;
  SUPREMO.set(k, a);
}

/** Nomes tradicionais (os que todo mundo conhece), como no Tarô da Maria Padilha. */
const MAIORES_TRADICIONAIS: Record<number, string> = {
  0: 'O Louco', 1: 'O Mago', 2: 'A Papisa', 3: 'A Imperatriz', 4: 'O Imperador', 5: 'O Papa', 6: 'Os Namorados', 7: 'O Carro',
  8: 'A Justiça', 9: 'O Eremita', 10: 'A Roda da Fortuna', 11: 'A Força', 12: 'O Enforcado', 13: 'A Morte', 14: 'A Temperança',
  15: 'O Diabo', 16: 'A Torre', 17: 'A Estrela', 18: 'A Lua', 19: 'O Sol', 20: 'O Julgamento', 21: 'O Mundo',
};
const NAIPE_NOME: Record<string, string> = { paus: 'Paus', ouros: 'Ouros', espadas: 'Espadas', copas: 'Copas' };
const CORTE_NOME: Record<number, string> = { 11: 'Valete', 12: 'Cavaleiro', 13: 'Rainha', 14: 'Rei' };

function nomes(c: { arcana: string; number: number; suit?: string; name: string }): { nome: string } {
  if (c.arcana === 'major') return { nome: MAIORES_TRADICIONAIS[c.number] || c.name };
  const naipe = NAIPE_NOME[String(c.suit)] || String(c.suit);
  if (c.number >= 11) return { nome: `${CORTE_NOME[c.number]} de ${naipe}` };
  return { nome: `${NUMERAIS[c.number]} de ${naipe}` };
}

export const BARALHO_CIGANO: CartaCigano[] = FULL_DECK.map((c) => {
  const s = c.arcana === 'major' && c.number === 0 ? { ...SUPREMO.get('maior_00'), ...LOUCO_COMPLETO } : SUPREMO.get(chaveSupremo(c as any)) || {};
  const n = nomes(c as any);
  return {
    id: c.id,
    numero: c.number,
    nome: n.nome,
    arcano: c.arcana === 'major' ? 'maior' : 'menor',
    naipe: c.suit,
    romano: c.arcana === 'major' ? ROMANOS[c.number] : undefined,
    palavras: c.keywords,
    imagem: `/cartas/${c.id}.webp`,
    entidade: s.entidade || undefined,
    traducao: s.traducao || undefined,
    significado: s.significado || undefined,
    ensinamento: s.ensinamento || undefined,
    alerta: s.alerta || undefined,
    luz: s.luz || c.uprightMeaning,
    sombra: s.sombra || c.reversedMeaning || '',
    conselho: s.conselho || c.spiritualAdvice,
  } as CartaCigano;
});

/** Embaralhamento de verdade (criptográfico) + corte, como na mesa. */
export function embaralharBaralho(): CartaCigano[] {
  return cutDeck(secureShuffle(BARALHO_CIGANO));
}

/** Aplica as interpretações do dono por cima das cartas-base. */
export function comInterpretacoesDoDono(cartas: CartaCigano[], doDono: Record<string, Partial<CartaCigano>>): CartaCigano[] {
  return cartas.map((c) => {
    const o = doDono[c.id];
    if (!o) return c;
    return {
      ...c,
      luz: o.luz?.trim() || c.luz,
      sombra: o.sombra?.trim() || c.sombra,
      conselho: o.conselho?.trim() || c.conselho,
      minhaLeitura: o.minhaLeitura?.trim() || undefined,
    };
  });
}
