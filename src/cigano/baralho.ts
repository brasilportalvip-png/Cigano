/**
 * Baralho do Cigano: Tarot de Marselha completo (78 cartas), com os nomes da tradição de Marselha.
 * As interpretações-base vêm do baralho que já existia no projeto; o dono pode trocar cada uma pelas suas
 * (ficam salvas no Firestore e têm prioridade). Este arquivo é só do servidor.
 */
import { FULL_DECK, secureShuffle, cutDeck } from '../oraculos/tarotEngine.js';
import type { CartaCigano } from './metodo.js';

const ROMANOS = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];

/** Nomes dos Arcanos Maiores no Tarot de Marselha. */
const NOMES_MARSELHA: Record<number, string> = {
  0: 'O Louco',
  1: 'O Mago',
  2: 'A Papisa',
  3: 'A Imperatriz',
  4: 'O Imperador',
  5: 'O Papa',
  6: 'O Enamorado',
  7: 'O Carro',
  8: 'A Justiça',
  9: 'O Eremita',
  10: 'A Roda da Fortuna',
  11: 'A Força',
  12: 'O Enforcado',
  13: 'A Morte (Arcano sem nome)',
  14: 'A Temperança',
  15: 'O Diabo',
  16: 'A Torre (Casa de Deus)',
  17: 'A Estrela',
  18: 'A Lua',
  19: 'O Sol',
  20: 'O Julgamento',
  21: 'O Mundo',
};

export const BARALHO_MARSELHA: CartaCigano[] = FULL_DECK.map((c) => ({
  id: c.id,
  numero: c.number,
  nome: c.arcana === 'major' ? (NOMES_MARSELHA[c.number] || c.name) : c.name.replace(/^Pajem/, 'Valete'),
  arcano: c.arcana === 'major' ? 'maior' : 'menor',
  naipe: c.suit,
  romano: c.arcana === 'major' ? ROMANOS[c.number] : undefined,
  palavras: c.keywords,
  luz: c.uprightMeaning,
  sombra: c.reversedMeaning || '',
  conselho: c.spiritualAdvice,
}));

/** Embaralhamento de verdade (criptográfico) + corte, como na mesa. */
export function embaralharMarselha(): CartaCigano[] {
  return cutDeck(secureShuffle(BARALHO_MARSELHA));
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
