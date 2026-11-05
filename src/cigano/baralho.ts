/**
 * Baralho do Cigano: Tarô de Thoth de Aleister Crowley (78 cartas), com as imagens do dono.
 * As traduções vêm do Tarô da Maria Padilha (oráculo tarot-supremo: tradução, significado, luz, sombra,
 * ensinamento, conselho, alerta e o orixá/entidade de cada arcano maior), com o motor de tarô como reserva.
 * O dono pode trocar cada interpretação pela sua (fica no Firestore e tem prioridade). Só do servidor.
 */
import { FULL_DECK, secureShuffle, cutDeck } from '../oraculos/tarotEngine.js';
import { ARCANOS } from '../oraculos/tarot-supremo.js';
import type { CartaCigano } from './metodo.js';

const ROMANOS = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];

/** Arcanos maiores no Tarô de Thoth: [nome no Thoth, nome tradicional quando muda]. */
const MAIORES_THOTH: Record<number, [string, string?]> = {
  0: ['O Louco'],
  1: ['O Mago'],
  2: ['A Sacerdotisa', 'A Papisa'],
  3: ['A Imperatriz'],
  4: ['O Imperador'],
  5: ['O Hierofante', 'O Papa'],
  6: ['Os Namorados'],
  7: ['O Carro'],
  8: ['Ajustamento', 'A Justiça'],
  9: ['O Eremita'],
  10: ['A Fortuna', 'A Roda da Fortuna'],
  11: ['Luxúria', 'A Força'],
  12: ['O Pendurado', 'O Enforcado'],
  13: ['A Morte'],
  14: ['Arte', 'A Temperança'],
  15: ['O Diabo'],
  16: ['A Torre'],
  17: ['A Estrela'],
  18: ['A Lua'],
  19: ['O Sol'],
  20: ['O Aeon', 'O Julgamento'],
  21: ['O Universo', 'O Mundo'],
};

/** Títulos dos arcanos menores no Thoth (2 a 10). */
const TITULOS_THOTH: Record<string, string[]> = {
  paus: ['', '', 'Domínio', 'Virtude', 'Conclusão', 'Disputa', 'Vitória', 'Valor', 'Rapidez', 'Força', 'Opressão'],
  ouros: ['', '', 'Mudança', 'Trabalho', 'Poder', 'Preocupação', 'Sucesso', 'Fracasso', 'Prudência', 'Ganho', 'Riqueza'],
  espadas: ['', '', 'Paz', 'Pesar', 'Trégua', 'Derrota', 'Ciência', 'Futilidade', 'Interferência', 'Crueldade', 'Ruína'],
  copas: ['', '', 'Amor', 'Abundância', 'Luxo', 'Decepção', 'Prazer', 'Devassidão', 'Indolência', 'Felicidade', 'Saciedade'],
};
const NUMERAIS = ['', 'Ás', 'Dois', 'Três', 'Quatro', 'Cinco', 'Seis', 'Sete', 'Oito', 'Nove', 'Dez'];
const NAIPE_THOTH: Record<string, string> = { paus: 'Paus', ouros: 'Discos', espadas: 'Espadas', copas: 'Copas' };
/** Corte do Thoth: 11 Princesa (Valete), 12 Príncipe (Cavaleiro), 13 Rainha, 14 Cavaleiro (Rei). */
const CORTE: Record<number, [string, string]> = { 11: ['Princesa', 'Valete'], 12: ['Príncipe', 'Cavaleiro'], 13: ['Rainha', 'Rainha'], 14: ['Cavaleiro', 'Rei'] };
const CORTE_SUPREMO: Record<number, string> = { 1: 'as', 11: 'valete', 12: 'cavaleiro', 13: 'rainha', 14: 'rei' };

/** O Louco completo (o arcano 0 do Thoth), no estilo das traduções do dono. */
const LOUCO_COMPLETO = {
  traducao:
    'A pessoa está diante de um recomeço de vida: livre, corajosa e pronta para arriscar. É a carta do salto de fé — quem tira O Louco vai viver algo que ainda não conhece, e a espiritualidade abre o caminho para quem confia e não tem medo do novo.',
  significado:
    'No Tarô de Thoth, O Louco é o zero: o espírito antes de tudo começar, o sopro do Ar (a letra Aleph), o potencial puro de onde nascem todas as possibilidades. Crowley o mostra como o Homem Verde da primavera, a loucura sagrada que não segue a lógica do mundo e por isso descobre o caminho novo. Fala de viagem, mudança de rumo, ideias inesperadas, inocência, desapego e coragem de começar do zero. No amor: relação nova, leve e sem rótulo, ou alguém que foge de compromisso. No trabalho e no dinheiro: mudança de área, projeto novo, risco — cuidado com gastos por impulso. No espiritual: pede ar, movimento e cabeça limpa.',
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

function nomes(c: { arcana: string; number: number; suit?: string; name: string }): { nome: string; tradicional?: string } {
  if (c.arcana === 'major') {
    const [thoth, trad] = MAIORES_THOTH[c.number] || [c.name];
    return { nome: thoth, tradicional: trad };
  }
  const suit = String(c.suit);
  const naipe = NAIPE_THOTH[suit] || suit;
  const naipeTrad = suit === 'ouros' ? 'Ouros' : naipe;
  if (c.number >= 11) {
    const [thoth, trad] = CORTE[c.number];
    return { nome: `${thoth} de ${naipe}`, tradicional: thoth === trad && naipe === naipeTrad ? undefined : `${trad} de ${naipeTrad}` };
  }
  if (c.number === 1) return { nome: `Ás de ${naipe}`, tradicional: naipe === naipeTrad ? undefined : `Ás de ${naipeTrad}` };
  const titulo = TITULOS_THOTH[suit]?.[c.number];
  return { nome: titulo ? `${titulo} (${NUMERAIS[c.number]} de ${naipe})` : `${NUMERAIS[c.number]} de ${naipe}`, tradicional: `${NUMERAIS[c.number]} de ${naipeTrad}` };
}

export const BARALHO_CIGANO: CartaCigano[] = FULL_DECK.map((c) => {
  const s = c.arcana === 'major' && c.number === 0 ? { ...SUPREMO.get('maior_00'), ...LOUCO_COMPLETO } : SUPREMO.get(chaveSupremo(c as any)) || {};
  const n = nomes(c as any);
  return {
    id: c.id,
    numero: c.number,
    nome: n.nome,
    tradicional: n.tradicional,
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
